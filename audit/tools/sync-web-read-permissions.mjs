// Generates apps/web/src/services/read-permissions.ts from the NestJS controllers.
// Usage (from the repository root): node audit/tools/sync-web-read-permissions.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(resolve('audit/tools/runtime/package.json'));
const ts = require('typescript');

const constants = readFileSync('apps/api/src/common/constants/permission-codes.constants.ts', 'utf8');
const codes = Object.fromEntries([...constants.matchAll(/(\w+):\s*'([^']+)'/g)].map(match => [match[1], match[2]]));

const rows = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!entry.name.endsWith('.controller.ts')) continue;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const decorators = node => (ts.getDecorators(node) || []).map(d => d.expression).filter(ts.isCallExpression);
    const permissionsOf = node => {
      const decorator = decorators(node).find(d => d.expression.getText(source) === 'Permissions');
      return decorator ? decorator.arguments.map(a => a.getText(source).replace('PERMISSION_CODES.', '')) : undefined;
    };
    const isPublic = node => decorators(node).some(d => d.expression.getText(source) === 'Public');
    for (const declaration of source.statements.filter(ts.isClassDeclaration)) {
      const prefix = decorators(declaration).find(d => d.expression.getText(source) === 'Controller')?.arguments[0]?.text || '';
      const classPermissions = permissionsOf(declaration);
      for (const method of declaration.members.filter(ts.isMethodDeclaration)) {
        const route = decorators(method).find(d => d.expression.getText(source) === 'Get');
        if (!route) continue;
        const path = '/' + [prefix, route.arguments[0]?.text].filter(Boolean).join('/');
        if (path.startsWith('/v1/external') || path.startsWith('/partner')) continue;
        if (isPublic(method) || isPublic(declaration)) continue;
        const permissions = (permissionsOf(method) ?? classPermissions ?? []).map(name => {
          if (!codes[name]) throw new Error(`Unknown permission ${name} on GET ${path}`);
          return codes[name];
        });
        rows.push([path.replace(/\/+$/, '') || '/', permissions]);
      }
    }
  }
}
walk(resolve('apps/api/src'));
rows.sort((a, b) => a[0].localeCompare(b[0]));

// Login-only routes whose service still rejects external-only accounts (CUSTOMER_SCOPE_NOT_CONFIGURED).
// WorkQueueService.getWorkQueue enforces this without a @Permissions decorator; getStats delegates to it.
const internalOnly = ['/containers/work-queue', '/containers/work-queue/stats'];
for (const route of internalOnly) {
  if (!rows.some(([path]) => path === route)) throw new Error(`Internal-only route ${route} no longer exists`);
}
const workQueueService = readFileSync('apps/api/src/modules/work-queue/work-queue.service.ts', 'utf8');
if (!workQueueService.includes('CUSTOMER_SCOPE_NOT_CONFIGURED')) {
  throw new Error('WorkQueueService no longer rejects external-only accounts; update internalOnly');
}

const content = `// Mirrors internal API GET controller permissions; the server remains authoritative.
// Regenerate with: node audit/tools/sync-web-read-permissions.mjs
// Every listed permission is required (PermissionsGuard uses "every"); [] means login only.
const READ_ROUTES: ReadonlyArray<readonly [string, readonly string[]]> = ${JSON.stringify(rows, null, 2)};

// Login-only routes that the service still refuses to external-only accounts.
const INTERNAL_ONLY_ROUTES: ReadonlySet<string> = new Set(${JSON.stringify(internalOnly)});

const rules = READ_ROUTES.map(([route, permissions]) => {
  const segments = route.split('/').filter(Boolean);
  return {
    route,
    permissions,
    params: segments.filter(segment => segment.startsWith(':')).length,
    literals: segments.filter(segment => !segment.startsWith(':')).length,
    pattern: new RegExp('^' + route.replace(/:[^/]+/g, '[^/]+') + '$'),
  };
}).sort((a, b) => a.params - b.params || b.literals - a.literals);

function matchRule(path: string) {
  const [pathname = ''] = path.split('?');
  const normalized = pathname.replace(/\\/+$/, '') || '/';
  return rules.find(rule => rule.pattern.test(normalized));
}

/** Permissions required to GET an API path (without query); undefined when the route is unknown. */
export function requiredReadPermissions(path: string): readonly string[] | undefined {
  return matchRule(path)?.permissions;
}

/**
 * False only when the route is known and the actor definitely lacks one of its permissions,
 * so the UI can skip a request the API would reject with 403. Unknown routes stay allowed.
 *
 * External-only accounts (CONSIGNEE or AGENT without any internal role) are denied every
 * permissioned route, mirroring the PermissionsGuard CUSTOMER_SCOPE_NOT_CONFIGURED check.
 * The external check runs before the wildcard check (matching API guard order).
 */
export function canReadRoute(user: { permissionCodes?: string[]; roleCodes?: string[] } | null | undefined, path: string): boolean {
  const rule = matchRule(path);
  if (!rule) return true;
  const internalRoles = ['ADMIN', 'MANAGER', 'OPERATOR', 'GATE_STAFF', 'YARD_STAFF'];
  const roles = user?.roleCodes ?? [];
  const isExternalOnly =
    roles.some(r => r === 'CONSIGNEE' || r === 'AGENT') &&
    !roles.some(r => internalRoles.includes(r));
  if (isExternalOnly && INTERNAL_ONLY_ROUTES.has(rule.route)) return false;
  const required = rule.permissions;
  if (required.length === 0) return true;
  if (isExternalOnly) return false;
  const granted = user?.permissionCodes ?? [];
  if (granted.includes('*')) return true;
  return required.every(permission => granted.includes(permission));
}
`;
writeFileSync('apps/web/src/services/read-permissions.ts', content);
console.log('Canonical internal read routes:', rows.length);
