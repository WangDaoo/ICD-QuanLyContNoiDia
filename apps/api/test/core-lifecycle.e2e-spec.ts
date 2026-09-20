import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request, { Response } from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { Iso6346Validator } from '../src/modules/containers/utils/iso-6346.validator';
import { assertE2EDatabase } from './helpers/assert-e2e-database';

config({ path: path.resolve(__dirname, '../../../.env') });

type AuthResult = {
  accessToken: string;
};

type EntityWithId = {
  id: string;
};

type InvoiceResult = {
  id: string;
  totalAmount: number | string;
  balanceDue?: number | string;
  outstandingAmount?: number | string;
  amountDue?: number | string;
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

function expectSuccess(response: Response, step: string): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `${step} failed: HTTP ${response.status}\n${JSON.stringify(response.body, null, 2)}`,
    );
  }
}

function toAmount(value: number | string | undefined): number {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid monetary amount: ${String(value)}`);
  }

  return amount;
}

describe('Core Lifecycle E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@icd.local';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ICD2026!StrongPass';

  const suffix = Date.now().toString();
  const shortSuffix = suffix.slice(-6);
  const prefix10 = `TSTU${shortSuffix}`;
  const containerNumber = `${prefix10}${Iso6346Validator.calculateCheckDigit(prefix10)}`;

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

  it(
    'moves a container from Manifest to EXITED',
    async () => {
      //
      // 1. MASTER DATA
      //
      const shippingLineResponse = await auth(
        request(app.getHttpServer()).post('/api/admin/master-data/shipping-lines'),
      ).send({
        name: `E2E Shipping Line ${suffix}`,
        scacCode: `E${shortSuffix}`,
      });
      expectSuccess(shippingLineResponse, 'Create shipping line');
      const shippingLine = unwrap<EntityWithId>(shippingLineResponse.body);

      const consigneeResponse = await auth(
        request(app.getHttpServer()).post('/api/admin/master-data/consignees'),
      ).send({
        name: `E2E Consignee ${suffix}`,
        taxCode: `TAX-${suffix}`,
        phone: '0900000000',
        email: `consignee-${suffix}@example.test`,
        address: 'E2E Test Address',
      });
      expectSuccess(consigneeResponse, 'Create consignee');
      const consignee = unwrap<EntityWithId>(consigneeResponse.body);

      const clearingAgentResponse = await auth(
        request(app.getHttpServer()).post('/api/admin/master-data/clearing-agents'),
      ).send({
        name: `E2E Clearing Agent ${suffix}`,
        licenseNo: `LIC-${suffix}`,
      });
      expectSuccess(clearingAgentResponse, 'Create clearing agent');
      const clearingAgent = unwrap<EntityWithId>(clearingAgentResponse.body);

      const transporterResponse = await auth(
        request(app.getHttpServer()).post('/api/admin/master-data/transporters'),
      ).send({
        name: `E2E Transporter ${suffix}`,
        taxCode: `TRANS-${suffix}`,
      });
      expectSuccess(transporterResponse, 'Create transporter');
      const transporter = unwrap<EntityWithId>(transporterResponse.body);

      //
      // 2. MANIFEST
      //
      const eta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const manifestResponse = await auth(
        request(app.getHttpServer()).post('/api/manifests'),
      ).send({
        shippingLineId: shippingLine.id,
        vesselName: `E2E Vessel ${suffix}`,
        voyageNo: `V${shortSuffix}`,
        eta,
        portOfLoading: 'SGSIN',
        portOfDischarge: 'VNHPH',
      });
      expectSuccess(manifestResponse, 'Create manifest');
      const manifest = unwrap<EntityWithId>(manifestResponse.body);

      //
      // 3. MASTER B/L
      //
      const mblResponse = await auth(
        request(app.getHttpServer()).post(`/api/manifests/${manifest.id}/master-bls`),
      ).send({
        mblNumber: `MBL${suffix}`,
        shippingLineId: shippingLine.id,
      });
      expectSuccess(mblResponse, 'Create Master B/L');
      const mbl = unwrap<EntityWithId>(mblResponse.body);

      //
      // 4. HOUSE B/L
      //
      const hblResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/manifests/${manifest.id}/master-bls/${mbl.id}/house-bls`,
        ),
      ).send({
        hblNumber: `HBL${suffix}`,
        consigneeId: consignee.id,
        clearingAgentId: clearingAgent.id,
        cargoDescription: 'E2E general cargo',
        grossWeight: 12000,
        packageCount: 100,
      });
      expectSuccess(hblResponse, 'Create House B/L');
      const hbl = unwrap<EntityWithId>(hblResponse.body);

      //
      // 5. SUBMIT MANIFEST
      //
      const submitManifestResponse = await auth(
        request(app.getHttpServer()).post(`/api/manifests/${manifest.id}/submit`),
      ).send({});
      expectSuccess(submitManifestResponse, 'Submit manifest');

      //
      // 6. CONTAINER VISIT
      //
      const containerResponse = await auth(
        request(app.getHttpServer()).post('/api/containers'),
      ).send({
        containerNumber,
        isoCode: '22G1',
        size: 'SIZE_20',
        type: 'DRY',
        tareWeight: 2300,
        maxPayload: 28000,
        houseBlId: hbl.id,
        sealNumber: `SEAL${shortSuffix}`,
        cargoDescription: 'E2E general cargo',
        grossWeight: 12000,
        category: 'IMPORT',
      });
      expectSuccess(containerResponse, 'Create container visit');
      const containerVisit = unwrap<EntityWithId>(containerResponse.body);

      //
      // 7. MOVEMENT ORDER
      //
      const orderResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/movement-orders/containers/${containerVisit.id}`,
        ),
      ).send({
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      expectSuccess(orderResponse, 'Create movement order');
      const movementOrder = unwrap<EntityWithId>(orderResponse.body);

      const authorizeResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/movement-orders/${movementOrder.id}/authorize`,
        ),
      ).send({});
      expectSuccess(authorizeResponse, 'Authorize movement order');

      //
      // 8. TRUCK VISIT
      //
      const truckResponse = await auth(
        request(app.getHttpServer()).post('/api/truck-visits'),
      ).send({
        visitType: 'GATE_IN',
        vehiclePlate: `29E2E${shortSuffix}`,
        trailerPlate: `TR${shortSuffix}`,
        driverName: `E2E Driver ${suffix}`,
        driverPhone: '0900000001',
        transporterId: transporter.id,
        appointmentAt: new Date().toISOString(),
        gateLane: 'LANE-E2E',
        containerVisitIds: [containerVisit.id],
      });
      expectSuccess(truckResponse, 'Create truck visit');
      const truckVisit = unwrap<EntityWithId>(truckResponse.body);

      const arriveResponse = await auth(
        request(app.getHttpServer()).post(`/api/truck-visits/${truckVisit.id}/arrive`),
      ).send({
        gateLane: 'LANE-E2E',
        arrivedAt: new Date().toISOString(),
      });
      expectSuccess(arriveResponse, 'Truck arrival');

      //
      // 9. GATE-IN CONTEXT
      //
      const gateInContextResponse = await auth(
        request(app.getHttpServer()).get(
          `/api/containers/${containerVisit.id}/gate-in-context`,
        ),
      );
      expectSuccess(gateInContextResponse, 'Get gate-in context');

      //
      // 10. GATE-IN
      //
      const gateInResponse = await auth(
        request(app.getHttpServer()).post(`/api/containers/${containerVisit.id}/gate-in`),
      ).send({
        truckVisitId: truckVisit.id,
        actualSeal: `SEAL${shortSuffix}`,
        actualWeight: 12000,
        conditionCode: 'GOOD',
        conditionNotes: 'E2E gate-in condition',
      });
      expectSuccess(gateInResponse, 'Gate-in container');

      //
      // 11. YARD BLOCK
      //
      const blockResponse = await auth(
        request(app.getHttpServer()).post('/api/yard/blocks'),
      ).send({
        blockCode: `E2E${shortSuffix}`,
        name: `E2E Block ${suffix}`,
      });
      expectSuccess(blockResponse, 'Create yard block');
      const yardBlock = unwrap<EntityWithId>(blockResponse.body);

      //
      // 12. YARD SLOT
      //
      const slotResponse = await auth(
        request(app.getHttpServer()).post(`/api/yard/blocks/${yardBlock.id}/slots`),
      ).send({
        rowNo: 'A',
        bayNo: '01',
        tierNo: '01',
        supportedContainerType: 'DRY',
        reeferPower: false,
        maxWeight: 30000,
      });
      expectSuccess(slotResponse, 'Create yard slot');
      const yardSlot = unwrap<EntityWithId>(slotResponse.body);

      //
      // 13. YARD RECOMMENDATION
      //
      const recommendationResponse = await auth(
        request(app.getHttpServer()).get(
          `/api/containers/${containerVisit.id}/yard/recommendations`,
        ),
      );
      expectSuccess(recommendationResponse, 'Get yard recommendation');

      //
      // 14. HARD-RULE CHECK
      //
      const yardCheckResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${containerVisit.id}/yard/check`,
        ),
      ).send({
        yardSlotId: yardSlot.id,
      });
      expectSuccess(yardCheckResponse, 'Check yard slot');

      //
      // 15. ASSIGN YARD SLOT
      //
      const assignResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${containerVisit.id}/yard/assign`,
        ),
      ).send({
        yardSlotId: yardSlot.id,
        source: 'MANUAL',
      });
      expectSuccess(assignResponse, 'Assign yard slot');

      //
      // 16. VERIFY CURRENT LOCATION
      //
      const locationResponse = await auth(
        request(app.getHttpServer()).get(
          `/api/containers/${containerVisit.id}/yard/location`,
        ),
      );
      expectSuccess(locationResponse, 'Get current yard location');

      //
      // 17. BILLING PREVIEW
      //
      const previewResponse = await auth(
        request(app.getHttpServer()).post('/api/billing/service-orders/preview'),
      ).send({
        containerVisitId: containerVisit.id,
        asOfDate: new Date().toISOString(),
      });
      expectSuccess(previewResponse, 'Preview billing');

      //
      // 18. CREATE SERVICE ORDER
      //
      const serviceOrderResponse = await auth(
        request(app.getHttpServer()).post('/api/billing/service-orders'),
      ).send({
        containerVisitId: containerVisit.id,
        asOfDate: new Date().toISOString(),
        notes: 'E2E core lifecycle',
      });
      expectSuccess(serviceOrderResponse, 'Create service order');
      const serviceOrder = unwrap<EntityWithId>(serviceOrderResponse.body);

      //
      // 19. CONFIRM SERVICE ORDER
      //
      const confirmOrderResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/billing/service-orders/${serviceOrder.id}/confirm`,
        ),
      ).send({});
      expectSuccess(confirmOrderResponse, 'Confirm service order');

      //
      // 20. ISSUE INVOICE
      //
      const invoiceResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/billing/invoices/${serviceOrder.id}/issue`,
        ),
      ).send({
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      expectSuccess(invoiceResponse, 'Issue invoice');
      const invoice = unwrap<InvoiceResult>(invoiceResponse.body);

      const invoiceAmount = toAmount(
        invoice.balanceDue ??
          invoice.outstandingAmount ??
          invoice.amountDue ??
          invoice.totalAmount,
      );
      expect(invoiceAmount).toBeGreaterThan(0);

      //
      // 21. PAYMENT + ALLOCATION
      //
      const paymentResponse = await auth(
        request(app.getHttpServer()).post('/api/billing/payments'),
      ).send({
        consigneeId: consignee.id,
        amount: invoiceAmount,
        method: 'BANK_TRANSFER',
        paidAt: new Date().toISOString(),
        allocations: [
          {
            invoiceId: invoice.id,
            amount: invoiceAmount,
          },
        ],
      });
      expectSuccess(paymentResponse, 'Pay invoice');

      //
      // 22. BILLING READINESS
      //
      const billingReadinessResponse = await auth(
        request(app.getHttpServer()).get(
          `/api/billing/readiness/${containerVisit.id}`,
        ),
      );
      expectSuccess(billingReadinessResponse, 'Billing readiness');

      //
      // 23. GATE PASS READINESS
      //
      const readinessResponse = await auth(
        request(app.getHttpServer()).get(
          `/api/containers/${containerVisit.id}/gate-pass/readiness`,
        ),
      );
      expectSuccess(readinessResponse, 'Gate-pass readiness');

      //
      // 24. ISSUE GATE PASS
      //
      const gatePassResponse = await auth(
        request(app.getHttpServer()).post(
          `/api/containers/${containerVisit.id}/gate-pass`,
        ),
      ).send({
        ttlHours: 24,
        vehiclePlate: `29E2E${shortSuffix}`,
        receiverName: 'E2E Receiver',
        receiverIdNumber: `ID${shortSuffix}`,
        note: 'Core lifecycle E2E',
      });
      expectSuccess(gatePassResponse, 'Issue gate pass');
      const gatePass = unwrap<GatePassResult>(gatePassResponse.body);

      expect(gatePass.id).toEqual(expect.any(String));
      expect(gatePass.qrToken).toEqual(expect.any(String));
      expect(gatePass.qrToken.length).toBeGreaterThanOrEqual(20);

      //
      // 25. SCAN GATE PASS
      //
      const scanResponse = await auth(
        request(app.getHttpServer()).post('/api/gate-pass/scan'),
      ).send({
        qrToken: gatePass.qrToken,
      });
      expectSuccess(scanResponse, 'Scan gate pass');

      //
      // 26. GATE OUT
      //
      const gateOutResponse = await auth(
        request(app.getHttpServer()).post('/api/gate-out'),
      ).send({
        visitId: containerVisit.id,
        qrToken: gatePass.qrToken,
      });
      expectSuccess(gateOutResponse, 'Confirm gate-out');

      //
      // 27. API FINAL STATE
      //
      const finalContainerResponse = await auth(
        request(app.getHttpServer()).get(`/api/containers/${containerVisit.id}`),
      );
      expectSuccess(finalContainerResponse, 'Get final container state');

      const finalContainer = unwrap<{
        id: string;
        status: string;
        gateOutAt?: string;
      }>(finalContainerResponse.body);

      expect(finalContainer.id).toBe(containerVisit.id);
      expect(finalContainer.status).toBe('EXITED');

      //
      // 28. DATABASE INVARIANTS
      //
      const persistedVisit = await prisma.containerVisit.findUnique({
        where: {
          id: containerVisit.id,
        },
      });
      expect(persistedVisit).not.toBeNull();
      expect(persistedVisit?.status).toBe('EXITED');
      expect(persistedVisit?.gateOutAt).not.toBeNull();

      const persistedGatePass = await prisma.gatePass.findUnique({
        where: {
          id: gatePass.id,
        },
      });
      expect(persistedGatePass?.status).toBe('USED');

      const activeLocation = await prisma.containerLocationLog.findFirst({
        where: {
          containerVisitId: containerVisit.id,
          endedAt: null,
        },
      });
      expect(activeLocation).toBeNull();

      const exitedEvent = await prisma.containerEvent.findFirst({
        where: {
          visitId: containerVisit.id,
          toStatus: 'EXITED',
        },
      });
      expect(exitedEvent).not.toBeNull();
    },
    120_000,
  );
});
