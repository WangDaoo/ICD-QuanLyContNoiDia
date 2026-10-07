# Web business independent checkpoint — 2026-10-03

Source changes are frozen after the final GREEN run. This checkpoint records source review and isolated React/DOM tests; the root agent owns the final ledger, release decision, browser checks, API lifecycle evidence and build. No baseline, historical audit evidence, database, score, commit or pull request was changed by this checkpoint.

## Fresh results

| Check | Result | Evidence |
| --- | --- | --- |
| Independent residual regressions | 11 passed, 0 failed | `raw/web-business/independent-green.txt` |
| Business + navigation + independent + read-only regressions | 44 passed, 0 failed | `raw/web-business/final-full-regression.txt` |
| Web typecheck | exit 0 | `raw/web-business/final-typecheck.txt` |
| App and components ESLint | exit 0, no diagnostics | `raw/web-business/final-lint.txt` |
| Native Back/Forward, dialog focus, Tab/Shift+Tab, Escape | Root-run PASS artifact inspected; no transaction submitted | `raw/browser/navigation-draft-runtime.json`, `raw/browser/navigation-*.png` |

The combined run contains 23 business tests, 6 navigation tests, 11 independent tests, and 4 read-only page tests. The prior nine audit regressions remain under root verification because some historical harnesses write to the historical evidence directories. They were not rerun directly from this checkpoint.

## Findings and final source state

| Finding | Status | Source and change | RED evidence |
| --- | --- | --- | --- |
| Dirty/pending browser POP bypassed the internal navigation guard; route changes removed the form | FIXED, source/fixture; sampled native behavior PASS in root evidence | `App.tsx:86` uses the supported React Router data-router `useBlocker` for business destination PUSH/POP. `ModalOverlay.tsx:25` guards only an active native dialog. `ModalOverlay.tsx:69` suspends the native top layer when its kept-mounted view is hidden and restores the same fields and focus on return. | `raw/web-business/navigation-red-valid.txt`: 5 baseline failures, 1 baseline passing case |
| Existing Gate Pass destination also opened a new issue form | FIXED, source/fixture | `GatePassView.tsx:71` prioritizes `targetGatePassId`; visit-only auto-open requires explicit `targetAction='create'`. `App.tsx:126` translates the existing visit-only shortcut into explicit create intent. | `raw/web-business/independent-expanded-red.txt` |
| Newly refreshed expired pass used the initial render clock, retaining ACTIVE status/QR/exit UI | FIXED, source/fixture | `useGatePassExpiry.ts:4` reads the current clock on render and retains a cancellable deadline timer. Dataset changes replace the timer. Expired status removes the token QR and Gate-out action. | `raw/web-business/independent-expanded-red.txt` |
| Same-user permission downgrade left an existing role editor writable | FIXED, source/fixture | `UsersRolesView.tsx:217` checks current `roles.manage` at render; command handler at `:229` checks it again and guards re-entry. The downgrade fixture sends zero commands. Server/context authorization remains a separate required guard. | `raw/web-business/independent-expanded-red.txt` |
| Container detail did not guard pending inline writes against navigation/closing | FIXED, source/fixture | `ContainersView.tsx:99` guards closure. Detail `ModalOverlay` receives pending at `:481`. Close, tabs and context-changing detail buttons disable while pending. The delayed fixture submits once, refuses accepted leave, and retains the detail. | `raw/web-business/container-pending-review-red-valid.txt` |
| Container detail response notice was gated by an impossible condition; page-level saved/refresh-failure feedback disappeared after create closed | FIXED, source/fixture | `ContainersView.tsx:585` shows the notice inside the retained detail; `:294` shows it after a create/detail closes. Rejected inline values stay intact; successful create with failed refresh reports the saved outcome and does not imply another save is needed. This review caught and corrected a notice-placement regression from the earlier component edit. | `raw/web-business/container-feedback-red.txt`, `raw/web-business/container-saved-refresh-red-valid.txt` |
| Read-only Container page lacked permission context | FIXED, source/fixture | `ContainersView.tsx:281` uses root's `ReadOnlyNotice` with actual Container and related movement, gate, hold, yard and billing write permissions; read-only fixture retains viewing/filtering and has no visible create invitation. | Root's `web-rbac-regression.test.mjs` acceptance, then fresh 4/4 GREEN |
| Truck target auto-open repeated on a collection refresh after dismissal | FIXED, source/fixture | `TruckVisitsView.tsx:36` consumes a resolved target once; a missing target remains eligible to resolve after late data arrives. Refresh cannot reopen or overwrite a handled intent. | `raw/web-business/truck-refresh-review-red.txt` |

