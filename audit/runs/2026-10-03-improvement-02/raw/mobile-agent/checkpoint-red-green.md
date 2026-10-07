# Observed RED/GREEN checkpoint stages

These are summaries of executed Node production-module fixture tests from the tool transcript. They are not native/device observations. Final full command logs are saved beside this file.

| Stage | Observed RED | Subsequent GREEN |
| --- | --- | --- |
| Notification failed filter, booking timezone detail, old profile-marker save | `node --test apps/mobile/tests/improvement-checkpoint.test.cjs`: 0/3 pass, exit1. Old row/pagination persisted; UTC detail was02:30 instead of09:30; newer user marker disappeared. | 3/3 pass after fixes. |
| Null-current-user/same-user cache cleanup | 3/4 pass, exit1; newer profile became undefined after delayed old cleanup. | 4/4 pass with complete profile mutation ordering. |
| Recognized canonical notification presentation | 4/6 pass, exit1; presentation function absent. | 6/6 pass including real list/detail presentation and preservation of custom text/reasons. |
| Late refresh and pending token write | `node --test apps/mobile/tests/session-race.test.cjs`: 0/2 pass, exit1. Request unexpectedly succeeded after logout; token pair ended old-access/new-refresh. | 2/2 pass after API generation and token mutation ordering. |
| Command waiting on stored credential read | 2/3 pass, exit1; one command was sent after invalidation. | 3/3 pass with send-time generation guard. |
| Delayed logout/startup403 cleanup | `node --test apps/mobile/tests/auth-restore.test.cjs`: 12/14 pass, exit1. Old logout forced anonymous; old403 cleanup removed new tokens. | Combined auth/session17/17 pass after reserving both cleanups before awaits and version-guarding completion. |
| Heading line-height | Checkpoint6/7 pass, exit1; actual Card style13/19 exceeded1.3. | 7/7 pass after named heading tokens; original font/weight preserved. |
| SessionCard role presentation | Checkpoint7/8 pass, exit1; actual render contained ADMIN/YARD_STAFF. | 8/8 pass with shared display map; custom code kept neutral context. |

The final full mobile run is175/175 PASS with0 failed/cancelled/skipped, followed by typecheck exit0 and application-source ESLint exit0. Existing tests remain retained; no native PASS follows from these results.
