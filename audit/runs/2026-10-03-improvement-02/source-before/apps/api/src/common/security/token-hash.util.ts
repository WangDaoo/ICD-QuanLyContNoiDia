import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Refresh Token là token entropy cao,
 * vì vậy SHA-256 phù hợp để không lưu token
 * plaintext trong database.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Compare hash bằng timing-safe comparison.
 */
export function tokenHashesEqual(firstHash: string, secondHash: string): boolean {
  const first = Buffer.from(firstHash, 'hex');

  const second = Buffer.from(secondHash, 'hex');

  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(first, second);
}
