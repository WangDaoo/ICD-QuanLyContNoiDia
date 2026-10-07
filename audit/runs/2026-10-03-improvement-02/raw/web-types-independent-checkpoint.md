# Web API/type and independent business checkpoint

Run: `2026-10-03-improvement-02`. Existing dirty source tree and baseline artifacts were preserved. No commits were created. This checkpoint contains no credentials, tokens, API keys, or private payloads.

## Confirmed contract defects and fixes

- `apps/web/src/services/mappers/live-view.mapper.ts:217`: persisted `CANCELLED` inspections retain the terminal status. `ContainerInspection.status` includes `CANCELLED`; existing YardOperations action branches only offer actions for pending/in-progress records.
- `apps/web/src/services/mappers/live-view.mapper.ts:265`: tariff service code and unit retain the arbitrary backend catalogue strings. Rules also preserve optional canonical container type/size restrictions at lines 268-269. Missing/null free days remain absent.
- `apps/web/src/services/mappers/icd-view.mapper.ts:347`: absent/unrecognized Gate Pass states become `UNKNOWN`, never `ACTIVE`. Explicit legacy aliases `ISSUED` and `VOID` remain compatible. Root added the consumer message for UNKNOWN.
- `apps/web/src/services/mappers/api-response.mapper.ts:29`: whitespace numeric input is unavailable. Financial mappings reject it instead of displaying a zero balance, while explicit numeric/string zero remains valid.
- `apps/web/src/services/mappers/live-view.mapper.ts:483`: absent ACK data remains absent. Actual `ACCEPTED`, `REJECTED`, `ERROR`, and `UNMATCHED` values are preserved; no `PENDING` ACK is invented. The outbox API does not include acknowledgements.
- `apps/web/src/services/mappers/icd-view.mapper.ts:191`: yard slot restrictions such as DRY, REEFER, 40RF and custom string codes survive mapping rather than becoming ALL. Backend null remains optional.
- `apps/web/src/services/api/load-list.ts:19`: malformed/present-but-incomplete pagination, missing later-page metadata, invalid page sizes/totals, contradictory page counts and incomplete final row counts reject. Unpaged list envelopes remain supported.
- `apps/web/src/components/yard/yard-operation-form.ts:21`: schedule display and parsing use the shared explicit UTC+7 helpers, independent of browser timezone. Root owns the separate date-only tariff conversion.
- `apps/web/src/context/AppContext.tsx:519`: Gate Out requires boolean `true`. An independent mocked context probe previously accepted the string `"false"` and sent `/gate-out`; the regression now verifies zero writes for false/string/object/missing flags.
- `apps/web/src/context/AppContext.tsx:530` and `apps/web/src/components/BillingView.tsx:118`: shared `services/payment-amount.ts` validates finite positive Number values with at most two decimal places. Invalid amounts and unsupported methods send no request. Billing uses Number without truncation, declares min/step 0.01, preserves an empty draft, and associates its visible error with the input. 12.50 is sent as the exact Number 12.5 and 0.29 remains valid; no rounding is applied.

## RED/GREEN evidence

Raw evidence under `raw/web-types/`:

- `canonical-status-red.txt`: nine expected failures across status, ACK, financial whitespace, yard type and pagination boundaries; `canonical-status-green.txt`: 16/16 passed after the initial fixes.
- `pagination-consistency-red.txt`: the new contradiction fixture failed for missing rejection; `pagination-consistency-green.txt`: 10/10 passed.
- `yard-timezone-red.txt`: browser UTC produced 02:15 instead of the intended Vietnam 09:15; `yard-timezone-green.txt`: 11/11 passed.
- `tariff-restrictions-red.txt`: REEFER was falsely mapped to ALL; `tariff-restrictions-green.txt`: 8/8 passed.
- `gate-out-payment-red.txt`: all four regression tests failed for the proved issues; `gate-out-payment-green.txt`: 4/4 passed with real context calls and Billing DOM input/submit events against isolated request adapters.

The new business boundary test is `audit/tools/gate-out-payment-boundary.test.mjs`. It performs no real server transaction.

## Fresh verification

- All service tests plus the yard form tests: **55 passed, 0 failed**.
- Combined Gate Out/payment, existing business, current-account permissions and tariff Vietnam date regressions: **29 passed, 0 failed**.
- ESLint for services/types/yard form: exit 0, no warnings.
- ESLint for AppContext/Billing/payment helper: exit 0, no warnings.
- `pnpm --filter @icd/web typecheck`: exit 0 after the latest changes.
- Independent AST comparison of **102 internal controller methods with a single Permissions decorator** found zero mismatches with `requiredWritePermission`. An unsupported route returns undefined; authenticated notification self-service routes return null. Existing stale account callback and exact create-permission regressions passed.

## Guarded persisted API reads

The target guard verified API 3001, MySQL 3308, database `icd_ux_audit_20261003_e2e`, the pinned audit Jest server process, and a login session persisted in that exact database. This review used authentication and GETs only. No new business transaction or external delivery was performed.

- Cancelled inspection `2f2a40a0-a8b7-494b-9b30-b932774bbcc8`: backend and mapped status both CANCELLED.
- Four fixture slots: backend and mapped supported type both DRY.
- Fixture tariff units DAY, MOVE and CONTAINER are preserved exactly. Custom codes/units and restricted rules are additionally covered by contract fixtures.
- Paid invoice `afc81472-f75d-4156-8ff7-497496aa1b23`: backend/mapped status PAID; total and paid amounts match.
- Main container visit `52a2b4f6-3020-455e-92d3-6c050657a8d9`: backend/mapped state EXITED. Historical passes preserve USED and CANCELLED.
- Two SENT outbox records have no backend ackStatus, map without ACK status, and preserve canonical payloadSnapshot JSON exactly. The separately queried linked acknowledgement is REJECTED.
- After the stricter pagination fix, the real inspections API returned six distinct records over three pages at pageSize 2.
- `raw/web-types-api/workflows-completed.json` contains 132 passing assertions and completed=true. Its `states.manifest` is a creation-time DRAFT snapshot; the final guarded GET confirms manifest `bc41c663-e15c-4908-a15e-babd0a3710c9` is SUBMITTED. Final reporting should use the persisted state.

The separate `raw/web-types-api/final-persisted-state.json`, verified at `2026-10-03T16:04:10.624Z`, preserves the original workflow artifact and records current guarded GET evidence: manifest SUBMITTED, main visit EXITED, invoice PAID (550000 total, 550000 paid, zero balance), historical passes USED/CANCELLED, handover COMPLETED, and six unique inspections across three pages (two each PENDING/CANCELLED/COMPLETED). All seven persisted-state assertions passed. This metadata file contains no authentication material or private payloads.

This checkpoint verifies the named contracts, permission mapping and regression scenarios. It does not substitute for root's browser/layout checks or broader backend/mobile validation. No remaining proved application defect from this review is left unfixed; the workflow manifest metadata discrepancy is documented above.
