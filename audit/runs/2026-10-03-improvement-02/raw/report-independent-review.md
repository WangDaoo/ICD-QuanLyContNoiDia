# Independent checkpoint review — improvement02

Scope: read-only review of the generated report, generator, scores/findings/ledger/coverage and linked evidence. No application code was changed. This review does not establish runtime, Android native, speech or timing acceptance.

## Recomputed results

| Platform | UX Gap minimum–maximum | Nielsen observed / uncertainty | Observation coverage |
|---|---:|---:|---:|
| Web | 70.4091–100 | 100 / 0–100 | 80% |
| Mobile | 60.5530–100 | 45 / 0–45 | 68% |

These values agree with `scores.json`. The target95 is not met by the verified minimum. Nielsen45 conservatively retains severity for source-fixed findings pending native acceptance; it does not mean the old defect was reproduced in the changed source.

## Checks passed

- All104 observation IDs, dimensions, criteria, weights, applicability and criterion observation membership match the baseline. Every criterion count, bound, weighted dimension/total and coverage fraction independently recomputes. All ten heuristic totals independently recompute.
- Findings contain38 `VERIFIED` scoped records and13 `FIXED` native-pending records. All51 current source anchors/snippets match the actual source line. All finding-linked raw files, review diffs and51 fix logs exist. Ledger statuses match findings.
- All137 unique local links in the reviewed report resolve to existing files. All declared generator evidence paths exist; none are currently silently omitted by `existing()`.
- Seven protected historical files match the recorded checkpoint SHA256. Root `audit/scores.json` and `audit/findings.json` also byte-match the baseline copies. This is integrity against the recorded artifacts, rather than independent proof of every action before the checkpoint was recorded.
- No configured secret, UI test password, JWT-shaped credential or Bearer credential was detected in the report, directly linked text, or385 current-run raw text artifacts. Private `.env.local` was read only for comparison and its values were not emitted. Binary images were not inspected for secrets by this text scan.
- Raw final logs report web123+source80+billing4 and mobile175 tests passed, with zero failures.
- QR decode evidence explicitly passes against the backend token SHA256, stores no token text, and records the synthetic test pass subsequently `CANCELLED`.

Detailed calculation/check evidence: `report-independent-review-data.json` in this directory.

## Report corrections recommended

| Priority | Evidence | Correction |
|---|---|---|
| P2 audit quality | `coverage-checkpoint.json:unknowns` U-01/U-04/U-05/U-06/U-08/U-09 | Replace stale reasons saying no test users/writes, no axe/320px or no fixtures. Retain UNKNOWN only for the actual untested role/overlay/native/network cross-product, with accurate current reasons. |
| P2 audit quality | Report scoring section | Add the requested ten-heuristic table. Include conservative severity, uncertainty and finding/UNKNOWN IDs per platform. Avoid presenting observed100 as verified full-coverage acceptance. |
| P3 audit quality | Report Top10 item W-S-009 | Remove the now-completed QR decode item from pending priorities, or mark it complete and substitute another actual pending verification. |
| P3 provenance | `scores.json`, `web-D3-headings-2` | Its promotion currently links generic resource/availability regression logs. Add `raw/browser/axe-dashboard-final.json` and the actual DashboardView h2 source anchors, which directly demonstrate the repaired hierarchy. |
| P3 provenance | W-S-004 / `web-D4-indicators-3` | The description claims real browser save evidence while the linked evidence is only the component fixture log. Add `raw/browser/master-data-save-persisted-375.json` and the associated capture/trace. Keep full mutation/role/network runtime matrix explicitly pending. |

No score calculation mismatch, broken source anchor, missing current evidence or configured-secret leakage was found in this checkpoint. Native verification and full runtime coverage remain blocking acceptance of95, as the report already states.
