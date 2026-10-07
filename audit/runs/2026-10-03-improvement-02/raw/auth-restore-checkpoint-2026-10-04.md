# Session restoration recovery checkpoint - 2026-10-04

Owned source: `apps/web/src/context/AppContext.tsx`; new fixture: `audit/tools/tests/auth-restore.test.mjs`. Before snapshot: `raw/auth-restore-AppContext-before-2026-10-04.tsx`; isolated diff: `fixes/auth-restore-2026-10-04.diff`.

## Proven problem and fix

The provider's startup `/auth/me` blanket catch cleared retained access/refresh credentials when the server was unreachable, returned500 or supplied a malformed auth response. These outcomes do not establish that a session expired.

The provider now preserves credentials for recoverable restore failures, exposes `sessionRestoreError` and `retrySessionRestore`, and keeps `isAuthenticated=false` with no operational data until `/auth/me` verifies the actor. A definitive401/403 clears credentials and returns the ordinary signed-out state. Duplicate retry controls share one verification promise. Attempt/session generations reject late results after logout, new login or unmount. Logout clears the restore pending indicator/error.

`App.tsx` owns presentation of the error, retry/logout and unverified loading UI in the root task. This provider checkpoint alone does not establish the final visible recovery path.

## Verification

- RED: six meaningful missing-behavior failures plus two already-working denied-session checks; `raw/auth-restore-red.txt`.
- New restore fixtures8/8 PASS; `raw/auth-restore-green.txt`.
- Restore+progressive+existing auth/safety/payment source fixtures32/32 PASS, zero failed, exit0; `raw/auth-progressive-regressions-green.txt`.
- TypeScript and owned provider ESLint with max-warnings0 pass, exit0; `raw/auth-restore-typecheck-green.txt`, `raw/auth-restore-lint-green.txt`.

## Separate unresolved scope

`apps/web/src/services/api/client.ts` still clears credentials when refresh transport fails or returns5xx; `packages/api-client/src/index.ts` then reports the original401. Fixing this provider does not prove expired-access-token plus refresh-outage recovery. That transport/client gap was reported to the root task for separate ownership and tests. No source in either client file was edited by this batch.
