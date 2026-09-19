import * as argon2 from 'argon2';

/**
 * Cấu hình Argon2id.
 *
 * Theo baseline OWASP:
 *
 * memory = 19 MiB
 * iterations = 2
 * parallelism = 1
 */
const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,

  memoryCost: 19_456,

  timeCost: 2,

  parallelism: 1,
} as const;

/**
 * Hash password.
 *
 * Không tự tạo salt.
 * Argon2 library tự sinh unique salt.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

/**
 * Verify password.
 *
 * Nếu stored hash không hợp lệ,
 * coi như password không đúng.
 */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
