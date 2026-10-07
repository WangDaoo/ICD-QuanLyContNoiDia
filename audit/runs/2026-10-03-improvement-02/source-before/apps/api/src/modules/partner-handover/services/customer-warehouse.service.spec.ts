import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../database/prisma.service';
import { CustomerWarehouseService } from './customer-warehouse.service';

describe('CustomerWarehouseService', () => {
  let service: CustomerWarehouseService;
  let prisma: {
    customerWarehouse: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    consignee: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      customerWarehouse: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      consignee: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerWarehouseService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomerWarehouseService>(CustomerWarehouseService);
  });

  describe('create', () => {
    it('creates a new warehouse successfully', async () => {
      prisma.customerWarehouse.findUnique.mockResolvedValue(null);
      prisma.consignee.findUnique.mockResolvedValue({ id: 'consignee-1' });
      prisma.customerWarehouse.create.mockResolvedValue({
        id: 'wh-1',
        icdId: 'ICD01',
        code: 'WH_SAMSUNG_01',
        name: 'Samsung Bac Ninh Hub',
        consigneeId: 'consignee-1',
      });

      const result = await service.create(
        {
          code: 'WH_SAMSUNG_01',
          name: 'Samsung Bac Ninh Hub',
          consigneeId: 'consignee-1',
        },
        'ICD01',
      );

      expect(result.id).toBe('wh-1');
      expect(prisma.customerWarehouse.create).toHaveBeenCalled();
    });

    it('throws ConflictException on duplicate code in same ICD', async () => {
      prisma.customerWarehouse.findUnique.mockResolvedValue({ id: 'wh-1' });

      await expect(
        service.create(
          {
            code: 'WH_SAMSUNG_01',
            name: 'Samsung Duplicate Hub',
          },
          'ICD01',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates warehouse successfully', async () => {
      prisma.customerWarehouse.findFirst.mockResolvedValue({
        id: 'wh-1',
        icdId: 'ICD01',
      });
      prisma.customerWarehouse.update.mockResolvedValue({
        id: 'wh-1',
        name: 'Updated Hub',
      });

      const result = await service.update(
        'wh-1',
        { name: 'Updated Hub' },
        'ICD01',
      );

      expect(result.name).toBe('Updated Hub');
    });

    it('throws NotFoundException if warehouse does not exist', async () => {
      prisma.customerWarehouse.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'Any' }, 'ICD01'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
