# Web/SDK session recovery checkpoint

Scope: only `apps/web/src/services/api/client.ts`,
`packages/api-client/src/index.ts`, and two new `refresh-recovery.test.ts` files.
Product API contracts and backend business services are unchanged. The root's
exported `API_BASE_URL` line remains intact. Files were snapshotted separately
in `source-before-recovery/` before this batch; original baseline is preserved.

## Root cause and fix

The web refresh callback previously cleared both credentials for every network,
non-2xx and malformed response. The SDK then swallowed refresh exceptions and
invoked unauthorized handling for the original 401. Consequently a temporary
refresh outage was falsely treated as a terminal session rejection.

- Network refresh failure now throws `ApiError` status 0; server failures retain
  their status; malformed success payload/JSON throws status 500. Stored tokens
  remain available for an explicit recovery attempt.
- Refresh 401/403 and missing refresh credential return `null`; the SDK clears
  only the still-current session through `onUnauthorized`. Login/refresh endpoint
  credential errors do not independently invalidate another established session.
- `tokenStorage.getSessionVersion()` is public. Public set/clear mutations
  advance it. A validated refresh commits the rotated pair internally while
  retaining the same session version. Refresh captures version and both token
  identities before I/O and verifies them before any persistence/error outcome.
- SDK captures caller identity before Axios schedules dispatch. Stale queued
  writes, old 401s and old refresh outcomes become status 0 with error code
  `AUTH_SESSION_CHANGED`, without clearing or replaying another actor's request.
- Shared refresh slots are keyed by token/version and identity-guarded on cleanup.
  Concurrent same-session reads share a refresh; an old finally cannot release a
  newer actor's slot.
- Independent review caught a staggered-401 regression: valid same-actor rotation
  was being mistaken for an actor switch. Its adapter reproduction failed in
  `web-refresh-lineage-red.txt`, then passed after successful rotation lineage
  tracking. Only a known predecessor at the unchanged session version may reuse
  the current token for one retry. Unknown replacements remain fenced. Lineage
  is deduplicated and bounded to twenty transitions in memory.
- Network/500 failures on financial writes are not automatically replayed. An
  original terminal auth 401 may receive the existing single auth retry after
  a successful refresh; no new generic retry, offline queue or transaction replay
  was introduced.

## Verified evidence

| Check | Result | Raw artifact |
|---|---|---|
| Initial recovery RED | 32 tests: 23 failed, 9 passed | `web-refresh-recovery-red.txt` |
| Initial recovery GREEN | 32/32 passed | `web-refresh-recovery-green.txt` |
| Independent same-actor RED | 1/1 failed as expected | `web-refresh-lineage-red.txt` |
| Final focused + existing regressions | 43/43 passed (34 new, 9 existing) | `web-refresh-recovery-regressions.txt` |
| Web TypeScript | exit 0 | `web-refresh-recovery-typecheck.txt` |
| Scoped web/SDK/test ESLint | exit 0; 0 errors/warnings | `web-refresh-recovery-lint.txt` |

Tests use the actual singleton web client with blocked `fetch`/Response and real
Axios adapter error paths. They cover network/500/malformed JSON/invalid tokens,
terminal 401/403/missing refresh, coalescing, late fulfill/network/401 after
logout/new login (including identical token fixtures), stale 401, overlapping
refresh slots, queued writes and uncertain financial errors. These are HTTP
contract/component fixtures; real browser startup outage acceptance is the
runtime owner's separate next check.

## Current evidence anchors

| Concern | Source anchor |
|---|---|
| Public session version mutations/getter | `apps/web/src/services/api/client.ts:15`, `:30` |
| Refresh version/token fences | `apps/web/src/services/api/client.ts:53` |
| Recoverable versus terminal response | `apps/web/src/services/api/client.ts:64` |
| Same-session rotated pair commit | `apps/web/src/services/api/client.ts:77` |
| SDK optional version contract | `packages/api-client/src/index.ts:30` |
| Known rotation lineage | `packages/api-client/src/index.ts:80` |
| Caller/dispatch fencing | `packages/api-client/src/index.ts:96`, `:181` |
| Late known 401 single retry | `packages/api-client/src/index.ts:114` |
| Shared refresh slot cleanup | `packages/api-client/src/index.ts:141` |
| Refresh exception propagation | `packages/api-client/src/index.ts:168` |

No runtime was restarted, no database was mutated, and no UI was controlled by
this subtask. Logout's own finally/context race is owned by the provider agent
in `auth.service.ts`/`AppContext.tsx`, using this unchanged version contract.
