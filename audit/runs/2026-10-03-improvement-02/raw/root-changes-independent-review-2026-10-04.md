# Independent review of root UI changes - 2026-10-04

Scope: read-only application source review of `apps/web/src/App.tsx` and `apps/web/src/components/yard/YardOperations.tsx`, plus fresh actual-consumer fixtures. No application source, root-owned tests or report was edited. Additional review checks are appended in memory by a test-only Node loader in this directory.

Reviewed SHA256: App `E55236547A9188A3C31A4DC5558915A223B90495D0338B3854F1E2831130F5B4`; YardOperations `59BE81673923C93FE84C6F4DBE31146A8BB1E79BC66F1F7124F2C8D7ECC2CBC9`.

## Verified scope

Fresh command:

```powershell
node --import ./audit/tools/runtime/node_modules/tsx/dist/loader.mjs --test ./audit/tools/tests/auth-recovery-view.test.mjs ./audit/tools/tests/yard-dialog-navigation.test.mjs ./audit/tools/runtime/modal-overlay.test.mjs
```

**14/14 PASS**, zero failed, exit0. Log: `raw/root-changes-independent-consumer-green-2026-10-04.txt`.

- MainLayout's hooks all run before the restore-error/loading/signed-out conditional returns; no hook-order change was found.
- An unverified restore shows loading/error/retry/account-switch rather than sidebar, saved business views or password input. A definitively signed-out session uses the existing login form. Protected UI suppression is covered by the actual MainLayout fixture.
- YardOperations now composes the existing named native `ModalOverlay`. Idle cancellation, scroll locking/restoration, Tab/Shift+Tab containment and empty-focus behavior pass the existing modal consumer fixtures.
- Dirty yard navigation cancellation keeps the input; accepted navigation suspends the top layer and preserves the draft for return. Hidden drafts do not intercept another view. A deferred yard write prevents navigation, beforeunload and Escape until settlement; rejection remains visible.
- Booking copy explicitly names UTC+7; UTC process-timezone fixture displays the correct Vietnam history instant.

These fixtures are not pixel/real browser/screen-reader proofs. Dialog reflow at narrow viewport and actual focus geometry remain part of root-owned runtime verification.

## Additional source-proved recovery gap

**P2: the account-switch action on the recovery screen forwards logout without async state or rejection handling.** Anchor at review: `apps/web/src/App.tsx:144` (`onClick={logout}`). The provider's local cleanup runs in `finally`, but a server/network logout failure still rejects the returned promise.

Three actual-consumer checks failed on the reviewed implementation:

1. Deferred logout gives no pending feedback and keeps its control enabled.
2. Rejected server logout emits an unhandled React event promise rejection.
3. Two clicks in one React event batch invoke logout twice.

Reproduce without modifying the root tests:

```powershell
node --import ./audit/tools/runtime/node_modules/tsx/dist/loader.mjs --import ./audit/runs/2026-10-03-improvement-02/raw/root-auth-recovery-review-loader-2026-10-04.mjs --test ./audit/tools/tests/auth-recovery-view.test.mjs
```

Evidence: `raw/root-auth-recovery-independent-red-2026-10-04.txt` (four existing checks PASS; three added checks FAIL, exit1). Loader: `raw/root-auth-recovery-review-loader-2026-10-04.mjs`.

Suggested minimal correction: synchronously guard the recovery account-switch action, show pending feedback, disable retry/account-switch during that action, and handle the logout rejection after guaranteed local cleanup. Keep unverified/protected-data suppression and existing UI structure. Re-run the same independent checks after correction; this finding remains pending until GREEN.

No other proven root-change defect was found in this review. The separately reported API-client expired-token plus refresh-outage gap is outside these two UI source changes.

## GREEN disposition after root correction

The root task added a synchronous ref guard, pending feedback, disabled retry/account-switch controls and handled logout rejection with truthful recovery copy. Independent rerun of the same loader now reports **10/10 PASS**, zero failed, exit0 (`raw/root-auth-recovery-independent-green-2026-10-04.txt`): seven current root fixtures plus the three unchanged independent review checks. The P2 account-switch finding is closed in this source/consumer scope. Hooks remain unconditional before return and protected UI stays hidden while unverified.

Root's actual-browser proof is still required for final UI acceptance. The provider/service cleanup race found during shared-client review was handled in a separate source batch, with snapshots, RED/GREEN and boundaries recorded in `raw/logout-race-checkpoint-2026-10-04.md`.
