import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BUSINESS_DICTIONARIES,
  businessLabel,
  businessOptions,
  businessTone,
  type BusinessDomain,
} from './business-labels';

const REQUIRED_CODES: Partial<Record<BusinessDomain, readonly string[]>> = {
  containerVisitStatus: [
    'PENDING', 'AUTHORIZED', 'IN_YARD', 'IN_STRIPPING', 'STRIPPED',
    'UNDER_INSPECTION', 'GATE_PASS_ISSUED', 'EXITED', 'CANCELLED',
  ],
  movementOrderStatus: ['DRAFT', 'AUTHORIZED', 'EXPIRED', 'CANCELLED'],
  truckVisitStatus: ['SCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  truckVisitType: ['GATE_IN', 'GATE_OUT'],
  yardTaskStatus: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  serviceOrderStatus: ['DRAFT', 'CONFIRMED', 'INVOICED', 'PAID', 'CANCELLED'],
  invoiceStatus: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID'],
  gatePassStatus: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'UNKNOWN'],
  manifestStatus: ['DRAFT', 'SUBMITTED', 'CANCELLED'],
  ediOutboxStatus: ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD'],
  ediAckStatus: ['ACCEPTED', 'REJECTED', 'ERROR', 'UNMATCHED'],
  handoverStatus: [
    'DRAFT', 'READY_FOR_HANDOVER', 'PARTNER_ACCEPTED', 'IN_TRANSIT', 'PARTNER_CONFIRMED',
    'ICD_CONFIRMED', 'COMPLETED', 'PARTNER_REJECTED', 'DELIVERY_FAILED', 'DISPUTED', 'CANCELLED',
  ],
  holdType: ['CUSTOMS', 'SHIPPING_LINE', 'DAMAGE', 'SECURITY', 'DOCUMENT', 'OTHER'],
  taskUrgency: ['OVERDUE', 'HIGH', 'MEDIUM', 'NORMAL'],
  taskType: ['GATE_IN', 'YARD_ASSIGN', 'YARD_OPERATIONS', 'BILLING', 'GATE_OUT', 'HANDOVER_REVIEW'],
};

test('every backend code used by the web app has a Vietnamese label', () => {
  for (const [domain, codes] of Object.entries(REQUIRED_CODES) as Array<[BusinessDomain, readonly string[]]>) {
    for (const code of codes) {
      const label = businessLabel(domain, code);
      assert.notEqual(label, code, `${domain}.${code} is missing a label`);
      assert.doesNotMatch(label, /^[A-Z_]+$/, `${domain}.${code} label must not be an enum`);
    }
  }
});

test('labels never leak raw enum codes', () => {
  for (const [domain, dictionary] of Object.entries(BUSINESS_DICTIONARIES)) {
    for (const [code, item] of Object.entries(dictionary)) {
      assert.ok(item.label.trim().length > 0, `${domain}.${code} label is empty`);
      assert.doesNotMatch(item.label, /\b[A-Z]{2,}_[A-Z_]+\b/, `${domain}.${code} label contains an enum`);
    }
  }
});

test('unknown codes stay visible and neutral', () => {
  assert.equal(businessLabel('invoiceStatus', 'SOMETHING_NEW'), 'SOMETHING_NEW');
  assert.equal(businessTone('invoiceStatus', 'SOMETHING_NEW'), 'neutral');
  assert.equal(businessLabel('invoiceStatus', undefined), '—');
  assert.equal(businessLabel('activeFlag', true), 'Đang hoạt động');
});

test('filter options keep backend values and show Vietnamese labels', () => {
  assert.deepEqual(businessOptions('invoiceStatus', ['UNPAID', 'PAID']), [
    { value: 'UNPAID', label: 'Chưa thanh toán' },
    { value: 'PAID', label: 'Đã thanh toán đủ' },
  ]);
});
