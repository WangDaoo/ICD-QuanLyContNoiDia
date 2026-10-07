# Independent web observation review and scoped fixes

Reviewed on 2026-10-03–04, Asia/Saigon. The root agent owns the score, browser session, final ledger and release decision. This review did not promote observations, alter rubric weights, write backend transactions, or operate CUA.

## Current UNKNOWN observations

The score snapshot inspected at the start of this review contains ten web UNKNOWN observations. None warrants a blanket PASS from source alone.

| Observation | Source or existing evidence | Exact next measurement |
| --- | --- | --- |
| web-D1-letter_spacing-1 | Existing browser row records contain computed letter spacing. A reproducible scan of 95 admin snapshot variants found 5,635 rows, including 281 uppercase rows at 0.3/0.6px, and 138 heading rows at normal/−0.35/−0.4px. These include repeated/earlier snapshot variants, not 95 unique coverage cases. Login uses tracking-tight at WebLoginView.tsx:59; supporting uppercase labels use tracking-wider. | Read computed font size and letterSpacing for visible h1–h6 and uppercase nodes on the final main screens and open overlays. Match each sample to a source role. Add missing overlay/header variants; do not infer all roles from one heading. |
| web-D1-spacing_rhythm-2 | index.css:19 defines a .25rem unit. Tailwind half-step utilities still occur, such as px-2.5/py-1.5 and gap-1.5. Source inventory proves token usage exists, but does not prove every effective padding/gap follows a 4px grid. | Capture computed margin/padding/rowGap/columnGap for actual visible sections and control groups at 320/375/768/1440px and dialogs. List non-grid values and any documented technical exception. |
| web-D1-margin_padding-2 | Shared sections mostly use p-4/p-5/p-6; overlay and responsive variants differ. | Compare the same role across screens and narrow dialogs. Record effective values, not just utility strings. |
| web-D2-hover-2 | Hover utility classes occur throughout components. This is not a hover test. | Exercise visible enabled primary/secondary/icon-only/navigation/list controls with the supported CUA hover action, capture before/after computed color/background/border/shadow, and preserve focus afterward. Selected state does not substitute for hover. |
| web-D2-active-1 | index.css:37 specifies brightness(.92) for enabled buttons and links. | Use actual pointer-down or an explicitly supported pressed interaction; read the filter while :active matches. Selected aria-pressed alone is insufficient. |
| web-D2-timing-1 | index.css:20 and :36 specify 150ms transitions. The locked observation requires click-to-feedback p95; this is a separate measurement from CSS transition duration. | Record at least 20 input→visible pending/feedback measurements per representative navigation, filter, dialog, selection and safe submit group. Retain both CSS duration and p50/p95, without treating Lighthouse TBT as interaction time. |
| web-D2-easing-1 | index.css:36 uses ease-out; reduced motion override at :55 uses .01ms. Spinner animations have a distinct continuous progress purpose. | Read computed duration/timing-function for actual controls, including div transitions and overlays. Verify reduced-motion behavior separately. A CSS declaration alone does not prove all animations. |
| web-D3-above_fold-2 | Seven synthetic role accounts now exist; historical absence of accounts is no longer the reason for the gap. | Confirm task priority with actual role users or a documented business-role acceptance mapping, then measure the prioritized task/action at the supported viewport. Merely logging in does not confirm priority. |
| web-D4-initial-1 | App.tsx:158 has operational loading UI; lazy view fallback at :284 exists; ResourceContent gates ready/stale sections. | Capture authenticated initial states while real reads are delayed 1s and 5s through the supported test mechanism, including role-restricted sections; prove no false zero and no blank main region. Settled screenshots are insufficient. |
| web-D4-progressive-1 | Resource states update per request, but the realistic sequence was not timed for every initial view. | Delay independent reads unequally, timestamp section availability, verify a ready section appears while another remains pending, and retain failed/stale section recovery. |

The source declaration of a state and measured runtime execution are separate forms of evidence. Preserve the existing observation IDs and denominator; score only the criterion that the evidence actually establishes.

## Fixed explicit handover destination defect

Root cause: HandoversView originally resolved an unavailable targetHandoverId using `handovers[0]`. A stale or invalid URL therefore displayed an unrelated entity and could publish it. The RED fixture clicked “Sẵn sàng Bàn giao” for `missing-target` and observed publishHandover('handover-other').

