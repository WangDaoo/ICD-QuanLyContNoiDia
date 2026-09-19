import { randomUUID } from 'node:crypto';

export function generatePaymentReference(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');

  const suffix = randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();

  return `PAY-${date}-${suffix}`;
}
