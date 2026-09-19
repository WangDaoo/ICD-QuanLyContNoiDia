import {
  ContainerVisitStatus,
  Prisma,
  YardLocationSource,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import type { PrismaService } from '../../../database/prisma.service';
import { CONTAINER_EVENT_TYPES } from '../../containers/constants/container-event-types.constants';
import type { ContainerEventService } from '../../containers/services/container-event.service';
import { YardAssignmentPolicy } from '../policies/yard-assignment.policy';
import type { YardRecommendationService } from '../recommendation/yard-recommendation.service';
import { YardAssignmentService } from './yard-assignment.service';
import type { YardLocationService } from './yard-location.service';

describe('YardAssignmentService', () => {
  let service: YardAssignmentService;
  let mockPrisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    containerVisit: { findFirst: jest.Mock };
    yardSlot: { findFirst: jest.Mock };
    containerLocationLog: { findFirst: jest.Mock; create: jest.Mock };
  };
  let mockPolicy: YardAssignmentPolicy;
  let mockLocationService: { findCurrentForVisit: jest.Mock };
  let mockEventService: { record: jest.Mock };
  let mockRecommendationService: { getRecommendations: jest.Mock; recordFeedback: jest.Mock };

  const sampleActor: AuthenticatedUser = {
    id: 'user-1',
    username: 'yard_op',
    fullName: 'Yard Operator',
    role: 'YARD_OPERATOR',
    icdId: 'icd-1',
    permissions: ['YARD_UPDATE', 'YARD_READ'],
  };

  const sampleVisit = {
    id: 'visit-1',
    icdId: 'icd-1',
    status: ContainerVisitStatus.IN_YARD,
    category: 'IMPORT',
    grossWeight: new Prisma.Decimal(20000),
    container: {
      containerNumber: 'TCKU1234567',
      type: 'DRY_40',
    },
    reception: {
      actualWeight: new Prisma.Decimal(20000),
    },
  };

  const sampleSlot = {
    id: 'slot-1',
    slotCode: 'A-01-01-1',
    rowNo: '01',
    bayNo: '01',
    tierNo: '1',
    reeferPower: false,
    maxWeight: new Prisma.Decimal(30000),
    operational: true,
    supportedContainerType: null,
    yardBlock: {
      id: 'block-1',
      blockCode: 'A',
      operational: true,
    },
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      containerVisit: {
        findFirst: jest.fn().mockResolvedValue(sampleVisit),
      },
      yardSlot: {
        findFirst: jest.fn().mockResolvedValue(sampleSlot),
      },
      containerLocationLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'loc-1',
          containerVisitId: 'visit-1',
          yardSlotId: 'slot-1',
          source: YardLocationSource.ML,
          recommendationId: 'rec-1',
          startedAt: new Date(),
          endedAt: null,
          yardSlot: sampleSlot,
        }),
      },
    };

    mockPolicy = new YardAssignmentPolicy();
    mockLocationService = {
      findCurrentForVisit: jest.fn().mockResolvedValue(null),
    };
    mockEventService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    mockRecommendationService = {
      getRecommendations: jest.fn().mockResolvedValue({ algorithm: 'ML_RERANK', data: [] }),
      recordFeedback: jest.fn().mockResolvedValue(undefined),
    };

    service = new YardAssignmentService(
      mockPrisma as unknown as PrismaService,
      mockPolicy,
      mockLocationService as unknown as YardLocationService,
      mockEventService as unknown as ContainerEventService,
      mockRecommendationService as unknown as YardRecommendationService,
    );
  });

  it('delegates getRecommendations to recommendation service', async () => {
    await service.getRecommendations('visit-1', sampleActor);
    expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith('visit-1', sampleActor);
  });

  it('assigns slot with ML source, links recommendationId and triggers feedback recording', async () => {
    mockPrisma.containerLocationLog.findFirst
      .mockResolvedValueOnce(null) // occupancy check
      .mockResolvedValueOnce({
        id: 'loc-1',
        containerVisitId: 'visit-1',
        yardSlotId: 'slot-1',
        source: YardLocationSource.ML,
        recommendationId: 'rec-1',
        startedAt: new Date(),
        endedAt: null,
        yardSlot: sampleSlot,
      });

    await service.assign(
      'visit-1',
      {
        yardSlotId: 'slot-1',
        source: 'ML',
        recommendationId: 'rec-1',
      },
      sampleActor,
    );

    expect(mockPrisma.containerLocationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        containerVisitId: 'visit-1',
        yardSlotId: 'slot-1',
        source: YardLocationSource.ML,
        recommendationId: 'rec-1',
      }),
    });

    expect(mockRecommendationService.recordFeedback).toHaveBeenCalledWith(
      mockPrisma,
      'rec-1',
      'slot-1',
    );

    expect(mockEventService.record).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        containerVisitId: 'visit-1',
        eventType: CONTAINER_EVENT_TYPES.YARD_ASSIGNED,
        metadataJson: expect.objectContaining({
          source: 'ML',
          recommendationId: 'rec-1',
        }),
      }),
    );
  });
});
