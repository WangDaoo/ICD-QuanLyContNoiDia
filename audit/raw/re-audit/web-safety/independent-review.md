# Independent W-S-016 and W-S-020 review

Reviewed scope: critical per-visit Holds and Gate Pass availability only. The
manifest, role and handover partial-read subcases remain P2 and were not changed.
No application source was edited by this reviewer.

W-S-016 acceptance checks:

- Initial Holds and Gate Pass GET failures: both arrays may be empty, but both
  statuses are unavailable, apiError identifies both paths, and both notices
  display role=alert. Dashboard does not render the reassuring zero-hold badge.
- Fulfilled empty GET responses: statuses are ready, arrays are truly empty,
  and critical-data notices are absent.
- Gate Pass transient failure after successful load: old records remain as
  reference data with unavailable status. Repeating failure does not duplicate
  retained rows. A 403 response removes old records and marks forbidden. A
  successful empty retry clears the stale data and marks ready.
- Later-page Holds failure: incomplete fresh rows are discarded; previous rows
  remain with unavailable status and path-specific error.
- Unknown per-visit key: explicit visit notice is shown. Yard STATE appearance
  uses unverified gray, never the green in-yard appearance.

One source defect found and corrected by the root agent during this review:
aggregate notices/counts considered an empty status map complete even when a
visit existed. CriticalDataNotice, Header, DashboardView and YardSiteMap now
check expected container visit IDs. Two SSR fixtures verify that an existing
visit with a missing status produces a warning and does not show zero holds as
verified. Root owns the application changes; this reviewer only added tests.

Code-only robustness observation, not a finding:
calling context.login directly while an older refresh is pending can leave the
new session data empty until explicit refresh. Prior protected records are
correctly cleared, and explicit refresh recovers. This direct call sequence is
not exposed by the current UI: WebLoginView is shown only when unauthenticated,
and logout clears pendingRefresh. Realistic UI reachability and runtime impact
are UNKNOWN. No severity is assigned and no new baseline finding is added.
The same underlying pendingRefresh/login sequence exists in the pre-fix snapshot
at audit/fixes/W-S-016/before/AppContext.tsx lines 348, 412, 431 and 433.

W-S-020 independent checks:
Partner log SSR renders only requestBodyRedacted/responseBodyRedacted. Both raw
request and raw response sentinels remain absent. Redacted text containing an
img/onerror string stays pre text and creates no img element. Nested JSON with
false, zero and arrays retains its values. Source review confirms the keyed
ViewErrorBoundary wraps view content while the application shell and navigation
remain outside. Recovery from the Partner-log route changes the key and mounts
the dashboard. The root owns native runtime recovery verification.

Evidence:

- audit/tools/safety-independent-review.test.mjs: nine executable cases, including
  seven W-S-016 acceptance cases, one code-only observation, and one independent
  W-S-020 redaction/escaping case.
- audit/raw/re-audit/web-safety/independent-review-tests.txt: 9 passed, 0 failed.
- audit/raw/re-audit/billing/green.txt: 4 payment guard cases still pass after
  ModalOverlay labels and explicit Tab wrapping integration.

Run: node --import ./audit/tools/runtime/node_modules/tsx/dist/loader.mjs --test
audit/tools/safety-independent-review.test.mjs

Limits: provider fixtures replace apiClient.get and authService methods with
in-memory responses and block fetch. No real API writes or payment requests are
made. SSR checks do not verify browser top-layer behavior, accessibility-tree
output or assistive technology. The root agent owns native browser/CUA checks.
Passing the observational race case records its actual direct-method behavior;
it is not evidence that every possible session race is resolved.
