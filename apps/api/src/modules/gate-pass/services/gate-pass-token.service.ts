import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface GatePassTokenPayload {
  gatePassId: string;
  expiresAt: number;
}

@Injectable()
export class GatePassTokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('GATE_PASS_QR_SECRET');
  }

  create(input: GatePassTokenPayload): string {
    const payload = Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
    const signature = this.sign(payload);
    return `gp1.${payload}.${signature}`;
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  verify(token: string): GatePassTokenPayload {
    const [version, payload, signature] = token.split('.');

    if (version !== 'gp1' || !payload || !signature) {
      throw this.invalid();
    }

    const expected = this.sign(payload);

    const left = Buffer.from(signature, 'utf8');
    const right = Buffer.from(expected, 'utf8');

    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw this.invalid();
    }

    let value: GatePassTokenPayload;

    try {
      value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw this.invalid();
    }

    if (!value.gatePassId || !Number.isFinite(value.expiresAt)) {
      throw this.invalid();
    }

    return value;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.secret).update(payload, 'utf8').digest('base64url');
  }

  private invalid(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'GATE_PASS_TOKEN_INVALID',
      message: 'QR Phiếu ra cổng không hợp lệ.',
    });
  }
}
