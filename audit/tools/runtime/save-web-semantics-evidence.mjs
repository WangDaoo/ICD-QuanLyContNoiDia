import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../../..');
const read = relative => JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
const save = (relative, value) => writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
const openers = {
  ManifestsView: ['Tạo Manifest mới', '+ Master BL (selected DRAFT Manifest)', '+ House BL (selected DRAFT Manifest, existing Master BL)'],
  ContainersView: ['Chi tiết (container row)', 'Tạo Container Visit'],
  TruckVisitsView: ['Tạo Chuyến xe mới'],
  BillingView: ['Tạo Bảng giá (Tariff), tariff tab', '+ Quy tắc giá, tariff card', 'Tạo Đơn dịch vụ (Service Order)', 'Ghi nhận Thanh toán, unpaid/part-paid invoice'],
  GatePassView: ['Cấp Phiếu ra cổng mới'], HandoversView: ['Tạo Lệnh Bàn giao mới'],
  MasterDataView: ['Thêm mới (current master data category)'], UsersRolesView: ['Thêm người dùng, users tab'],
  PartnerManagementView: ['Thêm Đối tác API mới, clients tab'],
};
const dialogs = read('audit/fixes/W-S-001/inventory.json');
for (const dialog of dialogs) dialog.opener = openers[path.basename(dialog.file, '.tsx')][dialog.dialogIndex - 1];
assert.equal(dialogs.length, 15);
assert.ok(dialogs.every(dialog => dialog.opener));
save('audit/fixes/W-S-001/inventory.json', dialogs);

for (const relative of ['apps/web/src/components/ModalOverlay.tsx', 'apps/web/src/components/yard/useYardDialogFocus.ts']) {
  const base = path.join(root, 'audit/fixes/W-S-001');
  const before = path.join(base, 'before', relative);
  const after = path.join(base, 'after', relative);
  mkdirSync(path.dirname(before), { recursive: true });
  mkdirSync(path.dirname(after), { recursive: true });
  if (!existsSync(before)) writeFileSync(before, '');
  writeFileSync(after, readFileSync(path.join(root, relative), 'utf8'));
  const diff = spawnSync('git', ['diff', '--no-index', '--', before, after], { encoding: 'utf8' });
  assert.equal(diff.status, 1);
  writeFileSync(path.join(base, `${path.basename(relative)}.diff`), diff.stdout);
}
writeFileSync(path.join(root, 'audit/fixes/W-S-001/regressions/tab-wrap/ModalOverlay.after.tsx'), readFileSync(path.join(root, 'apps/web/src/components/ModalOverlay.tsx'), 'utf8'));

const checks = {
  source_regression: { pass: 23, fail: 0, baseline_pass: 0, baseline_fail: 23, green: 'audit/raw/re-audit/web-semantics/green.txt', red: 'audit/raw/re-audit/web-semantics/red.txt' },
  modal_lifecycle: { pass: 4, fail: 0, native_browser_tab_check_required: true, green: 'audit/raw/re-audit/web-semantics/modal-green.txt', red: 'audit/raw/re-audit/web-semantics/modal-trap-red.txt' },
  web_source_suite: { pass: 54, fail: 0, path: 'audit/raw/re-audit/web-semantics/web-source-tests.txt' },
  typecheck: { command: 'rtk tsc --noEmit --project apps/web/tsconfig.json', result: 'No errors found', runtime_claim: false },
};
for (const [id, count, scope] of [['W-S-001', 15, 'Named native modal opening, explicit Tab wrap, native cancel pending guard, opener restoration and body/main scroll lock'], ['W-S-002', 59, 'Visible sibling labels associated using native htmlFor/id; existing ARIA names retained; eight existing ARIA-named fields included in supplement'], ['W-S-003', 5, 'Native button record selectors with aria-pressed, focus ring, phrasing content, no nested buttons']]) {
  save(`audit/fixes/${id}/fix-log.json`, {
    id, updated_at: new Date().toISOString(), implementation_status: 'SOURCE_FIXED', verification_status: 'STATIC_VERIFIED_RUNTIME_PENDING',
    scope, count, checks, runtime_owner: 'root', runtime_status: 'UNKNOWN_PENDING_PARENT_NATIVE_CHECKS',
    preserved: ['Existing source work and write handlers', 'Existing panel styles and information', 'P2/P3 scope', 'Yard dialog behavior'],
    baseline_policy: 'Each before snapshot is the current dirty source immediately before this ID was applied; no Git HEAD reset and no overwrite of audit/raw/baseline.',
    notes: id === 'W-S-001' ? ['ModalOverlay is new; its empty before snapshot represents a previously absent file.', 'Yard focusableControls has an export keyword only; its filtering and hook behavior are unchanged.', 'Native Chrome Shift+Tab gap caught by parent was corrected with explicit wrapping; failed evidence preserved.'] : [],
  });
}

