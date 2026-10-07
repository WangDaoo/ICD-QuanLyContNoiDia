# Progressive resource loading checkpoint - 2026-10-04

Changed only `apps/web/src/context/AppContext.tsx` and added `audit/tools/tests/progressive-loading.test.mjs`. Provider snapshot before this batch: `raw/progressive-AppContext-before-2026-10-04.tsx`. Isolated batch diff: `fixes/progressive-loading-2026-10-04.diff`.

## Result and boundaries

Each fully paginated resource is mapped/validated before publication. A completed resource no longer waits for unrelated list reads or secondary detail/safety requests. Transient failures retain explicitly stale previous rows; forbidden reads remove rows immediately. Financial mapping failure publishes unavailable/stale status rather than a false zero.

Manifest/role/handover list publication marks each detail loading. Prior safety readiness is invalidated at refresh start and stays unknown until the existing authoritative holds/pass reconciliation finishes. Per-resource state publication re-checks actor generation and token inside the React functional update. Final mapping/enrichment and full command refresh await remain intact.

Review found an existing related reconciliation error: a malformed tariff refresh retained the tariff header but discarded previously validated derived rules at the final commit. A RED regression reproduced it; the stale final tariffRules collection now stays paired with the stale tariffs resource.

## Fresh verification

- Initial seven progressive tests: seven meaningful RED failures before source mutation, captured in `raw/progressive-loading-red.txt`.
- Additional tariff-derived-data regression: RED, captured in `raw/progressive-derived-tariff-red.txt`.
- Final progressive and existing auth/session/safety/payment regressions: **24/24 PASS**, zero failed, exit0, in `raw/progressive-context-regressions-green.txt`. Eight are new progressive tests.
- Web TypeScript: exit0, `raw/progressive-typecheck-green.txt`.
- Owned AppContext ESLint with max-warnings0: exit0, `raw/progressive-lint-green.txt`.

Fixtures import/render the actual provider and mapper/load-list implementations; only API transport/auth responses are replaced with deterministic deferred responses. They establish source behavior, not real browser timings or native acceptance. Root-owned controlled-fault browser evidence and full suite/build verification remain separate.
