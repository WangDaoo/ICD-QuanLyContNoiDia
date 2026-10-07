# Mobile source checkpoint - 2026-10-03

Compared current `apps/mobile` source with the immutable `source-before` snapshot, inspected the implementation, and ran production-module regression fixtures. This checkpoint is source/test evidence. It does not establish native acceptance or change the baseline findings/score.

## Fresh verification

- `pnpm --filter @icd/mobile test`: **175/175 PASS**, exit 0. The original 132 tests are retained.
- `pnpm --filter @icd/mobile typecheck`: exit 0.
- `pnpm exec eslint apps/mobile/src apps/mobile/App.tsx apps/mobile/index.ts`: exit 0. This lint command covers application source/entry points, not the Node fixture suite.
- AST/SHA256 snapshot measurement: 58 changed files, 11 heading declarations, 42 native control declarations, 216 remaining numeric style literals. Remaining literals are an inventory, not automatic rule failures.
- Logs: `raw/mobile-agent/checkpoint-mobile-tests.log`, `checkpoint-typecheck.log`, `checkpoint-lint.log`; snapshot details: `raw/mobile-agent/static-measurements.json`.

## Approved findings inspected

All source anchors below are relative to the repository root. Native acceptance remains **UNKNOWN** for every row that depends on rendering, interaction, or announcements.

| Finding | Verified source behavior and anchor |
| --- | --- |
| M-004 | Shared header independent action gap 8dp and 48dp minimum targets: `apps/mobile/src/components/AppHeader.tsx:50`, `:128`; fields/chips: `apps/mobile/src/components/ScreenLayout.tsx:60`. Header/tab fixtures inspect these dimensions; actual native hit bounds remain unknown. |
| M-005 | Compact header at narrow width/large font, full role/title wraps: `AppHeader.tsx:26`; responsive full tab labels and keyboard hiding: `apps/mobile/src/navigation/ResponsiveTabBar.tsx:14`. No fixture proves absence of clipping on a device. |
| M-006 | Operational enum display map: `apps/mobile/src/presentation/labels.ts:1`; recognized canonical notification titles/bodies localized in list/dialog: `apps/mobile/src/features/notifications/notification-presentation.ts:5`, `screens/NotificationsScreen.tsx:63`; SessionCard known role labels use the same map: `apps/mobile/src/components/SessionCard.tsx:20`. Custom notification text, reasons and unknown types remain verbatim; unknown role codes retain neutral context. |
| M-007 | Neutral survey copy; severity controls and submitted severity only for DAMAGE_SURVEY: `apps/mobile/src/features/yard/screens/SurveyHomeScreen.tsx:89`, `:137`. |
| M-008 | Independent history loading/error/loaded state, retry, stale previous rows, successful-load-only empty state; request tickets reject late responses after blur: `SurveyHomeScreen.tsx:39`, `:54`, `:63`, `:193`. |
| M-009 | Actual backend unreadCount rendered, unknown on failed loads; old rows and pagination cleared before filter loads: `apps/mobile/src/features/notifications/screens/NotificationsScreen.tsx:36`, `:65`. |
| M-010 | Native date/time controls, separate cancel/accept paths: `apps/mobile/src/components/BookingDateField.tsx:14`; strict Vietnam wall-time parser/serializer: `booking-date.ts:1`; detail readback explicitly Vietnam UTC+7: `apps/mobile/src/features/yard/screens/YardOperationDetailScreen.tsx:67`. Native picker presentation remains unknown. |
| M-011 | SYSTEM default, persisted LIGHT/DARK/SYSTEM, serial writes and bootstrap withholding: `apps/mobile/src/theme/ThemeProvider.tsx:10`, `:29`, `:36`. |
| M-012 | Per-field survey errors clear when their filled values become valid; server failures remain distinct: `SurveyHomeScreen.tsx:45`, `:122`, `:131`. |
| M-013 | Shared header/layout use named dimensions, spacing and typography. Heading correction preserves font/weight: sectionHeading 13/16=1.231, compactHeading 11/14=1.273, h3 16/20=1.25: `apps/mobile/src/theme/typography.ts:14`, `:19`, `:24`; actual Card style: `ScreenLayout.tsx:58`. |
| M-014 | Actual screen/card/dialog/empty/error headings have header semantics: `AppHeader.tsx:120`, `ScreenLayout.tsx:29`. Props and source do not prove spoken TalkBack behavior or focus order. |

## Offline, permissions, links and pending work

