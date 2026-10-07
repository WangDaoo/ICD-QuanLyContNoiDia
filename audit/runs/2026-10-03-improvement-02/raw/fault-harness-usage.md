# Guarded UI audit read fault harness

This test helper is installed only by `apps/api/test/ui-audit-server.e2e-spec.ts`.
No product source, auth/business service, database or API contract is changed.
The test server already rejects any run except `2026-10-03-improvement-02`, API
3001, MySQL `127.0.0.1:3308`, database `icd_ux_audit_20261003_e2e`.

## Activation

The existing owned API process must be restarted by its owner once to load the
test helper. The harness author has not restarted or stopped that process.
From the monorepo root, the existing guarded launcher is:

```powershell
node audit/tools/audit-command.mjs serve
```

There is no HTTP control endpoint. The only control file is:

```text
audit/runs/2026-10-03-improvement-02/private/network-faults.json
```

The helper is created before `configureApp` and installed just afterward, before
`app.init` registers routes. Consequently Helmet/CORS/request-id middleware runs
before synthetic failures. GET delays resume the unchanged route/auth pipeline.
Status/abort failures intentionally stop that read before its business service.
POST/PATCH/PUT/DELETE/HEAD/OPTIONS and auth routes are always unaffected.

## Commands

```powershell
# Current file validation. "active" means a valid unexpired control file,
# not proof that the server loaded it or that counters remain available.
node audit/tools/audit-set-fault.mjs status

# Delay the next two container reads by one second.
node audit/tools/audit-set-fault.mjs set --id containers-delay-01 --path /api/containers --delay-ms 1000 --requests 2 --ttl-seconds 120

# Return backend-shaped 500 for one matching read. Use a fresh ID per case.
node audit/tools/audit-set-fault.mjs set --id containers-500-01 --path /api/containers --status 500 --requests 1

# Abort one matching GET connection, without affecting other paths or writes.
node audit/tools/audit-set-fault.mjs set --id notifications-abort-01 --path /api/notifications/history --abort --requests 1

# Remove the exact file; the next request follows ordinary backend behavior.
node audit/tools/audit-set-fault.mjs clear
```

Use `--delay-ms 5000` for five-second loading. Supported status values are
401/403/409/422/500. A delay may be combined with a status or an abort; status and
abort cannot be combined. Global and per-rule budgets are 1-20 requests. TTL is
1-600 seconds, default 120. Removing/recreating or editing a control with the
same ID does not reset its in-memory budget or replace its effect. Use a new ID.
File changes take effect on the next matching GET without restarting the API.

## Multi-route JSON example

Replace both timestamps with current ISO UTC values before writing. Expiry must
be later than now and at most ten minutes after `createdAt`.

```json
{
  "id": "collection-retry-02",
  "run": "2026-10-03-improvement-02",
  "createdAt": "2026-10-04T00:15:00.000Z",
  "expiresAt": "2026-10-04T00:17:00.000Z",
  "maxRequests": 3,
  "rules": [
    { "method": "GET", "path": "/api/containers", "status": 500, "maxRequests": 2 },
    { "method": "GET", "path": "/api/notifications/history", "delayMs": 1000, "maxRequests": 1 }
  ]
}
```

The allowlist contains exact collection paths `/api/containers`,
`/api/notifications/history`, `/api/admin/master-data`, and catalog collections
shipping-lines/consignees/clearing-agents/transporters under admin/master-data.
It also allows canonical UUID entity reads for container detail/events/holds/
gate-pass/readiness/gate-pass/gate-passes, operational-holds detail, Gate Pass QR,
and those four catalog detail routes. A rule contains a concrete UUID, never a
wildcard or `:parameter`. Trailing slashes, query strings, arbitrary route names,
custom bodies, unknown fields and write methods are rejected atomically.

Missing/malformed/oversized/expired/inaccessible controls, linked files or linked
private directories mean no injected fault. Each applied effect writes only
config ID, ordinal, rule index, exact GET pathname and effect fields to owned API
stdout. Request headers, JWT/passwords, bodies and query strings are not logged.

## Evidence limits

The controlled status is synthetic, even though it traverses the real local
browser/API network. An aborted one-resource GET is a resource connection error,
not proof of whole-device offline status or native reconnect semantics. Existing
transactions/writes continue through the real unchanged backend. Record the
control ID, matching stdout event, UI screenshot, visible error/loading/retry,
and recovery after `clear` as evidence; do not label fixture-only results as
native or real business outcomes.

## Verification

```powershell
node --import ./audit/tools/runtime/node_modules/tsx/dist/loader.mjs --test ./audit/tools/ui-audit-faults.test.mjs ./audit/tools/audit-set-fault.test.mjs
pnpm exec eslint ./apps/api/test/helpers/ui-audit-faults.ts ./apps/api/test/ui-audit-server.e2e-spec.ts ./audit/tools/audit-set-fault.mjs ./audit/tools/audit-set-fault.test.mjs ./audit/tools/ui-audit-faults.test.mjs --max-warnings 0
```

Helper standalone typecheck was run from `apps/api`:

```powershell
pnpm exec tsc --ignoreConfig --noEmit --target ES2023 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --skipLibCheck --types node ./test/helpers/ui-audit-faults.ts
# Full guarded test server, including its real module imports. Quotes preserve
# the comma-separated types argument in PowerShell.
pnpm exec tsc --ignoreConfig --noEmit --target ES2023 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --skipLibCheck --types 'node,jest' --experimentalDecorators --emitDecoratorMetadata ./test/ui-audit-server.e2e-spec.ts
```

The existing server file was preserved in the run's `source-before` tree. RED
logs are `raw/fault-harness-red.txt` and `raw/fault-cli-red.txt`; fresh GREEN,
typecheck and lint logs use the matching `fault-harness-*` filenames. Tests use
real local Node HTTP sockets without a database, including actual one-second
delay/abort, malformed/deleted/oversized files and a Windows directory junction.
Recursive test cleanup first checks the resolved target is a regular immediate
child of the real OS tmpdir with the exact `icd-fault-test-XXXXXX` prefix.

Final checkpoint: 20/20 tests passed; helper and full-server strict TypeScript
both exited 0; scoped TypeScript/CLI/test ESLint exited 0 with no warnings.
An independent read-only reviewer found no verified actionable defects in
guard, counter, timer, logging or middleware-order behavior. Native/browser
fault acceptance remains the runtime owner's next check.
