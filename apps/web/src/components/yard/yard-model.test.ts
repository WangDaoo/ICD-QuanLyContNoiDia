import assert from 'node:assert/strict';
import test from 'node:test';
import type { ContainerInspection, ContainerVisit, OperationalHold, YardSlot } from '../../types';
import { getBlockGeometry, getSlotAppearance, getSlotsAt, legendForMode, YARD_PALETTE } from './yard-model';

const visit: ContainerVisit = {
  id: 'visit-1', containerId: 'physical-1', containerNumber: 'MSCU1234567', containerType: '20GP',
  state: 'IN_YARD', consigneeId: 'consignee-1', consigneeName: 'Chủ hàng', shippingLine: 'MSC',
  manifestNo: 'MF-1', mblNumber: 'MBL-1', hblNumber: 'HBL-1', manifestSeal: 'SL-1', grossWeightKg: 20000,
};
const slot: YardSlot = {
  id: 'slot-1', blockCode: 'A', rowNo: 'R02', bayNo: 'B03', tierNo: 'T1', slotCode: 'A-R02-B03-T1',
  operational: true, reeferPower: false, maxWeightKg: 30000,
};
const occupied = { ...slot, occupiedByContainerId: visit.id, occupiedByContainerNumber: visit.containerNumber };
const hold: OperationalHold = {
  id: 'hold-1', containerVisitId: visit.id, holdType: 'CUSTOMS', status: 'ACTIVE', reason: 'Kiểm tra hồ sơ',
  placedBy: 'user-1', placedAt: '2026-10-02T00:00:00Z',
};
const inspection: ContainerInspection = {
  id: 'inspection-1', containerVisitId: visit.id, containerNumber: visit.containerNumber,
  inspectionType: 'Hải quan', status: 'COMPLETED', result: 'HOLD',
};

test('geometry naturally sorts real coordinate labels without replacing zero padding or alphanumeric names', () => {
  const slots = [
    { ...slot, id: 'a', rowNo: 'R10', bayNo: 'B10', tierNo: 'T10' },
    { ...slot, id: 'b', rowNo: 'R2', bayNo: 'B2', tierNo: 'T2' },
    { ...slot, id: 'c', rowNo: 'R01', bayNo: 'B01', tierNo: 'T1' },
    { ...slot, id: 'd', rowNo: 'R2', bayNo: 'B01', tierNo: 'T2' },
  ];
  assert.deepEqual(getBlockGeometry(slots), {
    rows: ['R01', 'R2', 'R10'], bays: ['B01', 'B2', 'B10'], tiers: ['T1', 'T2', 'T10'],
  });
  assert.deepEqual(getBlockGeometry([]), { rows: [], bays: [], tiers: [] });
});

test('sparse stack lookup returns only existing slots in tier order and retains object identity', () => {
  const top = { ...slot, id: 'top', tierNo: 'T10' };
  const bottom = { ...slot, id: 'bottom', tierNo: 'T2' };
  const elsewhere = { ...slot, id: 'elsewhere', bayNo: 'B04' };
  const slots = [top, elsewhere, bottom];
  assert.deepEqual(getSlotsAt(slots, 'R02', 'B03'), [bottom, top]);
  assert.equal(getSlotsAt(slots, 'R02', 'B03', 'T2')[0], bottom);
  assert.deepEqual(getSlotsAt(slots, 'R02', 'B03', 'T1'), []);
  assert.deepEqual(getSlotsAt(slots, 'R02', 'B05'), []);
});

test('coordinate lookup normalizes numeric inputs but preserves distinct string labels', () => {
  const numeric = { ...slot, id: 'numeric', rowNo: 2, bayNo: 3, tierNo: 1 };
  const padded = { ...slot, id: 'padded', rowNo: '02', bayNo: '03', tierNo: '01' };
  assert.deepEqual(getSlotsAt([padded, numeric], '2', 3, '1'), [numeric]);
  assert.deepEqual(getSlotsAt([padded, numeric], '02', '03', '01'), [padded]);
});

test('empty and empty reefer slots use the slot palette in both color modes', () => {
  for (const mode of ['SLOT', 'STATE'] as const) {
    const empty = getSlotAppearance(slot, [visit], [hold], [inspection], mode);
    assert.equal(empty.key, 'empty');
    assert.equal(empty.background, '#F8FAFC');
    assert.equal(empty.hold, false);
    assert.equal(empty.container, undefined);
    const reefer = getSlotAppearance({ ...slot, reeferPower: true }, [], [], [], mode);
    assert.equal(reefer.key, 'reefer');
    assert.equal(reefer.background, '#06B6D4');
  }
});

test('maintenance color has priority even for an occupied reefer with a hold', () => {
  for (const mode of ['SLOT', 'STATE'] as const) {
    const result = getSlotAppearance({ ...occupied, operational: false, reeferPower: true }, [visit], [hold], [], mode);
    assert.equal(result.key, 'maintenance');
    assert.equal(result.background, '#64748B');
    assert.equal(result.hold, true);
    assert.equal(result.container, visit);
  }
});

test('slot mode keeps every occupied slot blue while exposing holds as a separate flag', () => {
  const result = getSlotAppearance({ ...occupied, reeferPower: true }, [visit], [hold], [], 'SLOT');
  assert.equal(result.key, 'occupied');
  assert.equal(result.background, '#2563EB');
  assert.equal(result.hold, true);
});

