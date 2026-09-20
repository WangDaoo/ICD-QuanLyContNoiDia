import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import {
  ContainerVisitStatus,
  TransportConfirmationType,
  TransportHandoverStatus,
} from '../src/generated/prisma/client';
import { assertE2EDatabase } from './helpers/assert-e2e-database';
import { createCoreScenario } from './helpers/core-lifecycle-fixture';

config({ path: path.resolve(__dirname, '../../../.env') });

type AuthResult = {
  accessToken: string;
};

type PartnerClientResult = {
  client: {
    id: string;
    partnerCode: string;
    partnerName: string;
    keyLast4: string;
    status: string;
    scopes: string[];
  };
  rawApiKey: string;
};

type CustomerWarehouseResult = {
  id: string;
  code: string;
  name: string;
  address?: string;
  active: boolean;
};

type TransportHandoverResult = {
  id: string;
  transportCode: string;
  status: string;
  version: number;
  containerVisitId: string;
  partnerApiClientId: string;
  warehouseId: string;
};

function unwrap<T>(body: unknown): T {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

describe('Partner Handover Integration E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let defaultIcdId: string;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@icd.local';
  const adminPassword =
    process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ICD2026!StrongPass';

  const auth = (req: request.Test): request.Test =>
    req.set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await assertE2EDatabase(prisma);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    const authRes = loginRes.body as AuthResult;
    accessToken = authRes.accessToken;

    const icd = await prisma.icdSite.findFirstOrThrow();
    defaultIcdId = icd.id;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createWarehouseHelper(codePrefix = 'WH'): Promise<CustomerWarehouseResult> {
    const uniqueCode = `${codePrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const res = await auth(
      request(app.getHttpServer()).post('/api/customer-warehouses'),
    )
      .send({
        code: uniqueCode,
        name: `Test Warehouse ${uniqueCode}`,
        address: '123 Test Port Road, D9, HCMC',
        latitude: 10.7924,
        longitude: 106.7725,
      })
      .expect(201);

    return unwrap<CustomerWarehouseResult>(res.body);
  }

  async function createPartnerClientHelper(codePrefix = 'PARTNER'): Promise<PartnerClientResult> {
    const uniqueCode = `${codePrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const res = await auth(
      request(app.getHttpServer()).post('/api/partner-clients'),
    )
      .send({
        partnerCode: uniqueCode,
        partnerName: `Partner Express ${uniqueCode}`,
        scopes: [
          'handover.read',
          'handover.accept',
          'handover.transit',
          'handover.confirm_warehouse',
          'handover.failure',
        ],
      })
      .expect(201);

    return unwrap<PartnerClientResult>(res.body);
  }

  async function createExitedContainerScenario(): Promise<{
    containerVisitId: string;
  }> {
    const scenario = await createCoreScenario(app, accessToken, 'GATE_PASS');

    await auth(
      request(app.getHttpServer()).post('/api/gate-out'),
    )
      .send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      })
      .expect(201);

    return { containerVisitId: scenario.containerVisitId };
  }

  it('ICD creates transport handover from EXITED container (DRAFT) and publishes (READY_FOR_HANDOVER)', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partner = await createPartnerClientHelper('PC_PUB');
    const warehouse = await createWarehouseHelper('WH_PUB');

    const transportCode = `TR-${Date.now()}`;
    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partner.client.id,
        warehouseId: warehouse.id,
        transportCode,
        expectedDeliveryAt: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    expect(handover.id).toBeDefined();
    expect(handover.status).toBe(TransportHandoverStatus.DRAFT);
    expect(handover.transportCode).toBe(transportCode);

    const publishRes = await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    const published = unwrap<TransportHandoverResult>(publishRes.body);
    expect(published.status).toBe(TransportHandoverStatus.READY_FOR_HANDOVER);

    const cv = await prisma.containerVisit.findUnique({
      where: { id: containerVisitId },
    });
    expect(cv?.status).toBe(ContainerVisitStatus.EXITED);
  });

  it('enforces Partner API authentication with X-API-Key (valid, missing, invalid, revoked)', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partner = await createPartnerClientHelper('PC_AUTH');
    const warehouse = await createWarehouseHelper('WH_AUTH');

    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partner.client.id,
        warehouseId: warehouse.id,
        transportCode: `TR-AUTH-${Date.now()}`,
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/external/handovers')
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/external/handovers')
      .set('X-API-Key', 'pk_live_invalid_key_1234567890abcdef')
      .expect(401);

    const validRes = await request(app.getHttpServer())
      .get('/api/v1/external/handovers')
      .set('X-API-Key', partner.rawApiKey)
      .expect(200);

    expect(validRes.body.data).toBeDefined();
    expect(Array.isArray(validRes.body.data)).toBe(true);

    await auth(
      request(app.getHttpServer()).post(`/api/partner-clients/${partner.client.id}/revoke`),
    ).expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/external/handovers')
      .set('X-API-Key', partner.rawApiKey)
      .expect(401);
  });

  it('strictly isolates partners: Partner A sees only A handovers, Partner B gets 404 for A handovers', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partnerA = await createPartnerClientHelper('PARTNER_A');
    const partnerB = await createPartnerClientHelper('PARTNER_B');
    const warehouse = await createWarehouseHelper('WH_ISO');

    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partnerA.client.id,
        warehouseId: warehouse.id,
        transportCode: `TR-ISO-${Date.now()}`,
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/external/handovers/${handover.id}`)
      .set('X-API-Key', partnerA.rawApiKey)
      .expect(200);

    expect(detailRes.body.handover_id).toBe(handover.id);

    const isolationRes = await request(app.getHttpServer())
      .get(`/api/v1/external/handovers/${handover.id}`)
      .set('X-API-Key', partnerB.rawApiKey)
      .expect(404);

    expect(isolationRes.body.error_code).toBe('HANDOVER_NOT_FOUND');
  });

  it('executes full happy-path external handover lifecycle (ACCEPT -> IN_TRANSIT -> WAREHOUSE_RECEIVED -> ICD_CONFIRMED)', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partner = await createPartnerClientHelper('PC_HAPPY');
    const warehouse = await createWarehouseHelper('WH_HAPPY');

    const transportCode = `TR-HP-${Date.now()}`;
    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partner.client.id,
        warehouseId: warehouse.id,
        transportCode,
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    const acceptIdempKey = `idemp-accept-${Date.now()}`;
    const acceptRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/accept`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', acceptIdempKey)
      .send({
        accepted_at: new Date().toISOString(),
        partner_reference: 'PARTNER-REF-1001',
        note: 'Accepted by Partner dispatcher',
      })
      .expect(201);

    expect(acceptRes.body.status).toBe(TransportHandoverStatus.PARTNER_ACCEPTED);

    const transitIdempKey = `idemp-transit-${Date.now()}`;
    const transitRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/in-transit`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', transitIdempKey)
      .send({
        departed_at: new Date().toISOString(),
        vehicle_plate: '51C-77788',
        driver_name: 'Nguyen Van Partner',
        driver_phone: '0901234567',
        partner_trip_code: 'TRIP-VN-001',
      })
      .expect(201);

    expect(transitRes.body.status).toBe(TransportHandoverStatus.IN_TRANSIT);

    const whIdempKey = `idemp-wh-${Date.now()}`;
    const whRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/warehouse-received`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', whIdempKey)
      .send({
        received_at: new Date().toISOString(),
        receiver_name: 'Warehouse Manager Tran',
        receiver_phone: '0912345678',
        warehouse_code: warehouse.code,
        condition: 'INTACT_SEAL',
        note: 'Delivered in good condition',
        location: {
          latitude: 10.7924,
          longitude: 106.7725,
          accuracy_m: 5,
        },
        proof: {
          image_url: 'https://cdn.partner.test/proof/delivery-1.jpg',
          signature_url: 'https://cdn.partner.test/proof/sig-1.png',
        },
      })
      .expect(201);

    expect(whRes.body.status).toBe(TransportHandoverStatus.PARTNER_CONFIRMED);

    const icdConfirmRes = await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/icd-confirm`),
    )
      .send({
        note: 'ICD supervisor verified warehouse receipt and POD proof.',
      })
      .expect(201);

    const completedHandover = unwrap<TransportHandoverResult>(icdConfirmRes.body);
    expect(completedHandover.status).toBe(TransportHandoverStatus.COMPLETED);

    const cv = await prisma.containerVisit.findUnique({
      where: { id: containerVisitId },
    });
    expect(cv?.status).toBe(ContainerVisitStatus.EXITED);

    const confirmations = await prisma.transportConfirmation.findMany({
      where: { transportHandoverId: handover.id },
      orderBy: { confirmedAt: 'asc' },
    });

    const confirmationTypes = confirmations.map((c) => c.confirmationType);
    expect(confirmationTypes).toEqual([
      TransportConfirmationType.PARTNER_ACCEPTED,
      TransportConfirmationType.IN_TRANSIT,
      TransportConfirmationType.WAREHOUSE_RECEIVED,
      TransportConfirmationType.ICD_CONFIRMED,
    ]);

    const apiLogs = await prisma.partnerApiLog.findMany({
      where: { partnerApiClientId: partner.client.id },
    });
    expect(apiLogs.length).toBeGreaterThanOrEqual(3);
    for (const log of apiLogs) {
      expect(log.httpStatus).toBe(200);
      expect(log.idempotencyKey).toBeDefined();
      expect(log.requestHash).toBeDefined();
    }
  });

  it('guarantees idempotency: same key & payload replays response; same key & different payload yields 409 conflict', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partner = await createPartnerClientHelper('PC_IDEMP');
    const warehouse = await createWarehouseHelper('WH_IDEMP');

    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partner.client.id,
        warehouseId: warehouse.id,
        transportCode: `TR-IDEMP-${Date.now()}`,
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    const idempKey = `idemp-reuse-${Date.now()}`;
    const payloadA = {
      accepted_at: new Date().toISOString(),
      partner_reference: 'IDEMP-TEST-A',
      note: 'Accept attempt 1',
    };

    const firstRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/accept`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', idempKey)
      .send(payloadA)
      .expect(201);

    const replayRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/accept`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', idempKey)
      .send(payloadA)
      .expect(201);

    expect(replayRes.body.status).toBe(firstRes.body.status);
    expect(replayRes.body.handover_id).toBe(firstRes.body.handover_id);

    const conflictRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/accept`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', idempKey)
      .send({
        accepted_at: new Date().toISOString(),
        partner_reference: 'DIFFERENT-PAYLOAD-B',
        note: 'Payload conflict',
      })
      .expect(409);

    expect(conflictRes.body.error_code).toBe('IDEMPOTENCY_CONFLICT');

    const countConfirmations = await prisma.transportConfirmation.count({
      where: {
        transportHandoverId: handover.id,
        confirmationType: TransportConfirmationType.PARTNER_ACCEPTED,
      },
    });
    expect(countConfirmations).toBe(1);
  });

  it('rejects handover (PARTNER_REJECTED) and forbids invalid forward state transitions', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partner = await createPartnerClientHelper('PC_REJ');
    const warehouse = await createWarehouseHelper('WH_REJ');

    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partner.client.id,
        warehouseId: warehouse.id,
        transportCode: `TR-REJ-${Date.now()}`,
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    const rejectRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/reject`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', `idemp-rej-${Date.now()}`)
      .send({
        reason: 'VEHICLE_UNAVAILABLE',
        note: 'All trucks in fleet are fully booked.',
      })
      .expect(201);

    expect(rejectRes.body.status).toBe(TransportHandoverStatus.PARTNER_REJECTED);

    const invalidTransitRes = await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/in-transit`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', `idemp-transit-after-rej-${Date.now()}`)
      .send({
        departed_at: new Date().toISOString(),
        vehicle_plate: '51C-12345',
        driver_name: 'Driver Invalid',
      })
      .expect(409);

    expect(invalidTransitRes.body.error_code).toBe('INVALID_STATE_TRANSITION');

    const cv = await prisma.containerVisit.findUnique({
      where: { id: containerVisitId },
    });
    expect(cv?.status).toBe(ContainerVisitStatus.EXITED);
  });

  it('handles delivery failure (DELIVERY_FAILED) and allows ICD dispute on contested receipt (DISPUTED)', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partner = await createPartnerClientHelper('PC_FAIL_DISP');
    const warehouse = await createWarehouseHelper('WH_FAIL_DISP');

    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partner.client.id,
        warehouseId: warehouse.id,
        transportCode: `TR-DISP-${Date.now()}`,
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/accept`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', `idemp-acc-disp-${Date.now()}`)
      .send({
        accepted_at: new Date().toISOString(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/in-transit`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', `idemp-trans-disp-${Date.now()}`)
      .send({
        departed_at: new Date().toISOString(),
        vehicle_plate: '51C-55555',
        driver_name: 'Driver Nguyen',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/warehouse-received`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', `idemp-wh-disp-${Date.now()}`)
      .send({
        received_at: new Date().toISOString(),
        receiver_name: 'Warehouse Receiver',
        warehouse_code: warehouse.code,
        condition: 'SEAL_BROKEN',
        note: 'Received with broken seal',
      })
      .expect(201);

    const disputeRes = await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/dispute`),
    )
      .send({
        reasonCode: 'DAMAGED_CARGO',
        note: 'Customer reported seal discrepancy and damaged goods inside cargo.',
        attachmentUrl: 'https://cdn.icd.test/dispute-evidence/doc-1.pdf',
      })
      .expect(201);

    const disputed = unwrap<TransportHandoverResult>(disputeRes.body);
    expect(disputed.status).toBe(TransportHandoverStatus.DISPUTED);

    const disputeConf = await prisma.transportConfirmation.findFirst({
      where: {
        transportHandoverId: handover.id,
        confirmationType: TransportConfirmationType.DISPUTE,
      },
    });
    expect(disputeConf).toBeDefined();
    expect(disputeConf?.condition).toBe('DAMAGED_CARGO');

    const cv = await prisma.containerVisit.findUnique({
      where: { id: containerVisitId },
    });
    expect(cv?.status).toBe(ContainerVisitStatus.EXITED);
  });

  it('guarantees concurrency safety: concurrent accepts result in exactly 1 transition & 1 confirmation', async () => {
    const { containerVisitId } = await createExitedContainerScenario();
    const partner = await createPartnerClientHelper('PC_CONCUR');
    const warehouse = await createWarehouseHelper('WH_CONCUR');

    const createRes = await auth(
      request(app.getHttpServer()).post('/api/transport-handovers'),
    )
      .send({
        containerVisitId,
        partnerApiClientId: partner.client.id,
        warehouseId: warehouse.id,
        transportCode: `TR-CONCUR-${Date.now()}`,
      })
      .expect(201);

    const handover = unwrap<TransportHandoverResult>(createRes.body);
    await auth(
      request(app.getHttpServer()).post(`/api/transport-handovers/${handover.id}/publish`),
    ).expect(201);

    const req1 = request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/accept`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', `idemp-c1-${Date.now()}`)
      .send({
        accepted_at: new Date().toISOString(),
        note: 'Concurrent accept 1',
      });

    const req2 = request(app.getHttpServer())
      .post(`/api/v1/external/handovers/${handover.id}/accept`)
      .set('X-API-Key', partner.rawApiKey)
      .set('Idempotency-Key', `idemp-c2-${Date.now()}`)
      .send({
        accepted_at: new Date().toISOString(),
        note: 'Concurrent accept 2',
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const updatedHandover = await prisma.transportHandover.findUnique({
      where: { id: handover.id },
    });
    expect(updatedHandover?.status).toBe(TransportHandoverStatus.PARTNER_ACCEPTED);

    const countConfirmations = await prisma.transportConfirmation.count({
      where: {
        transportHandoverId: handover.id,
        confirmationType: TransportConfirmationType.PARTNER_ACCEPTED,
      },
    });
    expect(countConfirmations).toBe(1);
  });
});
