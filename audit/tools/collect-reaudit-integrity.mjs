import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
const baseline = read('audit/raw/baseline/source-hashes.json');
const changed = baseline.filter(x => sha(x.path) !== x.sha256).map(x => ({ path: x.path, before: x.sha256, after: sha(x.path) }));
const production = changed.filter(x => !x.path.includes('/tests/') && !x.path.endsWith('.test.ts') && !x.path.endsWith('.test.tsx'));
const forbidden = changed.filter(x => !(x.path.startsWith('apps/web/src/') || x.path.startsWith('apps/mobile/src/') || x.path.startsWith('apps/mobile/tests/')));
const output = { baseline_files: baseline.length, changed, production_changed: production.length,
  baseline_unchanged: baseline.length - changed.length,
  protected_source_or_config_changes: forbidden,
  policy: 'Only approved UI source and regression tests may differ. Application package/config and shared backend contracts remain unchanged.',
  status: forbidden.length ? 'FAIL' : 'PASS' };
fs.writeFileSync('audit/raw/re-audit/source-integrity.json', JSON.stringify(output, null, 2));

for (const [id, files] of Object.entries({
  'W-S-020': { 'App.tsx': 'apps/web/src/App.tsx', 'types.ts': 'apps/web/src/types.ts', 'PartnerManagementView.tsx': 'apps/web/src/components/PartnerManagementView.tsx' },
  'W-S-016': { 'AppContext.tsx': 'apps/web/src/context/AppContext.tsx', 'ContainersView.tsx': 'apps/web/src/components/ContainersView.tsx', 'GatePassView.tsx': 'apps/web/src/components/GatePassView.tsx', 'Header.tsx': 'apps/web/src/components/Header.tsx', 'DashboardView.tsx': 'apps/web/src/components/DashboardView.tsx', 'YardSiteMap.tsx': 'apps/web/src/components/yard/YardSiteMap.tsx', 'yard-model.ts': 'apps/web/src/components/yard/yard-model.ts' },
})) {
  const dir = `audit/fixes/${id}/after`;
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, file] of Object.entries(files)) fs.copyFileSync(file, path.join(dir, name));
}
console.log(JSON.stringify({ status: output.status, baseline_files: baseline.length, changed: changed.length, production_changed: production.length, forbidden: forbidden.map(x => x.path) }));
if (forbidden.length) process.exitCode = 1;
