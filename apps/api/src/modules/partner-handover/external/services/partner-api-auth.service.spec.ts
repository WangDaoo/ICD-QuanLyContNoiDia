import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../database/prisma.service';
import { PartnerApiClientStatus } from '../../../../generated/prisma/client';
import {
  hashPartnerApiKey,
  PartnerApiAuthService,
} from './partner-api-auth.service';

describe('PartnerApiAuthService', () => {
  let service: PartnerApiAuthService;
  let prisma: {
    partnerApiClient: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      partnerApiClient: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerApiAuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PartnerApiAuthService>(PartnerApiAuthService);
  });

  it('throws UnauthorizedException if x-api-key is missing', async () => {
    await expect(service.authenticate(undefined)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException if x-api-key prefix is invalid', async () => {
    await expect(service.authenticate('invalid_prefix_12345')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException if client is not found', async () => {
    prisma.partnerApiClient.findUnique.mockResolvedValue(null);

    await expect(service.authenticate('pk_live_unknownkey123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException if client is REVOKED', async () => {
    prisma.partnerApiClient.findUnique.mockResolvedValue({
      id: 'client-1',
      partnerCode: 'PARTNER-01',
      partnerName: 'Test Partner',
      status: PartnerApiClientStatus.REVOKED,
      scopes: ['handover.read'],
    });

    await expect(
      service.authenticate('pk_live_revokedkey12345678'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns PartnerApiPrincipal for valid ACTIVE key', async () => {
    const rawKey = 'pk_live_validkey1234567890123456';
    const hash = hashPartnerApiKey(rawKey);

    prisma.partnerApiClient.findUnique.mockResolvedValue({
      id: 'client-1',
      partnerCode: 'PARTNER-01',
      partnerName: 'Test Partner',
      status: PartnerApiClientStatus.ACTIVE,
      scopes: ['handover.read', 'handover.accept'],
    });

    const result = await service.authenticate(rawKey);

    expect(prisma.partnerApiClient.findUnique).toHaveBeenCalledWith({
      where: { apiKeyHash: hash },
      select: expect.any(Object),
    });
    expect(result).toEqual({
      clientId: 'client-1',
      partnerCode: 'PARTNER-01',
      partnerName: 'Test Partner',
      scopes: ['handover.read', 'handover.accept'],
    });
  });
});
