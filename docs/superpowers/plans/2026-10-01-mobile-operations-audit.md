# Mobile operational audit and repair

Goal: audit every mobile route, supporting form/dialog and practical business action against the canonical backend, capture evidence, repair verified defects and add missing operational flows while retaining the approved MobileTerminalView visual system.

Architecture: React Native TSX remains the mobile client. Backend permissions and state transitions decide commands. Dedicated local QA records are used for workflow writes; existing business data is not reset. Screens and dialogs use compact light/dark components. No simulated successful commands, photos or external-partner operations.

- [x] Inventory routes, specifications, API contracts, and runtime; delegate independent gate/yard/support audits.
- [x] Gate: multi-container truck ARRIVED/IN_PROGRESS; scheduled truck arrival; multi-result selection; context blockers; confirmation; signed pass rejection/recheck; final committed success; expiry consistency.
- [x] Yard: full operation list, filters and detail; start/complete/cancel dialogs; manual slot validation; booking/inspection forms; concurrency locks/rechecks.
- [x] Support: complete container summary/holds/history/readiness/handover; notification filters/detail/read-all; work queue booking/routing; authentication refresh failure distinctions.
- [x] Shared: reusable accessible ActionDialog; searchable selection popup; account/permissions/logout dialog; explicit backend connection state; navigation wiring.
- [x] Capture the main and secondary routes and operational dropdown, confirmation, validation/error, empty/result and success states available on Expo Web in `test-artifacts/2026-10-01-mobile-operations-audit`; record untested device/state branches in REPORT.md.
- [x] Execute dedicated backend fixtures through mobile; assert durable states and refusal cases with API reads. Two Gate-outs, multi-container Gate-in, assignment, movement completion/cancellation, inspection PASS/HOLD and booking completion/cancellation have live evidence.
- [x] Run regression tests, typechecks, backend tests/build, Expo export and independent final review. Deliver screenshot gallery and exact remaining device/backend limits.

Final verification (02/10/2026): 78 API tests in 16 suites; 50 mobile tests; mobile typecheck/full source lint and Expo Web export; API typecheck/targeted lint and fresh runtime build. Live durable verification covers 45 API checks and 57 invariants. The local gallery includes 100 screenshots. The gallery browser preview was denied; syntax and file links are validated. Android/iOS camera, attachment API, inspection HOLD resolution and external-company binding limits remain explicit in the audit REPORT.md.

Initial reproduced/code-traced defects: mobile preview service stopped after earlier session; gate-in rejects IN_PROGRESS truck; gate-out reports read-after-write failure as command failure; no yard cancellation; no manual /yard/check; incomplete container detail and notifications; refresh error handling loses/retains sessions incorrectly; concurrent movements lack assignment-equivalent locks.
