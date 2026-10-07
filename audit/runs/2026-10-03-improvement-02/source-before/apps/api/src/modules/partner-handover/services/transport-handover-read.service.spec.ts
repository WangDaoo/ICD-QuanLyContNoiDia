import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../database/prisma.service';
import type { QueryTransportHandoverDto } from '../dto/query-transport-handover.dto';
import { TransportHandoverReadService } from './transport-handover-read.service';

describe('TransportHandoverReadService', () => {
  let service: TransportHandoverReadService;
  let prisma: {
    transportHandover: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      transportHandover: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new TransportHandoverReadService(
      prisma as unknown as PrismaService,
    );
  });

  it('returns paginated handovers with canonical metadata', async () => {
    const items = [{ id: 'handover-1' }];
    prisma.transportHandover.count.mockResolvedValue(21);
    prisma.transportHandover.findMany.mockResolvedValue(items);

    await expect(
      service.findMany('icd-1', {
        page: 2,
        pageSize: 10,
      } as QueryTransportHandoverDto),
    ).resolves.toEqual({
      data: items,
      meta: {
        page: 2,
        pageSize: 10,
        total: 21,
        totalPages: 3,
      },
    });

    expect(prisma.transportHandover.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });

  it('hides handover detail outside actor ICD ownership', async () => {
    prisma.transportHandover.findUnique.mockResolvedValue({
      containerVisit: { icdId: 'icd-2' },
    });

    await expect(service.findById('handover-1', 'icd-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns empty summary when container visit has no handover', async () => {
    prisma.transportHandover.findFirst.mockResolvedValue(null);

    await expect(
      service.findSummaryByContainerVisit('visit-1', 'icd-1'),
    ).resolves.toEqual({
      containerVisitId: 'visit-1',
      handover: null,
    });
  });
});
