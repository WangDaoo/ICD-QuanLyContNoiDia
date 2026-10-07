import { writeFileSync } from 'node:fs';
import { env, privateFile, guardAuditRuntime, login, requestApi, closeConnection } from './audit-api-client.mjs';
const password = process.env.ICD_AUDIT_UI_PASSWORD;
if (!password || password.length < 16) throw new Error('Provide private synthetic UI password in the process environment.');
try {
  await guardAuditRuntime();
  const admin = await login(env.BOOTSTRAP_ADMIN_EMAIL, env.BOOTSTRAP_ADMIN_PASSWORD);
  const users = await requestApi('GET', '/admin/users?pageSize=100', undefined, admin.accessToken);
  const rows = Array.isArray(users) ? users : users.data ?? users.items ?? [];
  for (const role of ['ADMIN','GATE_STAFF','YARD_STAFF','OPERATOR','MANAGER','AUDIT_READ_ONLY','AUDIT_NONE']) {
    const email = `ui-${role.toLowerCase()}@audit.icd.test`;
    if (!rows.some(user => user.email === email)) await requestApi('POST', '/admin/users', { name: `UI Audit ${role}`, email, password, roleCodes: [role] }, admin.accessToken);
  }
  env.AUDIT_UI_PASSWORD = password;
  writeFileSync(privateFile, Object.entries(env).map(([key,value]) => `${key}=${JSON.stringify(String(value))}`).join('\n') + '\n');
  console.log('Seven synthetic UI accounts prepared; password retained only in private ignored environment.');
} finally { await closeConnection(); }
