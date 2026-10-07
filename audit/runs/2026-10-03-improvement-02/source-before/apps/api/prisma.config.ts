import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/**
 * Load environment từ root project:
 *
 * icd-management/.env
 */
config({
  path: '../../.env',
});

/**
 * Prisma CLI configuration.
 *
 * Trách nhiệm:
 * - Chỉ định Prisma schema.
 * - Cung cấp DATABASE_URL cho migration.
 * - Khai báo command chạy database seed.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    seed: 'tsx prisma/seed/seed.ts',
  },

  datasource: {
    url: env('DATABASE_URL'),
    shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
});
