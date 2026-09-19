import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import {
  ContainerVisitStatus,
  PartnerApiClientStatus,
  TransportHandoverStatus,
} from '../../../generated/prisma/client';
import { HandoverService } from './handover.service';

describe('HandoverService', () => {
  let service: HandoverService;
  let prisma: {
    $transaction: jest.Mock;
    transportHandover: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      transportHandover: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandoverService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<HandoverService>(HandoverService);
  });

  describe('create', () => {
    it('creates a new DRAFT handover for EXITED container visit', async () => {
      const mockTx = {
        containerVisit: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'visit-1',
            icdId: 'ICD01',
            status: ContainerVisitStatus.EXITED,
            container: { id: 'c-1', containerNumber: 'MSKU1234567' },
          }),
        },
        transportHandover: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'handover-1',
            transportCode: 'HO-2026-0001',
            status: TransportHandoverStatus.DRAFT,
          }),
        },
        partnerApiClient: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'partner-1',
            partnerCode: 'LOG_A',
            status: PartnerApiClientStatus.ACTIVE,
          }),
        },
        customerWarehouse: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'wh-1',
            icdId: 'ICD01',
            active: true,
          }),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await service.create(
        {
          containerVisitId: 'visit-1',
          partnerApiClientId: 'partner-1',
          warehouseId: 'wh-1',
          transportCode: 'HO-2026-0001',
        },
        'user-1',
        'ICD01',
      );

      expect(result.id).toBe('handover-1');
      expect(mockTx.transportHandover.create).toHaveBeenCalled();
    });

    it('rejects handover creation if container visit is not EXITED', async () => {
      const mockTx = {
        containerVisit: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'visit-1',
            icdId: 'ICD01',
            status: ContainerVisitStatus.IN_YARD,
          }),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(
        service.create(
          {
            containerVisitId: 'visit-1',
            partnerApiClientId: 'partner-1',
            warehouseId: 'wh-1',
            transportCode: 'HO-2026-0001',
          },
          'user-1',
          'ICD01',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects handover creation if container visit already has active handover', async () => {
      const mockTx = {
        containerVisit: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'visit-1',
            icdId: 'ICD01',
            status: ContainerVisitStatus.EXITED,
          }),
        },
        transportHandover: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'existing-handover',
            transportCode: 'HO-OLD',
            status: TransportHandoverStatus.READY_FOR_HANDOVER,
          }),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(
        service.create(
          {
            containerVisitId: 'visit-1',
            partnerApiClientId: 'partner-1',
            warehouseId: 'wh-1',
            transportCode: 'HO-2026-0001',
          },
          'user-1',
          'ICD01',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('publish', () => {
    it('publishes handover from DRAFT to READY_FOR_HANDOVER', async () => {
      const mockTx = {
        transportHandover: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'handover-1',
            status: TransportHandoverStatus.DRAFT,
            containerVisit: { icdId: 'ICD01' },
          }),
          update: jest.fn().mockResolvedValue({
            id: 'handover-1',
            status: TransportHandoverStatus.READY_FOR_HANDOVER,
          }),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await service.publish('handover-1', 'user-1', 'ICD01');
      expect(result.status).toBe(TransportHandoverStatus.READY_FOR_HANDOVER);
      expect(mockTx.transportHandover.update).toHaveBeenCalled();
    });

    it('throws NotFoundException if handover does not exist', async () => {
      const mockTx = {
        transportHandover: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(
        service.publish('non-existing', 'user-1', 'ICD01'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
