import { z } from 'zod';

/**
 * Environment configuration của ICD Backend.
 *
 * Bootstrap variables không validate ở đây vì:
 * - API runtime không cần chúng.
 * - Chỉ database seed mới cần.
 */
const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    API_HOST: z.string().default('0.0.0.0'),

    API_PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1),

    MYSQL_DATABASE: z.string().min(1),

    MYSQL_USER: z.string().min(1),

    MYSQL_PASSWORD: z.string().min(1),

    MYSQL_HOST: z.string().default('127.0.0.1'),

    MYSQL_PORT: z.coerce.number().int().positive().default(3306),

    MYSQL_CONNECTION_LIMIT: z.coerce.number().int().positive().default(5),

    JWT_ACCESS_SECRET: z.string().min(32),

    JWT_REFRESH_SECRET: z.string().min(32),

    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),

    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().min(3600).max(2_592_000).default(604_800),

    JWT_ISSUER: z.string().min(1).default('icd-api'),

    JWT_AUDIENCE: z.string().min(1).default('icd-clients'),

    TOKEN_ENCRYPTION_KEY: z
      .string()
      .min(32)
      .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

    SMTP_HOST: z.string().optional(),

    SMTP_PORT: z.coerce.number().int().optional().default(587),

    SMTP_SECURE: z
      .preprocess((val) => val === 'true' || val === true, z.boolean())
      .optional()
      .default(false),

    SMTP_USER: z.string().optional(),

    SMTP_PASS: z.string().optional(),

    SMTP_FROM: z.string().optional().default('ICD Notification <noreply@icd.local>'),

    FIREBASE_PROJECT_ID: z.string().optional(),

    FIREBASE_CLIENT_EMAIL: z.string().optional(),

    FIREBASE_PRIVATE_KEY: z.string().optional(),

    APNS_KEY_ID: z.string().optional(),

    APNS_TEAM_ID: z.string().optional(),

    APNS_BUNDLE_ID: z.string().optional(),

    APNS_PRIVATE_KEY: z.string().optional(),
  })
  .superRefine((environment, context) => {
    if (environment.JWT_ACCESS_TTL_SECONDS >= environment.JWT_REFRESH_TTL_SECONDS) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_TTL_SECONDS'],
        message: 'Access token TTL phải nhỏ hơn Refresh token TTL.',
      });
    }
  });

export type EnvironmentVariables = z.infer<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => {
        const field = issue.path.join('.');

        return `${field}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}
