import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { PartnerApiClientStatus } from '../../../generated/prisma/client';
import { PartnerClientService } from './partner-client.service';

describe('PartnerClientService', () => {
  let service: PartnerClientService;
  let prisma: {
    partnerApiClient: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      partnerApiClient: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerClientService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PartnerClientService>(PartnerClientService);
  });

  describe('create', () => {
    it('creates a new partner client with hashed API key', async () => {
      prisma.partnerApiClient.findUnique.mockResolvedValue(null);
      prisma.partnerApiClient.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'client-1',
          partnerCode: data.partnerCode,
          partnerName: data.partnerName,
          keyLast4: data.keyLast4,
          status: data.status,
          scopes: data.scopes,
          createdAt: new Date(),
        }),
      );

      const result = await service.create(
        {
          partnerCode: 'PARTNER_LOGISTICS_A',
          partnerName: 'Công ty Vận Tải A',
          scopes: ['handovers:read', 'handovers:confirm'],
        },
        'user-admin-1',
      );

      expect(result.rawApiKey).toMatch(/^pk_live_/);
      expect(result.client.partnerCode).toBe('PARTNER_LOGISTICS_A');
      expect(result.client.keyLast4).toBe(result.rawApiKey.slice(-4));
      expect(prisma.partnerApiClient.create).toHaveBeenCalled();
    });

    it('throws ConflictException if partnerCode already exists', async () => {
      prisma.partnerApiClient.findUnique.mockResolvedValue({
        id: 'client-1',
        partnerCode: 'PARTNER_A',
      });

      await expect(
        service.create(
          {
            partnerCode: 'PARTNER_A',
            partnerName: 'Duplicate Corp',
            scopes: ['handovers:read'],
          },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('rotateKey', () => {
    it('rotates api key for active client', async () => {
      prisma.partnerApiClient.findUnique.mockResolvedValue({
        id: 'client-1',
        partnerCode: 'PARTNER_A',
        status: PartnerApiClientStatus.ACTIVE,
        scopes: ['handovers:read'],
      });

      prisma.partnerApiClient.update.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'client-1',
          partnerCode: 'PARTNER_A',
          partnerName: 'Partner A',
          keyLast4: data.keyLast4,
          status: PartnerApiClientStatus.ACTIVE,
          scopes: ['handovers:read'],
          rotatedAt: data.rotatedAt,
        }),
      );

      const result = await service.rotateKey('client-1', 'user-1');
      expect(result.rawApiKey).toMatch(/^pk_live_/);
      expect(result.client.keyLast4).toBe(result.rawApiKey.slice(-4));
    });

    it('throws ConflictException if client is REVOKED', async () => {
      prisma.partnerApiClient.findUnique.mockResolvedValue({
        id: 'client-1',
        status: PartnerApiClientStatus.REVOKED,
      });

      await expect(service.rotateKey('client-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException if client not found', async () => {
      prisma.partnerApiClient.findUnique.mockResolvedValue(null);

      await expect(service.rotateKey('non-existing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revoke', () => {
    it('revokes partner client access', async () => {
      prisma.partnerApiClient.findUnique.mockResolvedValue({
        id: 'client-1',
        status: PartnerApiClientStatus.ACTIVE,
      });

      prisma.partnerApiClient.update.mockResolvedValue({
        id: 'client-1',
        partnerCode: 'PARTNER_A',
        partnerName: 'Partner A',
        status: PartnerApiClientStatus.REVOKED,
        revokedAt: new Date(),
      });

      const result = await service.revoke('client-1', 'user-1');
      expect(result.status).toBe(PartnerApiClientStatus.REVOKED);
    });
  });
});
