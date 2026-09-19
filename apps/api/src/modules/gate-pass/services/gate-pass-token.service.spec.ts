import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { GatePassTokenService } from './gate-pass-token.service';

describe('GatePassTokenService', () => {
  let service: GatePassTokenService;
  const mockSecret = 'super-secret-key-that-is-at-least-32-chars-long!';

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(mockSecret),
    } as unknown as ConfigService;

    service = new GatePassTokenService(configService);
  });

  it('should create a deterministic signed token and verify it successfully', () => {
    const expiresAt = Date.now() + 3600000;
    const token = service.create({
      gatePassId: 'gp-123',
      expiresAt,
    });

    expect(token).toMatch(/^gp1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    const payload = service.verify(token);
    expect(payload.gatePassId).toBe('gp-123');
    expect(payload.expiresAt).toBe(expiresAt);
  });

  it('should hash token deterministically with sha256', () => {
    const token = 'gp1.dummy.sig';
    const hash1 = service.hash(token);
    const hash2 = service.hash(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should throw UnauthorizedException if token format is invalid', () => {
    expect(() => service.verify('invalid-token')).toThrow(UnauthorizedException);
    expect(() => service.verify('gp2.invalid.sig')).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if signature is tampered', () => {
    const expiresAt = Date.now() + 3600000;
    const token = service.create({
      gatePassId: 'gp-123',
      expiresAt,
    });

    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.tampered_signature`;

    expect(() => service.verify(tampered)).toThrow(UnauthorizedException);
  });
});
