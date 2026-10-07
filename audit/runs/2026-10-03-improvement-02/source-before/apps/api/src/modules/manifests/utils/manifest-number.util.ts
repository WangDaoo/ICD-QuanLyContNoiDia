import { randomUUID } from 'crypto';

export function generateManifestNumber(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');

  const randomPart = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

  return `MF-${yyyy}${mm}${dd}-${randomPart}`;
}