test('occupiedByContainerId resolves the container visit ID instead of the physical container ID', () => {
  const wrongVisit = { ...visit, id: 'wrong-visit', containerId: visit.id, state: 'GATE_PASS_ISSUED' as const };
  const result = getSlotAppearance(occupied, [wrongVisit, visit], [], [], 'STATE');
  assert.equal(result.container, visit);
  assert.equal(result.key, 'in-yard');
  assert.equal(result.background, '#16A34A');
  const missing = getSlotAppearance({ ...occupied, occupiedByContainerId: visit.containerId }, [visit], [], [], 'STATE');
  assert.equal(missing.container, undefined);
  assert.equal(missing.key, 'occupied');
  assert.equal(missing.background, '#2563EB');
});

test('active operational holds and completed HOLD inspections override lifecycle colors', () => {
  const gatePass = { ...visit, state: 'GATE_PASS_ISSUED' as const };
  for (const [holds, inspections] of [[[hold], []], [[], [inspection]]] as const) {
    const result = getSlotAppearance(occupied, [gatePass], [...holds], [...inspections], 'STATE');
    assert.equal(result.key, 'hold');
    assert.equal(result.background, '#DC2626');
    assert.equal(result.hold, true);
  }
});

test('released, unrelated or unfinished holds do not create a hold appearance', () => {
  const result = getSlotAppearance(occupied, [visit], [
    { ...hold, status: 'RELEASED' }, { ...hold, id: 'other', containerVisitId: 'other-visit' },
  ], [
    { ...inspection, status: 'PENDING' }, { ...inspection, id: 'other', containerVisitId: 'other-visit' },
    { ...inspection, id: 'passed', result: 'PASS' },
  ], 'STATE');
  assert.equal(result.key, 'in-yard');
  assert.equal(result.hold, false);
});

test('inspection, issued gate pass and completed stripping keep distinct honest labels and colors', () => {
  const inspecting = getSlotAppearance(occupied, [{ ...visit, state: 'UNDER_INSPECTION' }], [], [], 'STATE');
  assert.equal(inspecting.key, 'inspection');
  assert.equal(inspecting.background, '#EAB308');
  assert.equal(inspecting.hold, false);
  const issued = getSlotAppearance(occupied, [{ ...visit, state: 'GATE_PASS_ISSUED' }], [], [], 'STATE');
  assert.equal(issued.key, 'gate-pass');
  assert.equal(issued.background, '#7C3AED');
  assert.doesNotMatch(issued.label, /ready|sẵn sàng/i);
  const stripped = getSlotAppearance(occupied, [{ ...visit, state: 'STRIPPED' }], [], [], 'STATE');
  assert.equal(stripped.key, 'stripped');
  assert.equal(stripped.label, 'Rút hàng xong');
  assert.equal(stripped.background, '#2563EB');
});

test('an in-progress inspection colors its IN_YARD visit yellow only in state mode', () => {
  const activeInspection = { ...inspection, status: 'IN_PROGRESS' as const, result: undefined };
  const state = getSlotAppearance(occupied, [visit], [], [activeInspection], 'STATE');
  assert.equal(state.container?.state, 'IN_YARD');
  assert.equal(state.key, 'inspection');
  assert.equal(state.background, '#EAB308');
  assert.equal(state.hold, false);
  const slotMode = getSlotAppearance(occupied, [visit], [], [activeInspection], 'SLOT');
  assert.equal(slotMode.key, 'occupied');
  assert.equal(slotMode.background, '#2563EB');
});

test('pending, completed and unrelated inspections do not claim an IN_YARD visit is being inspected', () => {
  for (const record of [
    { ...inspection, status: 'PENDING' as const, result: undefined },
    { ...inspection, status: 'COMPLETED' as const, result: 'PASS' as const },
    { ...inspection, status: 'IN_PROGRESS' as const, result: undefined, containerVisitId: 'other-visit' },
  ]) {
    assert.equal(getSlotAppearance(occupied, [visit], [], [record], 'STATE').key, 'in-yard');
  }
});

test('hold has priority over an in-progress inspection on the same visit', () => {
  const activeInspection = { ...inspection, status: 'IN_PROGRESS' as const, result: undefined };
  for (const [holds, inspections] of [
    [[hold], [activeInspection]],
    [[], [inspection, activeInspection]],
  ] as const) {
    const appearance = getSlotAppearance(occupied, [visit], holds, inspections, 'STATE');
    assert.equal(appearance.key, 'hold');
    assert.equal(appearance.background, '#DC2626');
  }
});

test('every emitted appearance has exactly matching Legend styling without invented states', () => {
  for (const mode of ['SLOT', 'STATE'] as const) {
    const legend = legendForMode(mode);
    assert.equal(legend, YARD_PALETTE[mode]);
    assert.equal(new Set(legend.map((item) => item.key)).size, legend.length);
    assert.ok(legend.every((item) => !/ready|reserved|danger/i.test(item.key)));
    for (const state of ['IN_YARD', 'UNDER_INSPECTION', 'GATE_PASS_ISSUED', 'STRIPPED', 'AUTHORIZED'] as const) {
      const appearance = getSlotAppearance(occupied, [{ ...visit, state }], [], [], mode);
      const entry = legend.find((item) => item.key === appearance.key);
      assert.ok(entry, `Missing Legend entry for ${appearance.key}`);
      for (const property of ['label', 'background', 'color', 'border'] as const) {
        assert.equal(appearance[property], entry[property]);
      }
    }
  }
});
