import { ConfigService } from '@nestjs/config';
import { TokenCipherService } from './token-cipher.service';

describe('TokenCipherService', () => {
  let service: TokenCipherService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'TOKEN_ENCRYPTION_KEY') {
          return '12345678901234567890123456789012'; // 32 chars
        }
        return undefined;
      }),
    };

    service = new TokenCipherService(mockConfigService as ConfigService);
  });

  it('should hash token deterministically using SHA-256', () => {
    const token = 'sample-device-token-12345';
    const hash1 = service.hashToken(token);
    const hash2 = service.hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should encrypt and decrypt push token successfully using AES-256-GCM', () => {
    const token = 'fcm_token_super_secret_xyz9876543210';
    const encrypted = service.encryptToken(token);

    expect(encrypted.tokenHash).toHaveLength(64);
    expect(encrypted.tokenCiphertext).toBeDefined();
    expect(encrypted.tokenIv).toBeDefined();
    expect(encrypted.tokenAuthTag).toBeDefined();

    const decrypted = service.decryptToken({
      tokenCiphertext: encrypted.tokenCiphertext,
      tokenIv: encrypted.tokenIv,
      tokenAuthTag: encrypted.tokenAuthTag,
    });

    expect(decrypted).toBe(token);
  });

  it('should fail decryption if auth tag is tampered', () => {
    const token = 'sample-secret-token';
    const encrypted = service.encryptToken(token);

    expect(() => {
      service.decryptToken({
        tokenCiphertext: encrypted.tokenCiphertext,
        tokenIv: encrypted.tokenIv,
        tokenAuthTag: '00000000000000000000000000000000',
      });
    }).toThrow();
  });
});