const observations = read('audit/rubric-observations.json').observations;
const scores = read('audit/scores.json');
const findings = read('audit/findings.json').findings;
const resolved = new Set(['W-S-020', 'W-S-001', 'W-S-002', 'W-S-003', 'W-S-005', 'W-S-016', 'M-001', 'M-002', 'M-003']);
const proposed = observations.filter(item => item.status === 'FAIL' && item.evidence.some(id => resolved.has(id)));
assert.equal(proposed.length, 9, 'Expected nine directly linked score observations');
const changedIds = new Set(proposed.map(item => item.id));
const byId = new Map(observations.map(item => [item.id, item]));
const numericSeverity = { P0: 4, P1: 3, P2: 2, P3: 1 };
const projections = {};
for (const platform of ['web', 'mobile']) {
  const baseline = scores.platforms[platform];
  const dimensions = baseline.ux_gap.dimensions.map(dimension => {
    const weightTotal = dimension.criteria.filter(item => item.applicable).reduce((sum, item) => sum + item.weight, 0);
    let baselineMin = 0, baselineMax = 0, min = 0, max = 0;
    const criteria = dimension.criteria.filter(item => item.applicable).map(criterion => {
      const sample = criterion.observation_ids.map(id => byId.get(id)).filter(item => item.status !== 'N/A');
      const denominator = sample.length;
      const passBefore = sample.filter(item => item.status === 'PASS').length;
      const unknown = sample.filter(item => item.status === 'UNKNOWN').length;
      const promoted = sample.filter(item => changedIds.has(item.id)).length;
      baselineMin += 25 * criterion.weight / weightTotal * passBefore / denominator;
      baselineMax += 25 * criterion.weight / weightTotal * (passBefore + unknown) / denominator;
      min += 25 * criterion.weight / weightTotal * (passBefore + promoted) / denominator;
      max += 25 * criterion.weight / weightTotal * (passBefore + promoted + unknown) / denominator;
      return { criterion: criterion.criterion, denominator_preserved: denominator, weight: criterion.weight, promoted_ids: sample.filter(item => changedIds.has(item.id)).map(item => item.id) };
    });
    assert.ok(Math.abs(baselineMin - dimension.min) < 1e-9, `${platform} D${dimension.dimension} baseline min mismatch`);
    assert.ok(Math.abs(baselineMax - dimension.max) < 1e-9, `${platform} D${dimension.dimension} baseline max mismatch`);
    return { dimension: dimension.dimension, baseline: { min: dimension.min, max: dimension.max }, conditional_after_all_nine_verified: { min, max }, criteria };
  });
  const heuristics = baseline.nielsen.heuristics.map(heuristic => {
    const remaining = heuristic.finding_ids.filter(id => !resolved.has(id));
    const maximum = remaining.length ? Math.max(...remaining.map(id => numericSeverity[findings.find(item => item.id === id).severity])) : 0;
    return { id: heuristic.id, baseline_verified_max_severity: heuristic.verified_max_severity, conditional_verified_max_severity: maximum, possible_max_severity: heuristic.possible_max_severity, remaining_finding_ids: remaining, unknown_ids_unchanged: heuristic.unknown_ids };
  });
  const observed = 100 - 2.5 * heuristics.reduce((sum, item) => sum + item.conditional_verified_max_severity, 0);
  const worst = 100 - 2.5 * heuristics.reduce((sum, item) => sum + item.possible_max_severity, 0);
  projections[platform] = {
    ux_gap: { baseline: { min: baseline.ux_gap.min, max: baseline.ux_gap.max }, conditional_after_all_nine_verified: { min: dimensions.reduce((sum, item) => sum + item.conditional_after_all_nine_verified.min, 0), max: dimensions.reduce((sum, item) => sum + item.conditional_after_all_nine_verified.max, 0) }, observed_coverage_unchanged: baseline.ux_gap.observed_coverage, dimensions },
    nielsen: { baseline: { observed: baseline.nielsen.observed, min: baseline.nielsen.min, max: baseline.nielsen.max }, conditional_after_all_nine_verified: { observed, min: worst, max: observed }, heuristics },
  };
}
save('audit/raw/re-audit/web-semantics/scoring-proposal.json', {
  status: 'PROPOSAL_ONLY_NOT_APPLIED', condition: 'Apply each FAIL-to-PASS promotion only after root verifies the linked approved finding with new evidence; all projections assume all nine approved findings resolved.',
  resolved_if_verified: [...resolved], observation_promotions: proposed.map(item => ({ id: item.id, from: 'FAIL', to: 'PASS', finding_ids: item.evidence, dimension: item.dimension, criterion: item.criterion, baseline_note: item.note })),
  no_existing_ux_gap_observation_for: ['W-S-002', 'W-S-003', 'M-001'],
  policy: ['Keep exact observation IDs, criteria weights, denominators, N/A and UNKNOWN statuses.', 'Leave P2/P3-linked FAIL observations unchanged.', 'Do not add score observations for newly checked dialogs or selectors during this before/after comparison.', 'Nielsen possible severities and uncertainty floor stay unchanged because unknown coverage remains.'],
  projections,
});
console.log(JSON.stringify({ observations: proposed.map(item => item.id), projected: Object.fromEntries(Object.entries(projections).map(([platform, value]) => [platform, { ux_gap: value.ux_gap.conditional_after_all_nine_verified, nielsen: value.nielsen.conditional_after_all_nine_verified }])) }, null, 2));
