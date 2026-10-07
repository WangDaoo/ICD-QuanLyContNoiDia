import fs from 'node:fs/promises';
const env = await fs.readFile('.env', 'utf8');
const password = env.match(/^BOOTSTRAP_ADMIN_PASSWORD\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
const base = 'http://127.0.0.1:3000/api';
const login = await fetch(base + '/auth/login', {method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@icd.local',password})});
const session = (await login.json()).data;
if (!login.ok) throw new Error('Login failed: ' + login.status);
const headers = {Authorization:'Bearer ' + session.accessToken};
const paths = ['/containers', '/yard/slots','/yard/blocks','/gate/truck-visits','/containers/work-queue','/manifests','/movement-orders','/service-orders','/invoices','/handovers','/admin/roles','/notifications/history'];
const raw = {};
for(const route of paths) {
  const response = await fetch(base + route, {headers}); const body = await response.json();
  raw[route] = body;
  const rows = Array.isArray(body.data) ? body.data : body.data?.items ?? body.data;
  console.log(JSON.stringify({route,status:response.status,count:Array.isArray(rows)?rows.length:undefined,keys:rows?.[0]?Object.keys(rows[0]):typeof rows,meta:body.meta,example:route === '/yard/slots' || route === '/containers/work-queue' || route === '/gate/truck-visits' ? rows?.[0] : undefined}));
}
await fs.writeFile('test-artifacts/2026-10-01-live-integration/api-snapshot.json', JSON.stringify(raw,null,2));
