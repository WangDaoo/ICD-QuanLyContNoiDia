# ICD UI/UX audit

Baseline: [2026-10-03-report.md](./2026-10-03-report.md).

This directory contains audit evidence and tools only. Application fixes require approval of the report's concrete P0/P1 list. No business transactions were submitted during the baseline audit.

- `manifest.json`: stack, snapshot, pinned tools and scope.
- `coverage.json`: observed cases plus explicit UNKNOWN/N/A boundaries. A capture PASS is not complete UI or WCAG conformance.
- `findings.json`: stable finding IDs, severity, source anchors, proposed changes and verification cases.
- `scores.json`, `rubric-observations.json`: reproducible scoring ledger.
- `raw/baseline/`: command logs, browser measurements, native hierarchy, production Login Lighthouse runs and validation results.
- `screenshots/baseline/index.md`: links to all preserved screenshots.
- `fixes/priority-plan.json`: proposed priority order and approval state.

The locally installed tool versions and Git commit hashes are in `tool-manifest.json`; runtime dependencies are isolated under `tools/runtime`. Lumen is reference-only. Tamagui is not used.

`tools/finalize-audit.mjs` composes this baseline from the captured evidence. **It is not a new audit runner:** do not rerun it after application fixes and present stale snapshots as re-audit evidence. Re-audit requires fresh measurements, the same rubric/observation IDs and a new dated report. Preserve the baseline unchanged after handover.

Read-only artifact validation:

```powershell
node audit/tools/verify-artifacts.mjs
python audit/tools/verify-native-contrast.py
```

Phase5/6 have not run. Android size1080×1920, density420 and fontscale1.0 were independently checked after restoration. The audit's own preview4173 was stopped. Original browser tabs and existing local services remain in place.
