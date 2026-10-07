import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../../database/prisma.service';
import { PartnerApiClientStatus } from '../../../../generated/prisma/client';
import type { PartnerApiPrincipal } from '../types/partner-api.types';

export function hashPartnerApiKey(rawApiKey: string): string {
  return crypto.createHash('sha256').update(rawApiKey).digest('hex');
}

@Injectable()
export class PartnerApiAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async authenticate(
    rawApiKey: string | undefined,
  ): Promise<PartnerApiPrincipal> {
    if (!rawApiKey) {
      throw new UnauthorizedException({
        code: 'PARTNER_API_KEY_REQUIRED',
        message: 'X-API-Key is required.',
      });
    }

    if (!rawApiKey.startsWith('pk_live_')) {
      throw new UnauthorizedException({
        code: 'PARTNER_API_KEY_INVALID',
        message: 'Invalid API key.',
      });
    }

    const apiKeyHash = hashPartnerApiKey(rawApiKey);

    const client = await this.prisma.partnerApiClient.findUnique({
      where: {
        apiKeyHash,
      },
      select: {
        id: true,
        partnerCode: true,
        partnerName: true,
        status: true,
        scopes: true,
      },
    });

    /**
     * Không phân biệt key không tồn tại với hash sai để tránh enumeration.
     */
    if (!client) {
      throw new UnauthorizedException({
        code: 'PARTNER_API_KEY_INVALID',
        message: 'Invalid API key.',
      });
    }

    if (client.status === PartnerApiClientStatus.REVOKED) {
      throw new UnauthorizedException({
        code: 'PARTNER_CLIENT_REVOKED',
        message: 'Partner API client has been revoked.',
      });
    }

    return {
      clientId: client.id,
      partnerCode: client.partnerCode,
      partnerName: client.partnerName,
      scopes: Array.isArray(client.scopes) ? (client.scopes as string[]) : [],
    };
  }
}
