import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ContainerVisitStatus,
  Prisma,
  YardRecommendationAlgorithm,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import type { PrismaService } from '../../../database/prisma.service';
import { MlClient } from './ml-client.client';
import { YardRecommendationService } from './yard-recommendation.service';

describe('YardRecommendationService', () => {
  let service: YardRecommendationService;
  let mockPrisma: {
    containerVisit: { findFirst: jest.Mock };
    containerLocationLog: { findFirst: jest.Mock };
    yardSlot: { findMany: jest.Mock };
    yardRecommendation: { create: jest.Mock };
    yardRecommendationCandidate: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockMlClient: { rerankCandidates: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  const sampleActor: AuthenticatedUser = {
    id: 'user-1',
    sessionId: 'session-1',
    name: 'Yard Operator',
    email: 'yard@icd.local',
    roleCodes: ['YARD_OPERATOR'],
    icdId: 'icd-1',
    permissionCodes: ['YARD_UPDATE', 'YARD_READ'],
  };

  const sampleVisit = {
    id: 'visit-1',
    icdId: 'icd-1',
    status: ContainerVisitStatus.IN_YARD,
    category: 'IMPORT',
    dwellDays: 3,
    grossWeight: new Prisma.Decimal(24000),
    container: {
      containerNumber: 'TCKU1234567',
      type: 'DRY_40',
    },
    reception: {
      actualWeight: new Prisma.Decimal(24000),
    },
  };

  const sampleSlots = [
    {
      id: 'slot-1',
      slotCode: 'A-01-01-1',
      rowNo: '01',
      bayNo: '01',
      tierNo: '1',
      reeferPower: false,
      maxWeight: new Prisma.Decimal(30000),
      operational: true,
      yardBlock: {
        id: 'block-1',
        blockCode: 'A',
        operational: true,
      },
    },
    {
      id: 'slot-2',
      slotCode: 'A-01-01-2',
      rowNo: '01',
      bayNo: '01',
      tierNo: '2',
      reeferPower: false,
      maxWeight: new Prisma.Decimal(30000),
      operational: true,
      yardBlock: {
        id: 'block-1',
        blockCode: 'A',
        operational: true,
      },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      containerVisit: {
        findFirst: jest.fn(),
      },
      containerLocationLog: {
        findFirst: jest.fn(),
      },
      yardSlot: {
        findMany: jest.fn(),
      },
      yardRecommendation: {
        create: jest.fn(),
      },
      yardRecommendationCandidate: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    mockMlClient = {
      rerankCandidates: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RECOMMENDATION_SECRET') return 'test-secret-key-1234567890';
        return null;
      }),
    };

    service = new YardRecommendationService(
      mockPrisma as unknown as PrismaService,
      mockMlClient as unknown as MlClient,
      mockConfigService as unknown as ConfigService,
    );
  });

  it('throws NotFoundException if visit not found', async () => {
    mockPrisma.containerVisit.findFirst.mockResolvedValue(null);

    await expect(service.getRecommendations('nonexistent', sampleActor)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException if container visit is not IN_YARD', async () => {
    mockPrisma.containerVisit.findFirst.mockResolvedValue({
      ...sampleVisit,
      status: ContainerVisitStatus.ARRIVED,
    });

    await expect(service.getRecommendations('visit-1', sampleActor)).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws ConflictException if container already has active location', async () => {
    mockPrisma.containerVisit.findFirst.mockResolvedValue(sampleVisit);
    mockPrisma.containerLocationLog.findFirst.mockResolvedValue({ id: 'loc-1' });

    await expect(service.getRecommendations('visit-1', sampleActor)).rejects.toThrow(
      ConflictException,
    );
  });

  it('falls back to RULE_BASED_V1 when ML client returns null (service down/timeout)', async () => {
    mockPrisma.containerVisit.findFirst.mockResolvedValue(sampleVisit);
    mockPrisma.containerLocationLog.findFirst.mockResolvedValue(null);
    mockPrisma.yardSlot.findMany.mockResolvedValue(sampleSlots);
    mockMlClient.rerankCandidates.mockResolvedValue(null);

    const result = await service.getRecommendations('visit-1', sampleActor);

    expect(result.algorithm).toBe(YardRecommendationAlgorithm.RULE_BASED_V1);
    expect(result.modelVersion).toBeNull();
    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.ruleScore).toBe(100);
    expect(result.data[0]!.mlProbability).toBeNull();
    expect(result.contextToken).toBeDefined();

    expect(mockPrisma.yardRecommendation.create).toHaveBeenCalled();
  });

  it('applies ML reranking when ML client succeeds', async () => {
    mockPrisma.containerVisit.findFirst.mockResolvedValue(sampleVisit);
    mockPrisma.containerLocationLog.findFirst.mockResolvedValue(null);
    mockPrisma.yardSlot.findMany.mockResolvedValue(sampleSlots);
    mockMlClient.rerankCandidates.mockResolvedValue({
      modelVersion: 'ml-yard-model-v2.1',
      candidates: [
        { yardSlotId: 'slot-2', mlProbability: 0.92, mlRank: 1 },
        { yardSlotId: 'slot-1', mlProbability: 0.45, mlRank: 2 },
      ],
    });

    const result = await service.getRecommendations('visit-1', sampleActor);

    expect(result.algorithm).toBe(YardRecommendationAlgorithm.ML_RERANK);
    expect(result.modelVersion).toBe('ml-yard-model-v2.1');
    expect(result.data[0]!.yardSlotId).toBe('slot-2');
    expect(result.data[0]!.rank).toBe(1);
    expect(result.data[0]!.mlProbability).toBe(0.92);
    expect(result.data[1]!.yardSlotId).toBe('slot-1');
  });

  it('verifies context token accurately', () => {
    const recId = 'rec-123';
    const visitId = 'visit-123';
    const token = service.generateContextToken(recId, visitId);

    expect(service.verifyContextToken(recId, visitId, token)).toBe(true);
    expect(service.verifyContextToken(recId, 'other-visit', token)).toBe(false);
  });

  it('records selection feedback on slot assign', async () => {
    await service.recordFeedback(mockPrisma as any, 'rec-1', 'slot-1');

    expect(mockPrisma.yardRecommendationCandidate.updateMany).toHaveBeenCalledWith({
      where: {
        recommendationId: 'rec-1',
        yardSlotId: 'slot-1',
      },
      data: {
        selected: true,
        selectedAt: expect.any(Date),
      },
    });
  });
});
