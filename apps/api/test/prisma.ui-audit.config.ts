import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';
if (process.env.ICD_AUDIT_RUN !== '2026-10-03-improvement-02' || process.env.MYSQL_DATABASE !== 'icd_ux_audit_20261003_e2e') {
  throw new Error('UI audit Prisma configuration guard rejected target.');
}
export default defineConfig({ schema: resolve(__dirname, '../prisma/schema.prisma'),
  datasource: { url: process.env.DATABASE_URL! } });
