import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../database/prisma.service';
import {
  ContainerType,
  TransportHandoverStatus,
} from '../../../../generated/prisma/client';
import { ExternalHandoverQueryService } from './external-handover-query.service';

describe('ExternalHandoverQueryService', () => {
  let service: ExternalHandoverQueryService;
  let prisma: {
    transportHandover: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  const principal = {
    clientId: 'client-1',
    partnerCode: 'PARTNER-01',
    partnerName: 'Test Partner',
    scopes: ['handover.read'],
  };

  beforeEach(async () => {
    prisma = {
      transportHandover: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalHandoverQueryService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ExternalHandoverQueryService>(
      ExternalHandoverQueryService,
    );
  });

  describe('findMany', () => {
    it('scopes query to partnerApiClientId and maps response with snake_case', async () => {
      prisma.transportHandover.count.mockResolvedValue(1);
      prisma.transportHandover.findMany.mockResolvedValue([
        {
          id: 'handover-1',
          transportCode: 'TR-100',
          status: TransportHandoverStatus.READY_FOR_HANDOVER,
          readyAt: new Date('2026-09-19T08:00:00Z'),
          expectedDeliveryAt: new Date('2026-09-19T14:00:00Z'),
          containerVisit: {
            container: {
              containerNumber: 'CONT-100',
              type: ContainerType.DRY,
            },
          },
          warehouse: {
            code: 'WH-01',
            name: 'Kho A',
            address: '123 Đường B',
          },
        },
      ]);

      const result = await service.findMany({ page: 1, limit: 10 }, principal);

      expect(prisma.transportHandover.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partnerApiClientId: 'client-1',
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        handover_id: 'handover-1',
        transport_code: 'TR-100',
        container_code: 'CONT-100',
        container_type: ContainerType.DRY,
        status: TransportHandoverStatus.READY_FOR_HANDOVER,
        ready_at: new Date('2026-09-19T08:00:00Z'),
        expected_delivery_at: new Date('2026-09-19T14:00:00Z'),
        warehouse: {
          code: 'WH-01',
          name: 'Kho A',
          address: '123 Đường B',
        },
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        total_pages: 1,
      });
    });
  });

  describe('getByIdOrThrow', () => {
    it('throws NotFoundException if handover not found or belongs to another partner', async () => {
      prisma.transportHandover.findFirst.mockResolvedValue(null);

      await expect(
        service.getByIdOrThrow('non-existent-id', principal),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns detailed handover with container and warehouse view', async () => {
      prisma.transportHandover.findFirst.mockResolvedValue({
        id: 'handover-1',
        transportCode: 'TR-100',
        status: TransportHandoverStatus.READY_FOR_HANDOVER,
        readyAt: new Date('2026-09-19T08:00:00Z'),
        expectedDeliveryAt: null,
        warehouse: {
          code: 'WH-01',
          name: 'Kho A',
          address: '123 Đường B',
          latitude: '10.1234567',
          longitude: '106.1234567',
          contactName: 'Nguyen Van A',
          contactPhone: '0901234567',
        },
        containerVisit: {
          gateOutAt: new Date('2026-09-19T07:30:00Z'),
          grossWeight: '22000',
          container: {
            containerNumber: 'CONT-100',
            type: ContainerType.DRY,
          },
          houseBl: {
            consignee: {
              name: 'Cong ty ABC',
            },
          },
          reception: {
            actualSeal: 'SEAL-888',
            actualWeight: '22000',
          },
        },
        confirmations: [],
      });

      const result = await service.getByIdOrThrow('handover-1', principal);

      expect(result.handover_id).toBe('handover-1');
      expect(result.transport_code).toBe('TR-100');
      expect(result.container.container_code).toBe('CONT-100');
      expect(result.container.seal).toBe('SEAL-888');
      expect(result.consignee.name).toBe('Cong ty ABC');
      expect(result.warehouse.code).toBe('WH-01');
    });
  });
});
