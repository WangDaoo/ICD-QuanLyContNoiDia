import { INestApplication } from '@nestjs/common';
import request, { Response } from 'supertest';
import { Iso6346Validator } from '../../src/modules/containers/utils/iso-6346.validator';

export type CoreStage =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'ARRIVED'
  | 'GATE_IN'
  | 'YARD'
  | 'INVOICED'
  | 'PAID'
  | 'GATE_PASS';

export type CoreScenario = {
  manifestId: string;
  hblId: string;
  containerVisitId: string;
  movementOrderId: string;
  truckVisitId: string;
  yardBlockId?: string;
  yardSlotId?: string;
  consigneeId: string;
  shippingLineId: string;
  serviceOrderId?: string;
  invoiceId?: string;
  gatePassId?: string;
  qrToken?: string;
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

let fixtureCounter = 0;

export async function createCoreScenario(
  app: INestApplication,
  accessToken: string,
  targetStage: CoreStage,
): Promise<CoreScenario> {
  const auth = (req: request.Test): request.Test =>
    req.set('Authorization', `Bearer ${accessToken}`);

  fixtureCounter += 1;
  const suffix = `${Date.now()}${fixtureCounter}`;
  const shortSuffix = suffix.slice(-6);
  const prefix10 = `TSTU${shortSuffix}`;
  const containerNumber = `${prefix10}${Iso6346Validator.calculateCheckDigit(prefix10)}`;

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

  // Enable EDI route for this shipping line
  await auth(
    request(app.getHttpServer()).put(`/api/edi/routes/${shippingLine.id}`),
  ).send({
    enabled: true,
    transport: 'MOCK',
    outboundFormat: 'CODECO_CANONICAL_JSON_V1',
    partnerTarget: 'mock://edi.shippingline.test',
    timeoutMs: 10000,
  });

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

  const scenario: CoreScenario = {
    manifestId: manifest.id,
    hblId: hbl.id,
    containerVisitId: containerVisit.id,
    movementOrderId: movementOrder.id,
    truckVisitId: '',
    consigneeId: consignee.id,
    shippingLineId: shippingLine.id,
  };

  if (targetStage === 'CREATED') {
    return scenario;
  }

  //
  // AUTHORIZE
  //
  const authorizeResponse = await auth(
    request(app.getHttpServer()).post(
      `/api/movement-orders/${movementOrder.id}/authorize`,
    ),
  ).send({});
  expectSuccess(authorizeResponse, 'Authorize movement order');

  if (targetStage === 'AUTHORIZED') {
    return scenario;
  }

  //
  // 8. TRUCK VISIT + ARRIVE
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
  scenario.truckVisitId = truckVisit.id;

  const arriveResponse = await auth(
    request(app.getHttpServer()).post(`/api/truck-visits/${truckVisit.id}/arrive`),
  ).send({
    gateLane: 'LANE-E2E',
    arrivedAt: new Date().toISOString(),
  });
  expectSuccess(arriveResponse, 'Truck arrival');

  if (targetStage === 'ARRIVED') {
    return scenario;
  }

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

  if (targetStage === 'GATE_IN') {
    return scenario;
  }

  //
  // 11. YARD BLOCK & SLOT ASSIGNMENT
  //
  const blockResponse = await auth(
    request(app.getHttpServer()).post('/api/yard/blocks'),
  ).send({
    blockCode: `E2E${shortSuffix}`,
    name: `E2E Block ${suffix}`,
  });
  expectSuccess(blockResponse, 'Create yard block');
  const yardBlock = unwrap<EntityWithId>(blockResponse.body);
  scenario.yardBlockId = yardBlock.id;

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
  scenario.yardSlotId = yardSlot.id;

  const assignResponse = await auth(
    request(app.getHttpServer()).post(
      `/api/containers/${containerVisit.id}/yard/assign`,
    ),
  ).send({
    yardSlotId: yardSlot.id,
    source: 'MANUAL',
  });
  expectSuccess(assignResponse, 'Assign yard slot');

  if (targetStage === 'YARD') {
    return scenario;
  }

  //
  // 18. SERVICE ORDER & INVOICE
  //
  const serviceOrderResponse = await auth(
    request(app.getHttpServer()).post('/api/billing/service-orders'),
  ).send({
    containerVisitId: containerVisit.id,
    asOfDate: new Date().toISOString(),
    notes: 'E2E core lifecycle fixture',
  });
  expectSuccess(serviceOrderResponse, 'Create service order');
  const serviceOrder = unwrap<EntityWithId>(serviceOrderResponse.body);
  scenario.serviceOrderId = serviceOrder.id;

  const confirmOrderResponse = await auth(
    request(app.getHttpServer()).post(
      `/api/billing/service-orders/${serviceOrder.id}/confirm`,
    ),
  ).send({});
  expectSuccess(confirmOrderResponse, 'Confirm service order');

  const invoiceResponse = await auth(
    request(app.getHttpServer()).post(
      `/api/billing/invoices/${serviceOrder.id}/issue`,
    ),
  ).send({
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  expectSuccess(invoiceResponse, 'Issue invoice');
  const invoice = unwrap<InvoiceResult>(invoiceResponse.body);
  scenario.invoiceId = invoice.id;

  if (targetStage === 'INVOICED') {
    return scenario;
  }

  //
  // 21. PAYMENT
  //
  const invoiceAmount = toAmount(
    invoice.balanceDue ??
      invoice.outstandingAmount ??
      invoice.amountDue ??
      invoice.totalAmount,
  );

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

  if (targetStage === 'PAID') {
    return scenario;
  }

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
    note: 'Core lifecycle fixture',
  });
  expectSuccess(gatePassResponse, 'Issue gate pass');
  const gatePass = unwrap<GatePassResult>(gatePassResponse.body);
  scenario.gatePassId = gatePass.id;
  scenario.qrToken = gatePass.qrToken;

  return scenario;
}
