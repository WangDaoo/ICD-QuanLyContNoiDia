# Logout session cleanup race checkpoint - 2026-10-04

Owned source changes: `apps/web/src/services/api/auth.service.ts` and `apps/web/src/context/AppContext.tsx`; new tests: `audit/tools/tests/logout-session-race.test.mjs`. No App, shared SDK or browser/runtime changes were made by this batch.

Snapshots: `raw/logout-race-auth-service-before-2026-10-04.ts`, `raw/logout-race-AppContext-before-2026-10-04.tsx`. Scoped diffs: `fixes/logout-race-2026-10-04-auth.service.ts.diff`, `fixes/logout-race-2026-10-04-AppContext.tsx.diff`.

## RED evidence and correction

Old deferred logout success and failure both erased a completed new login's credentials and replaced its verified provider state with signed-out state. Four meaningful RED checks captured this independently at service/provider boundaries (`raw/logout-session-race-red-2026-10-04.txt`). Same-session cleanup and transport-error propagation already passed.

The service now captures `tokenStorage.getSessionVersion()` before logout and clears only if that actor generation remains unchanged. This contract was coordinated with the shared-client owner: public login/logout token mutations advance generation; a genuine refresh rotates the storage pair within the same generation. Same-session rotation therefore still permits definitive local logout.

The provider captures its actor and credential generations. Review then reproduced a further RED interval where the real auth service had committed B credentials but its provider continuation had not yet committed the B actor (`raw/logout-intermediate-generation-red-2026-10-04.txt`). The provider now checks both generations before clearing, while already-cleared credentials still permit same-session UI cleanup. Neither guard returns from `finally` or swallows the original transport rejection.

## Final verification and freeze

- New logout fixtures8/8 PASS plus32 existing auth/progressive/safety/payment consumer checks: **40/40 PASS**, zero failed, exit0; `raw/logout-session-race-green-2026-10-04.txt`.
- Web TypeScript and owned source ESLint max-warnings0: exit0; `raw/logout-session-race-typecheck-green-2026-10-04.txt`, `raw/logout-session-race-lint-green-2026-10-04.txt`.
- Auth service SHA256: `541598B675853CA747E53F89701460E0487AC38F3372BBEF36BA81E63BA79E61`.
- AppContext SHA256: `18A9FDE9B75550459B22D9962ADA738922A42330B4C83F6FDA64A43FC213B710`.

Tests render the actual provider and execute the actual login/logout services and response validation. Only the transport response is deterministic/deferred; the intermediate test delays delivery of the real login result after credential commit. These are source/regression proofs, not native or full runtime acceptance.
