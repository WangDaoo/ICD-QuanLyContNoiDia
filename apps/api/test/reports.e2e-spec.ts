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
  user: {
    id: string;
    email: string;
  };
};

describe('Reports Integration E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@icd.local';
  const adminPassword =
    process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ICD2026!StrongPass';

  async function login(email: string, password: string): Promise<AuthResult> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return res.body as AuthResult;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await assertE2EDatabase(prisma);

    const adminAuth = await login(adminEmail, adminPassword);
    adminAccessToken = adminAuth.accessToken;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. returns dashboard summary with comprehensive metrics, holdings and alerts', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reports/dashboard/summary')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const body = res.body.data;
    expect(body).toBeDefined();
    expect(body.timeZone).toBeDefined();
    expect(body.asOfAt).toBeDefined();

    // Yard KPIs
    expect(body.yard).toBeDefined();
    expect(typeof body.yard.inYardCount).toBe('number');
    expect(body.yard.byCategory).toBeDefined();
    expect(body.yard.byHoldStatus).toBeDefined();
    expect(body.yard.byContainerType).toBeDefined();

    // Gate KPIs
    expect(body.gateToday).toBeDefined();
    expect(typeof body.gateToday.gateIn).toBe('number');
    expect(typeof body.gateToday.gateOut).toBe('number');
    expect(typeof body.gateToday.netFlow).toBe('number');
    expect(Array.isArray(body.gateToday.hourly)).toBe(true);
    expect(body.gateToday.hourly).toHaveLength(24);

    // Revenue KPIs
    expect(body.revenueMonth).toBeDefined();
    expect(typeof body.revenueMonth.totalRevenue).toBe('number');
    expect(typeof body.revenueMonth.allocationCount).toBe('number');
    expect(Array.isArray(body.revenueMonth.series)).toBe(true);

    // Outstanding debt KPIs
    expect(body.outstandingDebt).toBeDefined();
    expect(typeof body.outstandingDebt.totalOutstanding).toBe('number');
    expect(typeof body.outstandingDebt.totalOverdue).toBe('number');
    expect(typeof body.outstandingDebt.invoiceCount).toBe('number');

    // Operational holds & EDI
    expect(body.operationalHolds).toBeDefined();
    expect(typeof body.operationalHolds.activeCount).toBe('number');
    expect(body.ediAlerts).toBeDefined();
    expect(typeof body.ediAlerts.activeAlertsCount).toBe('number');
  });

  it('2. aggregates Gate Activity report accurately for real gate-in and gate-out events', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Execute a full lifecycle scenario through Gate-pass and Gate-out
    const scenario = await createCoreScenario(app, adminAccessToken, 'GATE_PASS');
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/reports/gate-activity')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        fromDate: today,
        toDate: today,
      })
      .expect(200);

    const report = res.body.data;
    expect(report.period.fromDate).toBe(today);
    expect(report.period.toDate).toBe(today);
    expect(report.summary.gateIn).toBeGreaterThanOrEqual(1);
    expect(report.summary.gateOut).toBeGreaterThanOrEqual(1);
    expect(report.summary.netFlow).toBe(report.summary.gateIn - report.summary.gateOut);

    const todayEntry = report.daily.find((d: { date: string }) => d.date === today);
    expect(todayEntry).toBeDefined();
    expect(todayEntry.gateIn).toBeGreaterThanOrEqual(1);
    expect(todayEntry.gateOut).toBeGreaterThanOrEqual(1);

    const totalHourlyIn = report.hourly.reduce((sum: number, h: { gateIn: number }) => sum + h.gateIn, 0);
    const totalHourlyOut = report.hourly.reduce((sum: number, h: { gateOut: number }) => sum + h.gateOut, 0);
    expect(totalHourlyIn).toBe(report.summary.gateIn);
    expect(totalHourlyOut).toBe(report.summary.gateOut);
  });

  it('3. calculates Container Turnover report with valid dwell time metrics', async () => {
    const today = new Date().toISOString().slice(0, 10);

    const scenario = await createCoreScenario(app, adminAccessToken, 'GATE_PASS');
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/reports/container-turnover')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        fromDate: today,
        toDate: today,
      })
      .expect(200);

    const report = res.body.data;
    expect(report.summary.exitedCount).toBeGreaterThanOrEqual(1);
    expect(report.summary.averageDwellHours).toBeGreaterThanOrEqual(0);

    const targetRow = report.data.find(
      (r: { containerVisitId: string }) => r.containerVisitId === scenario.containerVisitId,
    );
    expect(targetRow).toBeDefined();
    expect(targetRow.gateInAt).toBeDefined();
    expect(targetRow.gateOutAt).toBeDefined();
    expect(targetRow.dwellHours).toBeGreaterThanOrEqual(0);
    expect(targetRow.dwellDays).toBeGreaterThanOrEqual(0);
    expect(report.byContainerType.length).toBeGreaterThan(0);
  });

  it('4. strictly validates Current Yard Inventory based on active location log (endedAt IS NULL)', async () => {
    // Container A: Stays in Yard (stage = YARD)
    const scenarioA = await createCoreScenario(app, adminAccessToken, 'YARD');

    // Container B: Completes full cycle through Gate-out (stage = EXITED)
    const scenarioB = await createCoreScenario(app, adminAccessToken, 'GATE_PASS');
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        visitId: scenarioB.containerVisitId,
        qrToken: scenarioB.qrToken,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/reports/yard-inventory/current')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const report = res.body.data;
    expect(report.summary.occupiedSlots).toBeGreaterThanOrEqual(1);
    expect(report.summary.operationalSlots).toBeGreaterThan(0);

    const foundA = report.data.find(
      (row: { containerVisitId: string }) => row.containerVisitId === scenarioA.containerVisitId,
    );
    const foundB = report.data.find(
      (row: { containerVisitId: string }) => row.containerVisitId === scenarioB.containerVisitId,
    );

    // Invariant: Container A must be present in yard, Container B must NOT be in yard
    expect(foundA).toBeDefined();
    expect(foundB).toBeUndefined();

    // Verify DB source-of-truth
    const locationA = await prisma.containerLocationLog.findFirst({
      where: {
        containerVisitId: scenarioA.containerVisitId,
        endedAt: null,
      },
    });
    expect(locationA).not.toBeNull();

    const locationB = await prisma.containerLocationLog.findFirst({
      where: {
        containerVisitId: scenarioB.containerVisitId,
        endedAt: null,
      },
    });
    expect(locationB).toBeNull();
  });

  it('5. returns correct historical snapshot in Yard Inventory EOD regardless of current EXITED state', async () => {
    // Setup a past date
    const historicalDate = '2026-09-10';
    const startedAt = new Date('2026-09-08T10:00:00.000Z');
    const endedAtAfterSnapshot = new Date('2026-09-12T10:00:00.000Z');

    // Create a container scenario
    const scenario = await createCoreScenario(app, adminAccessToken, 'GATE_PASS');

    // Perform gate out so it's EXITED currently
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      })
      .expect(201);

    // Update location log to represent historical period spanning historicalDate
    await prisma.containerLocationLog.updateMany({
      where: { containerVisitId: scenario.containerVisitId },
      data: {
        startedAt,
        endedAt: endedAtAfterSnapshot,
      },
    });

    // Query historical EOD for 2026-09-10
    const res = await request(app.getHttpServer())
      .get('/api/reports/yard-inventory/eod')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        date: historicalDate,
      })
      .expect(200);

    const report = res.body.data;
    expect(report.date).toBe(historicalDate);
    expect(report.isFinalized).toBe(true);

    const foundInHistorical = report.data.find(
      (row: { containerVisitId: string }) => row.containerVisitId === scenario.containerVisitId,
    );

    // Invariant: Container was present at historical snapshot date, so it must be returned
    expect(foundInHistorical).toBeDefined();
    expect(foundInHistorical.containerVisitId).toBe(scenario.containerVisitId);
  });

  it('6. calculates Revenue strictly by payment_allocation and Outstanding Debt correctly', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Create two real scenarios at INVOICED stage
    const scenario1 = await createCoreScenario(app, adminAccessToken, 'INVOICED');
    const scenario2 = await createCoreScenario(app, adminAccessToken, 'INVOICED');

    const inv1 = await prisma.invoice.findUniqueOrThrow({
      where: { id: scenario1.invoiceId },
    });
    const inv2 = await prisma.invoice.findUniqueOrThrow({
      where: { id: scenario2.invoiceId },
    });

    const amount1 = Number(inv1.totalAmount);
    const amount2 = Number(inv2.totalAmount);

    // 2. Perform payment allocated to both invoices
    const payRes1 = await request(app.getHttpServer())
      .post('/api/billing/payments')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        consigneeId: scenario1.consigneeId,
        amount: amount1,
        method: 'BANK_TRANSFER',
        paidAt: new Date().toISOString(),
        allocations: [
          {
            invoiceId: scenario1.invoiceId,
            amount: amount1,
          },
        ],
      })
      .expect(201);

    expect(payRes1.body.data?.id).toBeDefined();

    // Partially pay second invoice (e.g. 40% paid, 60% outstanding)
    const partialPaid = Math.floor(amount2 * 0.4);
    const expectedOutstanding = amount2 - partialPaid;

    const payRes2 = await request(app.getHttpServer())
      .post('/api/billing/payments')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        consigneeId: scenario2.consigneeId,
        amount: partialPaid,
        method: 'BANK_TRANSFER',
        paidAt: new Date().toISOString(),
        allocations: [
          {
            invoiceId: scenario2.invoiceId,
            amount: partialPaid,
          },
        ],
      })
      .expect(201);

    expect(payRes2.body.data?.id).toBeDefined();

    // 3. Query Revenue Report: Revenue by consignee should reflect payment allocations, not invoice totals
    const revRes = await request(app.getHttpServer())
      .get('/api/reports/revenue')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        fromDate: today,
        toDate: today,
      })
      .expect(200);

    const revenueReport = revRes.body.data;
    const consignee1Rev = revenueReport.byConsignee.find(
      (c: { consigneeId: string }) => c.consigneeId === scenario1.consigneeId,
    );
    expect(consignee1Rev).toBeDefined();
    expect(consignee1Rev.amount).toBe(amount1);

    const consignee2Rev = revenueReport.byConsignee.find(
      (c: { consigneeId: string }) => c.consigneeId === scenario2.consigneeId,
    );
    expect(consignee2Rev).toBeDefined();
    expect(consignee2Rev.amount).toBe(partialPaid);

    // 4. Query Outstanding Debt Report: Scenario 2 must have outstandingAmount = amount2 - partialPaid
    const debtRes = await request(app.getHttpServer())
      .get('/api/reports/outstanding-debt')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const debtReport = debtRes.body.data;
    const inv2DebtRow = debtReport.data.find(
      (r: { invoiceId: string }) => r.invoiceId === scenario2.invoiceId,
    );

    expect(inv2DebtRow).toBeDefined();
    expect(inv2DebtRow.totalAmount).toBe(amount2);
    expect(inv2DebtRow.paidAmount).toBe(partialPaid);
    expect(inv2DebtRow.outstandingAmount).toBe(expectedOutstanding);
  });

  it('7. exports multi-sheet Excel report with correct MIME type and non-empty buffer', async () => {
    const today = new Date().toISOString().slice(0, 10);

    const res = await request(app.getHttpServer())
      .get('/api/reports/export/excel')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        fromDate: today,
        toDate: today,
      })
      .buffer(true)
      .parse((response, callback) => {
        const data: Buffer[] = [];
        response.on('data', (chunk) => data.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(data)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toContain('attachment; filename=');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(1000);
  });
});
