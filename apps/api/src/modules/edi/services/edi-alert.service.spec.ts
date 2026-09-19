import { EdiAlertService } from './edi-alert.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  EdiAlertSeverity,
  EdiAlertSourceType,
  EdiAlertStatus,
  EdiAlertType,
} from '../../../generated/prisma/client';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { BadRequestException } from '@nestjs/common';

describe('EdiAlertService', () => {
  let service: EdiAlertService;
  let mockPrisma: {
    ediAlert: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    ediOutboxMessage: {
      findMany: jest.Mock;
    };
    ediAcknowledgement: {
      findMany: jest.Mock;
    };
  };
  let mockAudit: {
    record: jest.Mock;
  };

  const mockActor: AuthenticatedUser = {
    id: 'user-1',
    icdId: 'icd-1',
    email: 'test@example.com',
    role: 'OPERATIONS',
    permissions: [],
  };

  beforeEach(() => {
    mockPrisma = {
      ediAlert: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      ediOutboxMessage: {
        findMany: jest.fn(),
      },
      ediAcknowledgement: {
        findMany: jest.fn(),
      },
    };

    mockAudit = {
      record: jest.fn().mockResolvedValue({}),
    };

    service = new EdiAlertService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('createOrUpdateAlert', () => {
    it('should create a new alert if it does not exist', async () => {
      mockPrisma.ediAlert.findUnique.mockResolvedValue(null);
      mockPrisma.ediAlert.create.mockResolvedValue({
        id: 'alert-1',
        status: EdiAlertStatus.OPEN,
        occurrenceCount: 1,
      });

      const result = await service.createOrUpdateAlert({
        icdId: 'icd-1',
        sourceType: EdiAlertSourceType.OUTBOX,
        sourceId: 'outbox-1',
        alertType: EdiAlertType.DELIVERY_FAILURE,
        severity: EdiAlertSeverity.ERROR,
        title: 'Lỗi gửi tin',
        message: 'Timeout',
      });

      expect(result.id).toBe('alert-1');
      expect(mockPrisma.ediAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            icdId: 'icd-1',
            status: EdiAlertStatus.OPEN,
            occurrenceCount: 1,
          }),
        }),
      );
    });

    it('should increment occurrenceCount on existing active alert', async () => {
      mockPrisma.ediAlert.findUnique.mockResolvedValue({
        id: 'alert-2',
        status: EdiAlertStatus.OPEN,
        occurrenceCount: 1,
      });
      mockPrisma.ediAlert.update.mockResolvedValue({
        id: 'alert-2',
        occurrenceCount: 2,
      });

      await service.createOrUpdateAlert({
        icdId: 'icd-1',
        sourceType: EdiAlertSourceType.OUTBOX,
        sourceId: 'outbox-1',
        alertType: EdiAlertType.DELIVERY_FAILURE,
        severity: EdiAlertSeverity.ERROR,
        title: 'Lỗi gửi tin',
        message: 'Timeout lần 2',
      });

      expect(mockPrisma.ediAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-2' },
        data: expect.objectContaining({
          occurrenceCount: { increment: 1 },
        }),
      });
    });

    it('should reopen resolved alert when same incident recurs', async () => {
      mockPrisma.ediAlert.findUnique.mockResolvedValue({
        id: 'alert-3',
        status: EdiAlertStatus.RESOLVED,
        occurrenceCount: 2,
      });
      mockPrisma.ediAlert.update.mockResolvedValue({
        id: 'alert-3',
        status: EdiAlertStatus.OPEN,
      });

      await service.createOrUpdateAlert({
        icdId: 'icd-1',
        sourceType: EdiAlertSourceType.ACKNOWLEDGEMENT,
        sourceId: 'ack-1',
        alertType: EdiAlertType.ACK_REJECTED,
        severity: EdiAlertSeverity.ERROR,
        title: 'ACK Rejected',
        message: 'Container not found',
      });

      expect(mockPrisma.ediAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-3' },
        data: expect.objectContaining({
          status: EdiAlertStatus.OPEN,
          acknowledgedById: null,
          resolvedById: null,
        }),
      });
    });
  });

  describe('acknowledgeAlert', () => {
    it('should transition OPEN alert to ACKNOWLEDGED', async () => {
      mockPrisma.ediAlert.findFirst.mockResolvedValue({
        id: 'alert-1',
        icdId: 'icd-1',
        status: EdiAlertStatus.OPEN,
      });
      mockPrisma.ediAlert.update.mockResolvedValue({
        id: 'alert-1',
        status: EdiAlertStatus.ACKNOWLEDGED,
      });

      const result = await service.acknowledgeAlert('alert-1', mockActor);

      expect(result.status).toBe(EdiAlertStatus.ACKNOWLEDGED);
      expect(mockPrisma.ediAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          status: EdiAlertStatus.ACKNOWLEDGED,
          acknowledgedById: mockActor.id,
        }),
      });
      expect(mockAudit.record).toHaveBeenCalled();
    });

    it('should throw BadRequestException if alert is not OPEN', async () => {
      mockPrisma.ediAlert.findFirst.mockResolvedValue({
        id: 'alert-1',
        icdId: 'icd-1',
        status: EdiAlertStatus.ACKNOWLEDGED,
      });

      await expect(
        service.acknowledgeAlert('alert-1', mockActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveAlert', () => {
    it('should transition alert to RESOLVED with resolution note', async () => {
      mockPrisma.ediAlert.findFirst.mockResolvedValue({
        id: 'alert-1',
        icdId: 'icd-1',
        status: EdiAlertStatus.ACKNOWLEDGED,
      });
      mockPrisma.ediAlert.update.mockResolvedValue({
        id: 'alert-1',
        status: EdiAlertStatus.RESOLVED,
      });

      const result = await service.resolveAlert(
        'alert-1',
        { resolutionNote: 'Config re-verified with shipping line' },
        mockActor,
      );

      expect(result.status).toBe(EdiAlertStatus.RESOLVED);
      expect(mockPrisma.ediAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: expect.objectContaining({
          status: EdiAlertStatus.RESOLVED,
          resolvedById: mockActor.id,
          resolutionNote: 'Config re-verified with shipping line',
        }),
      });
      expect(mockAudit.record).toHaveBeenCalled();
    });

    it('should throw BadRequestException if alert is already RESOLVED', async () => {
      mockPrisma.ediAlert.findFirst.mockResolvedValue({
        id: 'alert-1',
        icdId: 'icd-1',
        status: EdiAlertStatus.RESOLVED,
      });

      await expect(
        service.resolveAlert(
          'alert-1',
          { resolutionNote: 'Already done' },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
