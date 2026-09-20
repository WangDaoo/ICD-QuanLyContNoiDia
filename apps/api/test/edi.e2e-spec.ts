import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { assertE2EDatabase } from './helpers/assert-e2e-database';
import { createCoreScenario } from './helpers/core-lifecycle-fixture';

config({ path: path.resolve(__dirname, '../../../.env') });

type AuthResult = {
  accessToken: string;
};

type EdiOutboxItem = {
  id: string;
  status: string;
  messageType: string;
  idempotencyKey: string;
  sentAt?: string | null;
  externalReference?: string | null;
  shippingLineId: string;
};

type EdiAckItem = {
  id: string;
  status: string;
  ackType: string;
  outboxMessageId?: string | null;
  dedupeKey: string;
};

type EdiAlertItem = {
  id: string;
  alertType: string;
  severity: string;
  status: string;
  sourceId: string;
};

function unwrap<T>(body: unknown): T {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

describe('EDI Integration E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let defaultIcdId: string;
  let shippingLineId: string;

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

    const icd = await prisma.icdSite.findFirstOrThrow();
    defaultIcdId = icd.id;

    const shippingLine = await prisma.shippingLine.findFirstOrThrow();
    shippingLineId = shippingLine.id;

    // Ensure an enabled EDI route exists for default shipping line with MOCK transport
    await prisma.ediRoute.upsert({
      where: {
        icdId_shippingLineId: {
          icdId: defaultIcdId,
          shippingLineId: shippingLine.id,
        },
      },
      update: {
        enabled: true,
        transport: 'MOCK',
        outboundFormat: 'CODECO_CANONICAL_JSON_V1',
        partnerTarget: 'mock://edi.shippingline.test',
      },
      create: {
        icdId: defaultIcdId,
        shippingLineId: shippingLine.id,
        enabled: true,
        transport: 'MOCK',
        outboundFormat: 'CODECO_CANONICAL_JSON_V1',
        partnerTarget: 'mock://edi.shippingline.test',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  //
  // 1. GATE-OUT CREATES EDI OUTBOX
  //
  it(
    'creates CODECO_GATE_OUT message in EDI outbox upon container gate-out',
    async () => {
      const scenario = await createCoreScenario(app, accessToken, 'GATE_PASS');

      // Perform Gate-Out
      const gateOutRes = await auth(
        request(app.getHttpServer()).post('/api/gate-out'),
      ).send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      });
      expect(gateOutRes.status).toBe(201);

      // Verify outbox message exists with PENDING status
      const outboxListRes = await auth(
        request(app.getHttpServer()).get('/api/edi/outbox'),
      ).query({
        containerVisitId: scenario.containerVisitId,
        messageType: 'CODECO_GATE_OUT',
      });
      expect(outboxListRes.status).toBe(200);

      const outboxData = unwrap<{ total: number; items: EdiOutboxItem[] }>(
        outboxListRes.body,
      );
      expect(outboxData.total).toBeGreaterThanOrEqual(1);

      const outboxMsg = outboxData.items[0]!;
      expect(outboxMsg).toBeDefined();
      expect(outboxMsg.status).toBe('PENDING');
      expect(outboxMsg.messageType).toBe('CODECO_GATE_OUT');
      expect(outboxMsg.idempotencyKey).toBe(
        `CODECO_GATE_OUT:${scenario.containerVisitId}`,
      );
    },
    60_000,
  );

  //
  // 2. DISPATCH TRANSITIONS STATUS FROM PENDING TO SENT
  //
  it(
    'dispatches pending EDI messages and updates status to SENT with external reference',
    async () => {
      // Trigger dispatch
      const dispatchRes = await auth(
        request(app.getHttpServer()).post('/api/edi/dispatch'),
      );
      expect(dispatchRes.status).toBe(201);
      const result = unwrap<{ processed: number; sent: number; failed: number }>(
        dispatchRes.body,
      );
      expect(result.processed).toBeGreaterThanOrEqual(1);
      expect(result.sent).toBeGreaterThanOrEqual(1);

      // Check all recent messages are SENT
      const outboxListRes = await auth(
        request(app.getHttpServer()).get('/api/edi/outbox'),
      ).query({
        status: 'SENT',
      });
      expect(outboxListRes.status).toBe(200);

      const outboxData = unwrap<{ total: number; items: EdiOutboxItem[] }>(
        outboxListRes.body,
      );
      expect(outboxData.total).toBeGreaterThanOrEqual(1);
      const sentMsg = outboxData.items[0]!;
      expect(sentMsg).toBeDefined();
      expect(sentMsg.status).toBe('SENT');
      expect(sentMsg.externalReference).toBeDefined();
    },
    60_000,
  );

  //
  // 3. ACK INGESTION & CORRELATION (ACCEPTED)
  //
  it(
    'ingests CONTRL ACK with ACCEPTED status and correlates to the original outbox message',
    async () => {
      // Get a SENT message
      const outboxListRes = await auth(
        request(app.getHttpServer()).get('/api/edi/outbox'),
      ).query({
        status: 'SENT',
        limit: 1,
      });
      const outboxData = unwrap<{ items: EdiOutboxItem[] }>(outboxListRes.body);
      const outboxMsg = outboxData.items[0]!;
      expect(outboxMsg).toBeDefined();

      const externalRef = `ACK-REF-${Date.now()}`;
      const ingestRes = await auth(
        request(app.getHttpServer()).post('/api/edi/acks/ingest'),
      ).send({
        shippingLineId: outboxMsg.shippingLineId,
        ackType: 'CONTRL',
        status: 'ACCEPTED',
        outboxMessageId: outboxMsg.id,
        externalReference: externalRef,
        rawPayload: `<CONTRL><REF>${externalRef}</REF><STATUS>ACCEPTED</STATUS></CONTRL>`,
      });
      expect(ingestRes.status).toBe(201);
      const ack = unwrap<EdiAckItem>(ingestRes.body);
      expect(ack.id).toBeDefined();
      expect(ack.status).toBe('ACCEPTED');
      expect(ack.outboxMessageId).toBe(outboxMsg.id);

      // Verify fetch ACK by ID
      const getAckRes = await auth(
        request(app.getHttpServer()).get(`/api/edi/acks/${ack.id}`),
      );
      expect(getAckRes.status).toBe(200);
      const fetchedAck = unwrap<EdiAckItem>(getAckRes.body);
      expect(fetchedAck.status).toBe('ACCEPTED');
    },
    60_000,
  );

  //
  // 4. ACK REJECTED CREATES OPERATIONAL ALERT
  //
  it(
    'ingests APERAK ACK with REJECTED status and creates an EDI incident/alert',
    async () => {
      // Get an outbox message
      const outboxListRes = await auth(
        request(app.getHttpServer()).get('/api/edi/outbox'),
      ).query({
        status: 'SENT',
        limit: 1,
      });
      const outboxData = unwrap<{ items: EdiOutboxItem[] }>(outboxListRes.body);
      const outboxMsg = outboxData.items[0]!;
      expect(outboxMsg).toBeDefined();

      const externalRef = `REJECT-REF-${Date.now()}`;
      const ingestRes = await auth(
        request(app.getHttpServer()).post('/api/edi/acks/ingest'),
      ).send({
        shippingLineId: outboxMsg.shippingLineId,
        ackType: 'APERAK',
        status: 'REJECTED',
        outboxMessageId: outboxMsg.id,
        externalReference: externalRef,
        rawPayload: `<APERAK><REF>${externalRef}</REF><ERR>INVALID_SEAL</ERR></APERAK>`,
      });
      expect(ingestRes.status).toBe(201);
      const ack = unwrap<EdiAckItem>(ingestRes.body);
      expect(ack.status).toBe('REJECTED');

      // Check that EDI alert was created
      const alertListRes = await auth(
        request(app.getHttpServer()).get('/api/edi/alerts'),
      ).query({
        alertType: 'ACK_REJECTED',
      });
      expect(alertListRes.status).toBe(200);
      const alertData = unwrap<{ total: number; items: EdiAlertItem[] }>(
        alertListRes.body,
      );
      expect(alertData.total).toBeGreaterThanOrEqual(1);

      const matchingAlert = alertData.items.find((a) => a.sourceId === ack.id);
      expect(matchingAlert).toBeDefined();
      expect(matchingAlert?.alertType).toBe('ACK_REJECTED');
      expect(matchingAlert?.severity).toBe('ERROR');
      expect(matchingAlert?.status).toBe('OPEN');

      // Acknowledge and resolve the alert
      const ackAlertRes = await auth(
        request(app.getHttpServer()).post(
          `/api/edi/alerts/${matchingAlert!.id}/acknowledge`,
        ),
      );
      expect(ackAlertRes.status).toBe(201);

      const resolveAlertRes = await auth(
        request(app.getHttpServer()).post(
          `/api/edi/alerts/${matchingAlert!.id}/resolve`,
        ),
      ).send({
        resolutionNote: 'Verified seal discrepancy manually with carrier desk',
      });
      expect(resolveAlertRes.status).toBe(201);
      const resolvedAlert = unwrap<EdiAlertItem>(resolveAlertRes.body);
      expect(resolvedAlert.status).toBe('RESOLVED');
    },
    60_000,
  );

  //
  // 5. PROVING SENT !== ACKNOWLEDGED
  //
  it(
    'demonstrates that transport delivery status (SENT) and partner acknowledgement status are decoupled',
    async () => {
      // Find outbox message that has status SENT
      const outboxListRes = await auth(
        request(app.getHttpServer()).get('/api/edi/outbox'),
      ).query({
        status: 'SENT',
        limit: 1,
      });
      const outboxMsg = unwrap<{ items: EdiOutboxItem[] }>(
        outboxListRes.body,
      ).items[0]!;
      expect(outboxMsg).toBeDefined();
      expect(outboxMsg.status).toBe('SENT');

      // In DB, outbox message remains SENT while acks table holds separate acknowledgements
      const dbMsg = await prisma.ediOutboxMessage.findUnique({
        where: { id: outboxMsg.id },
        include: { acknowledgements: true },
      });
      expect(dbMsg?.status).toBe('SENT');
      // Acknowledgements are separate records with their own distinct lifecycles
      expect(Array.isArray(dbMsg?.acknowledgements)).toBe(true);
    },
    60_000,
  );

  //
  // 6. RETRY RE-QUEUES FAILED MESSAGES WITHOUT DUPLICATING BUSINESS EVENT
  //
  it(
    'retries a FAILED outbox message by resetting status to PENDING without duplicating the message',
    async () => {
      // Create a dummy FAILED outbox message
      const failedMsg = await prisma.ediOutboxMessage.create({
        data: {
          ediRoute: {
            connect: {
              icdId_shippingLineId: {
                icdId: defaultIcdId,
                shippingLineId: shippingLineId,
              },
            },
          },
          shippingLine: {
            connect: { id: shippingLineId },
          },
          messageType: 'COREOR',
          status: 'FAILED',
          idempotencyKey: `RETRY_TEST:${Date.now()}`,
          retryCount: 1,
          lastError: 'Simulated connection timeout',
          payloadSnapshot: { test: true },
          routingSnapshot: { transport: 'MOCK', icdId: defaultIcdId },
        },
      });

      // Request retry via API
      const retryRes = await auth(
        request(app.getHttpServer()).post(`/api/edi/outbox/${failedMsg.id}/retry`),
      );
      expect(retryRes.status).toBe(201);
      const retried = unwrap<EdiOutboxItem>(retryRes.body);
      expect(retried.status).toBe('PENDING');

      // Verify no duplicate record was created
      const totalCount = await prisma.ediOutboxMessage.count({
        where: { idempotencyKey: failedMsg.idempotencyKey },
      });
      expect(totalCount).toBe(1);
    },
    60_000,
  );
});
