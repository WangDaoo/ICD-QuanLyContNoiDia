import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request, { Response } from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { assertE2EDatabase } from './helpers/assert-e2e-database';
import { createCoreScenario } from './helpers/core-lifecycle-fixture';

config({ path: path.resolve(__dirname, '../../../.env') });

type AuthResult = {
  accessToken: string;
};

type EntityWithId = {
  id: string;
};

type GatePassResult = {
  id: string;
  qrToken: string;
  status?: string;
};

function unwrap<T>(body: unknown): T {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

function expectRejected(
  response: Response,
  expectedStatuses: number[],
  step: string,
): void {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `Expected ${step} to fail with HTTP [${expectedStatuses.join(', ')}], but got HTTP ${response.status}\n${JSON.stringify(response.body, null, 2)}`,
    );
  }
}

describe('Core Lifecycle Failures & Concurrency E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@icd.local';
  const adminPassword =
    process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ICD2026!StrongPass';

  const auth = (req: request.Test): request.Test =>
    req.set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    if (!adminEmail || !adminPassword) {
      throw new Error('Missing E2E bootstrap admin credentials.');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await assertE2EDatabase(prisma);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(200);

    accessToken = (loginResponse.body as AuthResult).accessToken;
    expect(accessToken).toEqual(expect.any(String));
  });

  afterAll(async () => {
    await app.close();
  });

  //
  // 1. REJECT DUPLICATE GATE-IN
  //
  it(
    'rejects duplicate gate-in on already received container visit',
    async () => {
      const scenario = await createCoreScenario(app, accessToken, 'GATE_IN');

      const duplicateResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario.containerVisitId}/gate-in`,
        ),
      ).send({
        truckVisitId: scenario.truckVisitId,
        actualSeal: 'SEAL-DUP',
        actualWeight: 12000,
        conditionCode: 'GOOD',
        conditionNotes: 'Duplicate gate in test',
      });

      expectRejected(duplicateResponse, [400, 409], 'Duplicate gate-in');

      // Database Invariant: only one ContainerReception exists
      const receptions = await prisma.containerReception.findMany({
        where: { containerVisitId: scenario.containerVisitId },
      });
      expect(receptions.length).toBe(1);
    },
    60_000,
  );

  //
  // 2. REJECT OCCUPIED YARD SLOT
  //
  it(
    'rejects assigning an occupied yard slot to another container',
    async () => {
      // Container 1 occupies yardSlotId
      const scenario1 = await createCoreScenario(app, accessToken, 'YARD');
      const occupiedSlotId = scenario1.yardSlotId;
      expect(occupiedSlotId).toBeDefined();

      // Container 2 is gated-in and ready for yard assignment
      const scenario2 = await createCoreScenario(app, accessToken, 'GATE_IN');

      const assignResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario2.containerVisitId}/yard/assign`,
        ),
      ).send({
        yardSlotId: occupiedSlotId,
        source: 'MANUAL',
      });

      expectRejected(
        assignResponse,
        [400, 409, 422],
        'Assign occupied yard slot',
      );

      // Database Invariant: slot still belongs to Container 1
      const activeLocation = await prisma.containerLocationLog.findFirst({
        where: {
          yardSlotId: occupiedSlotId,
          endedAt: null,
        },
      });
      expect(activeLocation?.containerVisitId).toBe(scenario1.containerVisitId);
    },
    90_000,
  );

  //
  // 3. BLOCK GATE PASS WHEN BILLING IS INCOMPLETE
  //
  it(
    'blocks gate-pass issuance when billing is unpaid',
    async () => {
      // Container is invoiced but NOT paid
      const scenario = await createCoreScenario(app, accessToken, 'INVOICED');

      // Check readiness
      const readinessResponse = await auth(
        request(app.getHttpServer()).get(
          `/api/containers/${scenario.containerVisitId}/gate-pass/readiness`,
        ),
      );
      expect(readinessResponse.status).toBe(200);
      const readiness = unwrap<{ ready: boolean; blockers: string[] }>(
        readinessResponse.body,
      );
      expect(readiness.ready).toBe(false);
      expect(readiness.blockers).toContain('BILLING_INCOMPLETE');

      // Attempt issuing Gate Pass
      const issueResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario.containerVisitId}/gate-pass`,
        ),
      ).send({
        ttlHours: 24,
        vehiclePlate: '29E2E99999',
        receiverName: 'E2E Receiver',
        receiverIdNumber: 'ID99999',
        note: 'Should fail due to unpaid billing',
      });

      expectRejected(
        issueResponse,
        [400, 422],
        'Issue gate-pass with unpaid invoice',
      );
    },
    60_000,
  );

  //
  // 4. BLOCK GATE PASS ON OPERATIONAL HOLD & SUCCEED AFTER RELEASE
  //
  it(
    'blocks gate-pass issuance while operational hold is active, then succeeds after release',
    async () => {
      // Container is paid and ready for Gate Pass
      const scenario = await createCoreScenario(app, accessToken, 'PAID');

      // Place an operational hold
      const holdResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario.containerVisitId}/operational-holds`,
        ),
      ).send({
        holdType: 'CUSTOMS',
        reason: 'E2E Customs inspection hold',
      });
      expect(holdResponse.status).toBe(201);
      const hold = unwrap<EntityWithId>(holdResponse.body);

      // Verify Gate Pass is blocked
      const readinessBlocked = await auth(
        request(app.getHttpServer()).get(
          `/api/containers/${scenario.containerVisitId}/gate-pass/readiness`,
        ),
      );
      expect(readinessBlocked.status).toBe(200);
      const blockedData = unwrap<{ ready: boolean; blockers: string[] }>(
        readinessBlocked.body,
      );
      expect(blockedData.ready).toBe(false);
      expect(blockedData.blockers).toContain('OPERATIONAL_HOLD');

      const blockedIssueResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario.containerVisitId}/gate-pass`,
        ),
      ).send({
        ttlHours: 24,
        vehiclePlate: '29E2E88888',
        receiverName: 'E2E Receiver',
        receiverIdNumber: 'ID88888',
        note: 'Should fail due to operational hold',
      });
      expectRejected(
        blockedIssueResponse,
        [400, 422],
        'Issue gate-pass with active hold',
      );

      // Release the hold
      const releaseResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/operational-holds/${hold.id}/release`,
        ),
      ).send({
        releaseReason: 'Customs inspection cleared successfully',
      });
      expect(releaseResponse.status).toBe(201);

      // Now Gate Pass issuance should succeed
      const allowedIssueResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario.containerVisitId}/gate-pass`,
        ),
      ).send({
        ttlHours: 24,
        vehiclePlate: '29E2E88888',
        receiverName: 'E2E Receiver',
        receiverIdNumber: 'ID88888',
        note: 'Should succeed after hold release',
      });
      expect(allowedIssueResponse.status).toBe(201);
      const gatePass = unwrap<GatePassResult>(allowedIssueResponse.body);
      expect(gatePass.id).toBeDefined();
      expect(gatePass.qrToken).toBeDefined();
    },
    90_000,
  );

  //
  // 5. BLOCK GATE PASS ON INSPECTION HOLD
  //
  it(
    'blocks gate-pass issuance when container inspection completes with HOLD',
    async () => {
      // Scenario at PAID stage (ready for Gate Pass under normal circumstances)
      const scenario = await createCoreScenario(app, accessToken, 'PAID');

      // 1. Request inspection
      const reqInspectionRes = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario.containerVisitId}/yard/inspections`,
        ),
      ).send({
        inspectionType: 'CUSTOMS',
        notes: 'E2E Customs inspection hold test',
      });
      expect(reqInspectionRes.status).toBe(201);
      const inspectionId = unwrap<EntityWithId>(reqInspectionRes.body).id;
      expect(inspectionId).toBeDefined();

      // 2. Start inspection
      const startInspectionRes = await auth(
        request(app.getHttpServer()).post(
          `/api/yard/inspections/${inspectionId}/start`,
        ),
      ).send();
      expect(startInspectionRes.status).toBe(201);

      // 3. Complete inspection with HOLD
      const completeInspectionRes = await auth(
        request(app.getHttpServer()).post(
          `/api/yard/inspections/${inspectionId}/complete`,
        ),
      ).send({
        result: 'HOLD',
        notes: 'Inspection failed criteria - hold container',
      });
      expect(completeInspectionRes.status).toBe(201);

      // 4. Verify gate-pass readiness evaluates to NOT ready with INSPECTION_HOLD blocker
      const readinessRes = await auth(
        request(app.getHttpServer()).get(
          `/api/containers/${scenario.containerVisitId}/gate-pass/readiness`,
        ),
      ).expect(200);

      const readinessData = unwrap<{
        ready: boolean;
        blockers: string[];
        details: { inspectionHoldCount: number };
      }>(readinessRes.body);

      expect(readinessData.ready).toBe(false);
      expect(readinessData.blockers).toContain('INSPECTION_HOLD');
      expect(readinessData.details.inspectionHoldCount).toBeGreaterThanOrEqual(1);

      // 5. Attempt issuing Gate Pass - MUST be rejected
      const issueResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${scenario.containerVisitId}/gate-pass`,
        ),
      ).send({
        ttlHours: 24,
        vehiclePlate: '29E2E77777',
        receiverName: 'E2E Receiver',
        receiverIdNumber: 'ID77777',
        note: 'Should fail due to active inspection hold',
      });

      expectRejected(
        issueResponse,
        [400, 409, 422],
        'Issue gate pass during INSPECTION_HOLD',
      );

      // 6. Database Invariants:
      // - Inspection is COMPLETED with result HOLD
      const dbInspection = await prisma.containerInspection.findUnique({
        where: { id: inspectionId },
      });
      expect(dbInspection?.status).toBe('COMPLETED');
      expect(dbInspection?.result).toBe('HOLD');

      // - No Gate Pass exists for this container
      const gatePassCount = await prisma.gatePass.count({
        where: { containerVisitId: scenario.containerVisitId },
      });
      expect(gatePassCount).toBe(0);
    },
    60_000,
  );

  //
  // 6. REJECT TAMPERED QR TOKEN
  //
  it(
    'rejects tampered QR token during scan and gate-out',
    async () => {
      const scenario = await createCoreScenario(app, accessToken, 'GATE_PASS');
      const validQr = scenario.qrToken!;

      // Create tampered QR by corrupting characters
      const tamperedQr = validQr.slice(0, -6) + 'XXXXXX';

      const scanResponse = await auth(
        request(app.getHttpServer()).post('/api/gate-pass/scan'),
      ).send({
        qrToken: tamperedQr,
      });
      expectRejected(
        scanResponse,
        [400, 401, 404, 422],
        'Scan tampered QR token',
      );

      const gateOutResponse = await auth(
        request(app.getHttpServer()).post('/api/gate-out'),
      ).send({
        visitId: scenario.containerVisitId,
        qrToken: tamperedQr,
      });
      expectRejected(
        gateOutResponse,
        [400, 401, 404, 422],
        'Gate out with tampered QR token',
      );
    },
    60_000,
  );

  //
  // 7. REJECT SECOND GATE-OUT WITH USED GATE PASS
  //
  it(
    'rejects second gate-out attempt with already used gate pass',
    async () => {
      const scenario = await createCoreScenario(app, accessToken, 'GATE_PASS');

      // First Gate-Out succeeds
      const gateOut1 = await auth(
        request(app.getHttpServer()).post('/api/gate-out'),
      ).send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      });
      expect(gateOut1.status).toBe(201);

      // Second Gate-Out must fail
      const gateOut2 = await auth(
        request(app.getHttpServer()).post('/api/gate-out'),
      ).send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      });
      expectRejected(
        gateOut2,
        [400, 409, 422],
        'Second gate-out with used pass',
      );

      // Invariants check
      const visit = await prisma.containerVisit.findUnique({
        where: { id: scenario.containerVisitId },
      });
      expect(visit?.status).toBe('EXITED');

      const pass = await prisma.gatePass.findUnique({
        where: { id: scenario.gatePassId },
      });
      expect(pass?.status).toBe('USED');
    },
    60_000,
  );

  //
  // 8. CONCURRENCY: RACE-CONDITION HANDLING FOR GATE-OUT
  //
  it(
    'handles concurrent gate-out requests safely with exactly 1 success',
    async () => {
      const scenario = await createCoreScenario(app, accessToken, 'GATE_PASS');

      // Fire 2 simultaneous gate-out requests
      const [resA, resB] = await Promise.all([
        auth(request(app.getHttpServer()).post('/api/gate-out')).send({
          visitId: scenario.containerVisitId,
          qrToken: scenario.qrToken,
        }),
        auth(request(app.getHttpServer()).post('/api/gate-out')).send({
          visitId: scenario.containerVisitId,
          qrToken: scenario.qrToken,
        }),
      ]);

      const statuses = [resA.status, resB.status];
      const successCount = statuses.filter((s) => s >= 200 && s < 300).length;
      const failureCount = statuses.filter((s) => s >= 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify DB state consistency
      const visit = await prisma.containerVisit.findUnique({
        where: { id: scenario.containerVisitId },
      });
      expect(visit?.status).toBe('EXITED');

      const pass = await prisma.gatePass.findUnique({
        where: { id: scenario.gatePassId },
      });
      expect(pass?.status).toBe('USED');
    },
    60_000,
  );
});

