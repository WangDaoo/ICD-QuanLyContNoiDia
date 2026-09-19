import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import {
  ContainerVisitStatus,
  PartnerApiClientStatus,
  TransportConfirmationType,
  TransportHandoverStatus,
} from '../../../generated/prisma/client';
import { HandoverService } from './handover.service';
import { TransportHandoverReviewService } from './transport-handover-review.service';

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
  let auditService: {
    record: jest.Mock;
  };
  let reviewService: {
    assertWithTx: jest.Mock;
    checkWithTx: jest.Mock;
  };

  const mockActor: AuthenticatedUser = {
    id: 'user-1',
    sessionId: 'session-1',
    name: 'Admin User',
    email: 'test@icd.local',
    roleCodes: ['ADMIN'],
    icdId: 'ICD01',
    permissionCodes: ['handover.confirm', 'handover.dispute'],
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
    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    reviewService = {
      assertWithTx: jest.fn().mockResolvedValue({
        passed: true,
        violations: [],
        containerVisitStatus: ContainerVisitStatus.EXITED,
        partnerApiClientStatus: PartnerApiClientStatus.ACTIVE,
      }),
      checkWithTx: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandoverService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: TransportHandoverReviewService, useValue: reviewService },
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

  describe('icdConfirm', () => {
    it('successfully confirms handover and transitions to COMPLETED', async () => {
      const mockTx = {
        $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'handover-1' }]),
        transportHandover: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'handover-1',
            status: TransportHandoverStatus.PARTNER_CONFIRMED,
            version: 1,
            containerVisit: { icdId: 'ICD01' },
          }),
          update: jest.fn().mockResolvedValue({
            id: 'handover-1',
            status: TransportHandoverStatus.COMPLETED,
            version: 2,
            icdConfirmedAt: new Date(),
            completedAt: new Date(),
          }),
        },
        transportConfirmation: {
          create: jest.fn().mockResolvedValue({ id: 'conf-1' }),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await service.icdConfirm(
        'handover-1',
        { note: 'Goods received intact at warehouse' },
        mockActor,
      );

      expect(reviewService.assertWithTx).toHaveBeenCalledWith(
        mockTx,
        'handover-1',
        'ICD01',
      );
      expect(mockTx.transportHandover.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'handover-1' },
          data: expect.objectContaining({
            status: TransportHandoverStatus.COMPLETED,
          }),
        }),
      );
      expect(mockTx.transportConfirmation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confirmationType: TransportConfirmationType.ICD_CONFIRMED,
          }),
        }),
      );
      expect(auditService.record).toHaveBeenCalled();
      expect(result.status).toBe(TransportHandoverStatus.COMPLETED);
    });

    it('rejects confirmation if handover is not PARTNER_CONFIRMED', async () => {
      const mockTx = {
        $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'handover-1' }]),
        transportHandover: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'handover-1',
            status: TransportHandoverStatus.IN_TRANSIT,
            containerVisit: { icdId: 'ICD01' },
          }),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      await expect(
        service.icdConfirm('handover-1', {}, mockActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dispute', () => {
    it('records dispute and transitions status to DISPUTED', async () => {
      const mockTx = {
        $queryRawUnsafe: jest.fn().mockResolvedValue([{ id: 'handover-1' }]),
        transportHandover: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'handover-1',
            status: TransportHandoverStatus.PARTNER_CONFIRMED,
            version: 1,
            containerVisit: { icdId: 'ICD01' },
          }),
          update: jest.fn().mockResolvedValue({
            id: 'handover-1',
            status: TransportHandoverStatus.DISPUTED,
            version: 2,
          }),
        },
        transportConfirmation: {
          create: jest.fn().mockResolvedValue({ id: 'conf-1' }),
        },
      };

      prisma.$transaction.mockImplementation((cb) => cb(mockTx));

      const result = await service.dispute(
        'handover-1',
        {
          reasonCode: 'SEAL_TAMPERED',
          note: 'Container seal does not match manifest',
          attachmentUrl: 'https://storage.local/proofs/seal.jpg',
        },
        mockActor,
      );

      expect(mockTx.transportHandover.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'handover-1' },
          data: expect.objectContaining({
            status: TransportHandoverStatus.DISPUTED,
          }),
        }),
      );
      expect(mockTx.transportConfirmation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confirmationType: TransportConfirmationType.DISPUTE,
            condition: 'SEAL_TAMPERED',
          }),
        }),
      );
      expect(auditService.record).toHaveBeenCalled();
      expect(result.status).toBe(TransportHandoverStatus.DISPUTED);
    });
  });
});

