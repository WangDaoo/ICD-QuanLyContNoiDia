import { randomBytes } from 'crypto';

export function generateTruckVisitCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomSuffix = randomBytes(3).toString('hex').toUpperCase();

  return `TV-${dateStr}-${randomSuffix}`;
}
