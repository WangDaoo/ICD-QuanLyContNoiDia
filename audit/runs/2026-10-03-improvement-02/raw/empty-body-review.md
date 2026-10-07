# W-N-020 — collection read failure was presented as an empty/no-match result

Verified and fixed on 2026-10-04, Asia/Saigon. Severity P2; category interactive states / loading, error, permission and empty-state truthfulness. Application ownership was limited to MovementOrdersView.tsx and YardView.tsx. No shared utility, API, browser or runtime configuration was changed.

## Reproduction and impact

1. Render the actual view with an empty local array and resourceStatus set to loading, error, forbidden or stale.
2. For Yard, select “Danh sách Vị trí”.
3. Before the fix, Movement displayed “Chưa có Movement Order nào phù hợp.” and Yard displayed “Không có vị trí phù hợp.” for every state. A failed/denied/loading read therefore looked like a confirmed empty result. There was no retry at the empty body. Filtered ready results also lacked a clear-filter recovery.

The valid RED run observed twelve assertion failures and two passing ready-empty preservation cases. The first incomplete Yard fixture is preserved in `empty-body-fixture-diagnostic.txt`; its missing-array errors are not counted as application failures or valid RED evidence.

## Minimal change

| Source | Change |
| --- | --- |
| `apps/web/src/components/MovementOrdersView.tsx:196` | Empty table cell uses the existing CollectionState with resource movementOrders, actual filtered/total counts, and search/context filter information. Clear removes search and returns an explicit container destination to the unscoped list. |
| `apps/web/src/components/YardView.tsx:322` | Empty table cell uses the existing CollectionState with resource yardSlots, actual filtered/total counts, and search/block/status filters. Clear resets those three controls. |

Existing table columns, read/write permissions, rows and backend behavior are unchanged. No duplicate alert is added outside the empty body. Loading, forbidden, error and stale use the existing shared microcopy. Error/stale retains retry; ready empty retains its empty message; ready no-match offers clear and reveals the original confirmed rows.

## Verification

- Snapshot: `raw/empty-body-before/MovementOrdersView.tsx` and `raw/empty-body-before/YardView.tsx`.
- Test: `audit/tools/tests/list-empty-state.test.mjs` runs actual React components under JSDOM, with no backend writes.
- RED: `raw/empty-body-red.txt` — 12 failed, 2 passed for expected semantic differences.
- GREEN: `raw/empty-body-green.txt` — 14/14 passed.
- Consumers: `raw/empty-body-consumers-green.txt` — 97/97 passed, comprising 14 empty-body cases, 56 count cases, 23 business cases and 4 read-only/RBAC cases.
- `raw/empty-body-typecheck.txt`: web typecheck exit 0.
- `raw/empty-body-lint.txt`: both changed views ESLint exit 0, no diagnostics.

Source is frozen after these checks. Root retains responsibility for the browser error/403 case, final whole-source checks, finding ledger and score. This fixture evidence does not establish a native browser PASS or justify changing an unrelated rubric observation.