The six residual cases in `independent-expanded-red.txt` failed for the intended assertions before the fixes. Container pending/feedback and Truck refresh were separately observed RED before their fixes. The late-target Truck case is an additional preservation regression and already passed before intent consumption. Initial malformed fixtures remain diagnostic artifacts; they are not counted as valid RED evidence.

## Exact navigation semantics and limits

- An active dirty shared dialog asks once before leaving its business destination. Cancelling stays on the current URL with the same fields; accepting moves while retaining the mounted form in memory.
- An active pending shared dialog refuses leaving. Hidden dialogs do not guard navigation or reload and do not leave a native top layer over the active page.
- A same-path filter/section/selection query replacement with unchanged business context does not close or prompt the dialog. Changing the actual routed visit/pass/handover context still runs the leave guard.
- Back/Forward restores the retained dialog and last focused enabled field. Auth changes clear prior-user views/storage; component keys include the user id. Drafts and credentials are not written to URL/session storage.
- Full document unload/reload uses the browser's native `beforeunload` prompt. Memory drafts are scoped to the mounted authenticated app; persistence through a confirmed full reload is not claimed.
- Existing custom Yard dialogs retain their own focus/pending behavior and kept-mounted state. This checkpoint does not claim a new shared navigation guard or exhaustive native runtime coverage for every custom overlay.
- Gate Pass readiness remains fail-closed until all seven backend checks are true and no blockers remain. Missing/failed readiness stays distinct from a backend business block, retry is explicit, and late results cannot enable another target.
- Notifications were reviewed against the canonical read/history source and root's current permission/session boundary. No additional notification defect was established in this checkpoint; pending/read/empty/forbidden behavior remains covered by root's fixtures and runtime evidence.

## Browser acceptance script/checklist for repeat runs

Use an authorized account and a fresh browser session. These steps require no business write:

1. Open Master Data from another app route; open create, type name/email, and record the current URL/field focus.
2. Press native browser Back and cancel the leave choice. Confirm URL, field values and focus are unchanged.
3. Press native Back again and accept. Confirm the previous page is usable, no native dialog is open over it, and its scroll container is unlocked.
4. Press native Forward. Confirm the original dialog, fields and focus return. Tab and Shift+Tab wrap within the dialog; Escape closes it and returns focus appropriately.
5. Confirm a filter-only replacement does not destroy the open dialog, and a hidden draft does not block active-page navigation.
6. For a delayed pending write, use the isolated fixture or a root-controlled intercepted rejection rather than sending an unintended live transaction. Confirm one command, disabled controls, blocked Back/close, retained input and a visible rejection after settlement.
7. Open an existing Gate Pass URL with both `gatePassId` and its linked `visitId`; confirm it selects the existing pass without starting issue. A visit-only URL starts issue only with `action=create` and create permission.
8. Inspect a refreshed expired pass: no token QR or Gate-out action. Dismiss a Truck create target, refresh data, and confirm the form does not reopen.

Root already executed steps 1–4 in the inspected native evidence. The newly fixed Gate Pass, permission downgrade, Container pending/feedback and Truck refresh cases have source/fixture evidence here; this document does not relabel them as native-runtime VERIFIED.
