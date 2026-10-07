"""Save reviewable diffs against the per-ID working-tree snapshots."""
import difflib
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
groups = {
    'M-001': {
        'change': 'Enforce 48dp control minima; wrap existing header actions below identity at narrow widths; shrink gate mode labels within their target.',
        'anchors': ['apps/mobile/src/components/AppHeader.tsx:24', 'apps/mobile/src/components/PrimaryButton.tsx:94', 'apps/mobile/src/components/ScreenLayout.tsx:57', 'apps/mobile/src/components/SelectField.tsx:20', 'apps/mobile/src/components/ActionDialog.tsx:19', 'apps/mobile/src/components/CodeScanner.tsx:442', 'apps/mobile/src/features/yard/components/YardSlotGrid.tsx:180'],
        'native_status': 'PASS',
        'evidence': ['audit/raw/re-audit/mobile/hit-area-measurements.json', 'audit/screenshots/re-audit/mobile/26-320-gate-light.png', 'audit/screenshots/re-audit/mobile/30-320-picker-light.png', 'audit/screenshots/re-audit/mobile/34-320-logout-dark.png'],
        'limits': ['UIAutomator reports clipped boxes at ScrollView boundaries; these are explicitly PARTIAL_VIEWPORT, not silently counted as target passes. Full boxes are measured in the corresponding scrolled view.'],
    },
    'M-002': {
        'change': 'Separate semantic foregrounds and danger/success button fills; keep dark status foregrounds bright while white destructive labels use a darker fill.',
        'anchors': ['apps/mobile/src/theme/colors.ts:7', 'apps/mobile/src/theme/colors.ts:18', 'apps/mobile/src/components/PrimaryButton.tsx:42', 'apps/mobile/src/components/StatusBadge.tsx:32', 'apps/mobile/src/components/SessionCard.tsx:14', 'apps/mobile/src/components/ScreenLayout.tsx:42'],
        'native_status': 'PASS',
        'evidence': ['audit/raw/re-audit/mobile/contrast-measurements.json', 'audit/screenshots/re-audit/mobile/06-logout-dark.png', 'audit/screenshots/re-audit/mobile/11-container-readiness-light.png'],
        'limits': ['Exact rendered native pairs are measured for success, readiness warning, danger role text and logout fill in both themes. All six StatusBadge variants and selected Gate-Out fill are additionally tested as component fixtures.'],
    },
    'M-003': {
        'change': 'The zero-tab permission fallback explains administrator access and opens the existing authenticated Account route; existing logout confirmation remains in Account.',
        'anchors': ['apps/mobile/src/navigation/MainTabNavigator.tsx:26', 'apps/mobile/src/components/ForbiddenScreen.tsx:26', 'apps/mobile/src/navigation/RootNavigator.tsx:52', 'apps/mobile/tests/priority-accessibility.test.cjs:196'],
        'native_status': 'UNKNOWN_ZERO_TAB_ACCOUNT_UNAVAILABLE',
        'evidence': ['audit/raw/re-audit/mobile/mobile-tests-green.txt', 'audit/screenshots/re-audit/mobile/06-logout-dark.png', 'audit/screenshots/re-audit/mobile/07-logout-light.png'],
        'limits': ['No authorized existing zero-tab account was available. The synthetic permission fixture reaches Account and verifies cancel/confirm logout without network or account creation. Native Account opens and both logout cancel/close paths are verified using the existing account; real logout confirmation was not submitted.'],
    },
}
for finding_id, row in groups.items():
    before_dir = ROOT / 'audit/fixes' / finding_id / 'before'
    patch = []
    snapshots = []
    for before in sorted(before_dir.rglob('*')):
        if not before.is_file():
            continue
        relative = before.relative_to(before_dir)
        after = ROOT / relative
        patch.extend(difflib.unified_diff(before.read_text(encoding='utf-8').splitlines(keepends=True), after.read_text(encoding='utf-8').splitlines(keepends=True), fromfile='before/' + relative.as_posix(), tofile=relative.as_posix()))
        snapshots.append({'file': relative.as_posix(), 'before_sha256': hashlib.sha256(before.read_bytes()).hexdigest(), 'after_sha256': hashlib.sha256(after.read_bytes()).hexdigest()})
    new_test = ROOT / 'apps/mobile/tests/priority-accessibility.test.cjs'
    patch.extend(difflib.unified_diff([], new_test.read_text(encoding='utf-8').splitlines(keepends=True), fromfile='/dev/null', tofile='apps/mobile/tests/priority-accessibility.test.cjs'))
    (ROOT / 'audit/fixes' / finding_id / 'fix.diff').write_text(''.join(patch), encoding='utf-8')
    row['id'] = finding_id
    row['severity'] = 'P1'
    row['source_status'] = 'FIXED'
    row['before_snapshots'] = snapshots
    row['diff'] = f'audit/fixes/{finding_id}/fix.diff'
    row['tests'] = '7 new component fixtures red before production changes; 132/132 total mobile tests pass; mobile typecheck exit0.'
    row['acceptance'] = 'Verified with disclosed native limitation' if finding_id == 'M-003' else 'Source, regression fixture and native measurements pass'

result = {'schema_version': 1, 'date': '2026-10-03', 'scope': 'Approved Phase5 P1 mobile fixes only; P0 gate verified by root before source changes',
          'baseline_preserved': True, 'business_submissions': 0, 'new_real_accounts': 0,
          'shared_diff_note': 'Each diff compares the complete related files with that ID before snapshot. Shared files include both approved M-001/M-002 edits; source anchors above identify each finding responsibility. The new regression file is shared by all three IDs.',
          'verification': {'regression_red': 'audit/raw/re-audit/mobile/regression-red.txt', 'full_mobile_tests': 'audit/raw/re-audit/mobile/mobile-tests-green.txt', 'typecheck': 'audit/raw/re-audit/mobile/mobile-typecheck.txt', 'diff_check': 'audit/raw/re-audit/mobile/mobile-diff-check.txt', 'native_hit_areas': 'audit/raw/re-audit/mobile/hit-area-measurements.json', 'native_contrast': 'audit/raw/re-audit/mobile/contrast-measurements.json', 'device_restore': 'audit/raw/re-audit/mobile/device-restored.json'},
          'fixes': list(groups.values())}
(ROOT / 'audit/fixes/mobile/fix-log.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print('Saved per-ID diffs and mobile fix log.')