- Source: `apps/web/src/components/HandoversView.tsx:48`–`:65` now resolves explicit target strictly; no fallback to another entity.
- Loading/error/forbidden/not-found presentation and retry/list recovery: `HandoversView.tsx:556`–`:589`.
- Choosing another list entity updates its canonical handover destination at `HandoversView.tsx:301`.
- Unscoped initial selection remains unchanged. A late arriving target resolves after loading. No backend/API contract was changed.
- Snapshot: `raw/handover-target-before/HandoversView.tsx`, SHA256 `68E4303CAD91F63B1AB8F10F039F50549C6798C3567A6C9AC564B6E0FF786AA3`.
- RED: `raw/handover-target-red.txt` — six expected failures, one preservation case passed.
- GREEN: `raw/handover-target-green.txt` — 7/7 passed.
- Consumer GREEN: `raw/handover-target-consumers-green.txt` — 41/41 passed.
- Typecheck and lint: `raw/handover-target-typecheck.txt`, `raw/handover-target-lint.txt`, both exit 0.
- Root later confirmed the strict destination in the actual browser. This review itself does not claim browser coverage.

## W-N-016 / P2 — unconfirmed list headers invented zero counts

Root observed a real synthetic GET /api/containers 403 after a populated list. The data was correctly removed, but headers still asserted “Tổng cộng: 0 containers” and “Hiển thị 0 containers”. Similar direct counts existed in other views.

The shared `ConfirmedResourceValue` at `apps/web/src/components/CollectionState.tsx:4` shows its value only when every declared resource is ready or stale. Loading/error/forbidden use the neutral text “Chưa xác nhận số lượng”. Stale values retain the previous count with an explicit “(dữ liệu đã tải)” suffix. It adds no alert or retry; existing CollectionState retains that responsibility. If a resource has not reported its status during global loading, it is unconfirmed. A ready resource remains confirmed while an unrelated resource loads.

| View | Count presentation fixed | Evidence anchor |
| --- | --- | --- |
| Containers | Total and filtered headers | ContainersView.tsx:268, :339 |
| Truck Visits | Filtered summary | TruckVisitsView.tsx:118 |
| Handovers | Filtered summary | HandoversView.tsx:274 |
| Audit Log | Total header | AuditsView.tsx:35 |
| Partner API Log | API-call count | PartnerManagementView.tsx:307 |
| Work Queue | Urgency counts, total, filtered count; completion-style empty card gated until list confirmed | WorkQueueView.tsx:70, :130, :138 |
| Billing | Invoice, service-order and tariff tabs | BillingView.tsx:228, :239, :250 |
| Yard list | Filtered/total footer | YardView.tsx:340, after the W-N-020 empty-body insertion |

Manifest, Gate Pass, Master Data, Users/Roles and EDI were inspected. Their main headers do not directly display the affected numeric list aggregate, so no redundant wrapper was added. Movement Orders has no direct header aggregate; its pending eligibility number depends on container/order data and is a separate business availability review.

- Snapshot: ten inspected source files under `raw/count-before`; MovementOrdersView was snapshotted but not modified.
- Actual-component RED: `raw/count-red.txt` — 22 expected failures, 15 preservation cases passed.
- Yard additional RED: `raw/count-yard-red.txt` — three failures from the incorrect 0/0 footer.
- Stale indication RED: `raw/count-stale-red.txt` — two missing-label failures; one later fixture expectation was broadened only to accept the explicit stale indication on an inactive Billing tab, which has no active body CollectionState.
- Final regression: `audit/tools/tests/resource-count.test.mjs` — 56 count/availability cases across actual components and the shared helper.
- Final combined GREEN: `raw/count-consumers-green.txt` — 101/101 passed: 56 count cases, 7 handover cases, 23 existing business cases, 11 independent cases and 4 read-only/RBAC cases.
- Typecheck/lint: `raw/count-typecheck.txt` and `raw/count-lint.txt`, exit 0.
- Preserved cases: real ready zero, filtered zero with one nonmatching ready container, stale zero/nonzero, ready count while other requests load, and dependency-aware availability.

Application changes are limited to CollectionState and the eight listed count consumers. AppContext, App, YardOperations and the API client were not modified by W-N-016. No database write was performed by these tests.

## Follow-up and remaining candidates

- Root authorized a separate W-N-020 follow-up for Movement/Yard empty bodies. The candidate was confirmed with 12 valid RED failures and fixed using existing CollectionState at MovementOrdersView.tsx:196 and YardView.tsx:322. Fourteen named cases and 97 consumer cases pass; see `raw/empty-body-review.md` for snapshot, exact scope and logs. Native browser coverage remains root-owned.
- Custom YardOperations OperationDialog only guards Escape/backdrop while pending and lacks the shared navigation-request/hidden-suspension protocol. The earlier Back/dirty candidate was not implemented: root superseded that ownership with the count-only task and explicitly excluded YardOperations. Keep its navigation acceptance pending.

Source is frozen after the GREEN run. Root should perform the real 403/retry browser case and final build/whole-source verification before promoting W-N-016 or any runtime observation.
