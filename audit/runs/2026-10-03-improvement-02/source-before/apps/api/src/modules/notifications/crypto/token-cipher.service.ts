import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

export interface EncryptedTokenData {
  tokenHash: string;
  tokenCiphertext: string;
  tokenIv: string;
  tokenAuthTag: string;
}

@Injectable()
export class TokenCipherService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey =
      this.configService.get<string>('TOKEN_ENCRYPTION_KEY') ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Ensure 32-byte Buffer
    if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
      this.encryptionKey = Buffer.from(rawKey, 'hex');
    } else {
      this.encryptionKey = crypto.createHash('sha256').update(rawKey).digest();
    }
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  encryptToken(token: string): EncryptedTokenData {
    const trimmed = token.trim();
    const tokenHash = this.hashToken(trimmed);
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let ciphertext = cipher.update(trimmed, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return {
      tokenHash,
      tokenCiphertext: ciphertext,
      tokenIv: iv.toString('hex'),
      tokenAuthTag: authTag,
    };
  }

  decryptToken(encrypted: {
    tokenCiphertext: string;
    tokenIv: string;
    tokenAuthTag: string;
  }): string {
    const iv = Buffer.from(encrypted.tokenIv, 'hex');
    const authTag = Buffer.from(encrypted.tokenAuthTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.tokenCiphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
