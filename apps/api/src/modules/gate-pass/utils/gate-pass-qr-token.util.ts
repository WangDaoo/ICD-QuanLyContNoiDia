import * as crypto from 'crypto';

export function hashGatePassQrToken(qrToken: string): string {
  return crypto.createHash('sha256').update(qrToken.trim()).digest('hex');
}