- Cache partitions include user/API/ICD; TTLs are WorkQueue 5m, viewed container 10m, profile 30m. Partition mutation queue orders writes/clear, rejects pre-clear reads and preserves newer values during expired cleanup: `apps/mobile/src/storage/read-cache.ts:5`, `:11`, `:32`, `:37`. Profile marker and profile record mutations are serialized together: `read-cache-store.ts:11`, `:20`, `:39`.
- Queue/container fallback only follows network TypeError, not 403/503; saved timestamps/stale notices are rendered. Cached readiness is excluded and cached assignment actions hidden: `apps/mobile/src/features/work-queue/screens/WorkQueueScreen.tsx:62`; `apps/mobile/src/features/containers/screens/ContainerDetailScreen.tsx:74`, `:79`.
- Health failure is unknown; actual read failure confirms offline. Mutations wait for fresh server permissions, with no offline queue/replay: `apps/mobile/src/services/api/connection-gate.ts:32`, `:39`, `:42`; `api-client.ts:135`. Reconnect 403 clears the local session. API errors and retries are covered with fixtures; native connectivity remains unknown.
- Allowed Expo/custom links contain entity IDs only, reject credentials/query/hash/unsupported destinations, and re-check current permissions after auth/navigation readiness: `apps/mobile/src/navigation/deep-links.ts:10`, `:12`; `useGuardedDeepLinks.ts:13`, `:25`.
- Overlay Back callbacks and actual Account escape for zero tabs are wired: `apps/mobile/src/components/ActionDialog.tsx:13`; `apps/mobile/src/navigation/MainTabNavigator.tsx:27`. Device Back/navigation acceptance remains unknown.

## New P1 M-N-001: old authentication completion after session change

**SOURCE FIXED / REGRESSION PASS / NATIVE UNKNOWN.** Before the fix, an in-flight refresh could restore tokens and accept/cache the signed-out user after logout. An old delayed token write could overwrite a new login; a command waiting on credential reads could still be sent after logout. Further RED tests showed old logout/startup403 cleanup could clear a newer login while cache deletion was pending.

The fix invalidates API generations immediately, guards authenticated send/response/refresh acceptance, serializes token mutations, reserves token/cache cleanup together, and version-guards restore/login/cleanup completion. Anchors: `apps/mobile/src/services/api/api-client.ts:39`, `:117`, `:152`, `:161`; `apps/mobile/src/storage/auth.storage.ts:10`, `:35`, `:52`; `apps/mobile/src/features/auth/context/AuthProvider.tsx:62`, `:67`, `:68`, `:138`, `:167`, `:186`. Cache/token namespaces and server contracts are unchanged.

`auth.storage.web.ts:6` performs synchronous sessionStorage writes/removal, with no awaited mutation gap; the shared API generation guard prevents late refresh writes there. Native asynchronous SecureStore operations use the token mutation queue.

Meaningful RED/GREEN assertions are in `apps/mobile/tests/session-race.test.cjs`, `auth-restore.test.cjs` and `improvement-checkpoint.test.cjs`. Before/after in-memory reproduction artifacts are under `raw/mobile-agent/review-reproductions-before.json`, `review-reproductions-after.json`, `review-session-race-after.json`. These are not production API/device observations.

## Remaining source findings

The review found and fixed notification filter state, booking timezone readback, profile-marker ordering, known notification language, session invalidation/cleanup races and heading line-height. The final SessionCard role-label regression also observed RED (ADMIN/YARD_STAFF rendered raw) then GREEN; custom role codes are preserved as `Chưa xác định (CODE)`. No additional reproduced source defect remains from this checkpoint. Native acceptance remains pending.

## Native acceptance pending

No new native PASS is claimed. Automatic approval review rejected the combined Metro/env/reopen command with generic `blocked by policy`; it was not retried or bypassed. No mobile native environment, size, font, theme, API URL, Metro process or ADB routing was changed by this agent. The existing entry XML shows an old bundle and an Expo CLI connection error; it is not evidence for current fixes.

Pending actual-device cases: 320/360/412/768dp at font1/1.5/2; light/dark main screens and overlays; touch bounds/gaps; keyboard clipping; Back closing overlays first; zero-tab Account/logout; native picker accept/cancel/timezone; cold/warm valid/invalid links with real roles; cache expiry/user switch/logout/reconnect revoked permissions; camera lifecycle/permissions; spoken TalkBack names, announcements and focus order. Their acceptance status is **UNKNOWN**, not failed by absence of evidence and not passed by source fixtures.
