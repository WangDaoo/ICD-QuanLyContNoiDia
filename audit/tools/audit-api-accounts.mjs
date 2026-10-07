import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { env, privateFile, guardAuditRuntime, login, requestApi, proof, saveResults, closeConnection } from './audit-api-client.mjs';

try {
  await guardAuditRuntime();
  const admin = await login(env.BOOTSTRAP_ADMIN_EMAIL, env.BOOTSTRAP_ADMIN_PASSWORD);
  const token = admin.accessToken;
  const permissions = await requestApi('GET', '/admin/permissions', undefined, token);
  const readCodes = permissions.filter(p => p.active !== false && p.code.endsWith('.read')).map(p => p.code);
  const roles = await requestApi('GET', '/admin/roles', undefined, token);
  for (const [code, name, permissionCodes] of [['AUDIT_READ_ONLY', 'Audit Read Only', readCodes], ['AUDIT_NONE', 'Audit No Permissions', []]]) {
    let role = roles.find(r => r.code === code);
    role ??= await requestApi('POST', '/admin/roles', { code, name, description: 'Synthetic isolated UI audit role' }, token);
    await requestApi('PUT', `/admin/roles/${role.id}/permissions`, { permissionCodes }, token);
  }
  env.AUDIT_USER_PASSWORD ??= randomBytes(24).toString('base64url') + '!Aa1';
  for (const code of ['ADMIN', 'GATE_STAFF', 'YARD_STAFF', 'OPERATOR', 'MANAGER', 'AUDIT_READ_ONLY', 'AUDIT_NONE']) env[`AUDIT_USER_${code}_EMAIL`] ??= `audit-${code.toLowerCase()}@audit.icd.test`;
  writeFileSync(privateFile, Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(String(value))}`).join('\n') + '\n');
  const existing = await requestApi('GET', '/admin/users?pageSize=100', undefined, token);
  const existingRows = Array.isArray(existing) ? existing : existing.data ?? existing.items ?? [];
  const accounts = [];
  for (const code of ['ADMIN', 'GATE_STAFF', 'YARD_STAFF', 'OPERATOR', 'MANAGER', 'AUDIT_READ_ONLY', 'AUDIT_NONE']) {
    const email = env[`AUDIT_USER_${code}_EMAIL`];
    const user = existingRows.find(u => u.email === email) ?? await requestApi('POST', '/admin/users', { name: `Audit ${code}`, email, password: env.AUDIT_USER_PASSWORD, roleCodes: [code] }, token);
    const session = await login(email, env.AUDIT_USER_PASSWORD);
    accounts.push({ id: user.id, role: code, permissionCount: session.user.permissionCodes.length, emailKey: `AUDIT_USER_${code}_EMAIL`, passwordKey: 'AUDIT_USER_PASSWORD' });
    proof(`Real login ${code}`, { userId: user.id, roleCodes: session.user.roleCodes, permissionCount: session.user.permissionCodes.length });
    if (code === 'AUDIT_NONE') {
      await requestApi('GET', '/containers', undefined, session.accessToken, [403]);
      await requestApi('POST', '/manifests', {}, session.accessToken, [403]);
    }
    if (code === 'AUDIT_READ_ONLY') {
      await requestApi('GET', '/containers', undefined, session.accessToken, [200]);
      await requestApi('POST', '/manifests', {}, session.accessToken, [403]);
    }
  }
  saveResults('accounts.json', { accounts });
  process.stdout.write(JSON.stringify({ accountCount: accounts.length, verifiedLogins: accounts.length, roleVariants: accounts.map(a => a.role), credentials: 'Private ignored .env.local only' }) + '\n');
} catch (error) {
  saveResults('accounts.json', { failure: error.message });
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
} finally { await closeConnection(); }
