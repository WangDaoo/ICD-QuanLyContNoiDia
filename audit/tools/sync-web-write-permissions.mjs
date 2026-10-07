import { readFileSync, writeFileSync } from 'node:fs';
const inventory=JSON.parse(readFileSync('audit/runs/2026-10-03-improvement-02/raw/backend-permissions.json','utf8'));
const source=readFileSync('apps/api/src/common/constants/permission-codes.constants.ts','utf8');
const codes=Object.fromEntries([...source.matchAll(/(\w+):\s*'([^']+)'/g)].map(match=>[match[1],match[2]]));
const rows=inventory.filter(row=>row.method!=='GET' && row.permissions.length===1 && !row.route.startsWith('/v1/external'))
  .map(row=>[row.method,row.route,codes[row.permissions[0]]]);
rows.push(['PATCH','/notifications/:id/read',null],['POST','/notifications/read-all',null]);
if(rows.some(row=>row[2]===undefined)) throw new Error('Unknown canonical permission');
const content=`// Mirrors internal API controller permissions; the server remains authoritative.
// Regenerate with audit/tools/inventory-backend-permissions.mjs then sync-web-write-permissions.mjs.
const WRITE_ROUTES: ReadonlyArray<readonly [string, string, string | null]> = ${JSON.stringify(rows,null,2)};
const rules = WRITE_ROUTES.map(([method, route, permission]) => ({ method, permission,
  pattern: new RegExp('^' + route.replace(/:[^/]+/g, '[^/]+') + '$') }));
/** null: authenticated self-service route; undefined: unknown/unsupported route. */
export function requiredWritePermission(path: string, method = 'POST'): string | null | undefined {
  return rules.find(rule => rule.method === method && rule.pattern.test(path))?.permission;
}
`;
writeFileSync('apps/web/src/services/write-permissions.ts',content);
console.log('Canonical internal write routes:',rows.length);
