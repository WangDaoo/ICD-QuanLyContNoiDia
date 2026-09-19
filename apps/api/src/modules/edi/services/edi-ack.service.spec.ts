import { EdiAckService } from './edi-ack.service';
import { PrismaService } from '../../../database/prisma.service';
import { EdiCorrelationService } from './edi-correlation.service';
import { EdiAlertService } from './edi-alert.service';
import { AuditService } from '../../audit/audit.service';
import {
  EdiAcknowledgementStatus,
  EdiAcknowledgementType,
  EdiAlertSeverity,
  EdiAlertSourceType,
  EdiAlertType,
} from '../../../generated/prisma/client';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('EdiAckService', () => {
  let service: EdiAckService;
  let mockPrisma: {
    shippingLine: {
      findUnique: jest.Mock;
    };
    ediAcknowledgement: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
  };
  let mockCorrelation: {
    correlate: jest.Mock;
  };
  let mockAlert: {
    createOrUpdateAlert: jest.Mock;
  };
  let mockAudit: {
    record: jest.Mock;
  };

  const mockActor: AuthenticatedUser = {
    id: 'user-1',
    icdId: 'icd-1',
    email: 'ops@icd.local',
    role: 'OPERATIONS',
    permissions: [],
  };

  beforeEach(() => {
    mockPrisma = {
      shippingLine: {
        findUnique: jest.fn(),
      },
      ediAcknowledgement: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };

    mockCorrelation = {
      correlate: jest.fn(),
    };

    mockAlert = {
      createOrUpdateAlert: jest.fn().mockResolvedValue({}),
    };

    mockAudit = {
      record: jest.fn().mockResolvedValue({}),
    };

    service = new EdiAckService(
      mockPrisma as unknown as PrismaService,
      mockCorrelation as unknown as EdiCorrelationService,
      mockAlert as unknown as EdiAlertService,
      mockAudit as unknown as AuditService,
    );
  });

  describe('ingestAck', () => {
    it('should throw NotFoundException if shippingLine does not exist', async () => {
      mockPrisma.shippingLine.findUnique.mockResolvedValue(null);

      await expect(
        service.ingestAck({
          shippingLineId: 'non-existent',
          ackType: EdiAcknowledgementType.CONTRL,
          status: EdiAcknowledgementStatus.ACCEPTED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if dedupeKey already exists', async () => {
      mockPrisma.shippingLine.findUnique.mockResolvedValue({
        id: 'ship-1',
        name: 'Maersk',
        scacCode: 'MAEU',
        ediRoutes: [{ icdId: 'icd-1' }],
      });
      mockPrisma.ediAcknowledgement.findUnique.mockResolvedValue({
        id: 'ack-existing',
      });

      await expect(
        service.ingestAck({
          shippingLineId: 'ship-1',
          ackType: EdiAcknowledgementType.CONTRL,
          status: EdiAcknowledgementStatus.ACCEPTED,
          dedupeKey: 'existing-key',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should ingest matched ACCEPTED ACK without generating alert', async () => {
      mockPrisma.shippingLine.findUnique.mockResolvedValue({
        id: 'ship-1',
        name: 'Maersk',
        scacCode: 'MAEU',
        ediRoutes: [{ icdId: 'icd-1' }],
      });
      mockPrisma.ediAcknowledgement.findUnique.mockResolvedValue(null);
      mockCorrelation.correlate.mockResolvedValue({
        matched: true,
        outboxMessage: {
          id: 'outbox-1',
          ediRoute: { icdId: 'icd-1' },
        },
      });
      mockPrisma.ediAcknowledgement.create.mockResolvedValue({
        id: 'ack-1',
        shippingLineId: 'ship-1',
        outboxMessageId: 'outbox-1',
        ackType: EdiAcknowledgementType.CONTRL,
        status: EdiAcknowledgementStatus.ACCEPTED,
      });

      const result = await service.ingestAck(
        {
          shippingLineId: 'ship-1',
          ackType: EdiAcknowledgementType.CONTRL,
          status: EdiAcknowledgementStatus.ACCEPTED,
          outboxMessageId: 'outbox-1',
        },
        mockActor,
      );

      expect(result.id).toBe('ack-1');
      expect(mockAlert.createOrUpdateAlert).not.toHaveBeenCalled();
      expect(mockAudit.record).toHaveBeenCalled();
    });

    it('should ingest REJECTED ACK and trigger incident alert', async () => {
      mockPrisma.shippingLine.findUnique.mockResolvedValue({
        id: 'ship-1',
        name: 'Maersk',
        scacCode: 'MAEU',
        ediRoutes: [{ icdId: 'icd-1' }],
      });
      mockPrisma.ediAcknowledgement.findUnique.mockResolvedValue(null);
      mockCorrelation.correlate.mockResolvedValue({
        matched: true,
        outboxMessage: {
          id: 'outbox-2',
          ediRoute: { icdId: 'icd-1' },
        },
      });
      mockPrisma.ediAcknowledgement.create.mockResolvedValue({
        id: 'ack-2',
        shippingLineId: 'ship-1',
        outboxMessageId: 'outbox-2',
        ackType: EdiAcknowledgementType.APERAK,
        status: EdiAcknowledgementStatus.REJECTED,
      });

      const result = await service.ingestAck(
        {
          shippingLineId: 'ship-1',
          ackType: EdiAcknowledgementType.APERAK,
          status: EdiAcknowledgementStatus.REJECTED,
          outboxMessageId: 'outbox-2',
          externalReference: 'MAEU-REF-001',
        },
        mockActor,
      );

      expect(result.id).toBe('ack-2');
      expect(mockAlert.createOrUpdateAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          icdId: 'icd-1',
          sourceType: EdiAlertSourceType.ACKNOWLEDGEMENT,
          sourceId: 'ack-2',
          alertType: EdiAlertType.ACK_REJECTED,
          severity: EdiAlertSeverity.ERROR,
        }),
      );
    });

    it('should mark unmatched ACK as UNMATCHED and generate WARNING alert', async () => {
      mockPrisma.shippingLine.findUnique.mockResolvedValue({
        id: 'ship-1',
        name: 'Maersk',
        scacCode: 'MAEU',
        ediRoutes: [{ icdId: 'icd-1' }],
      });
      mockPrisma.ediAcknowledgement.findUnique.mockResolvedValue(null);
      mockCorrelation.correlate.mockResolvedValue({
        matched: false,
        outboxMessage: null,
      });
      mockPrisma.ediAcknowledgement.create.mockResolvedValue({
        id: 'ack-3',
        shippingLineId: 'ship-1',
        outboxMessageId: null,
        ackType: EdiAcknowledgementType.CONTRL,
        status: EdiAcknowledgementStatus.UNMATCHED,
      });

      const result = await service.ingestAck(
        {
          shippingLineId: 'ship-1',
          ackType: EdiAcknowledgementType.CONTRL,
          status: EdiAcknowledgementStatus.ACCEPTED,
          externalReference: 'UNKNOWN-REF',
        },
        mockActor,
      );

      expect(result.id).toBe('ack-3');
      expect(mockPrisma.ediAcknowledgement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: EdiAcknowledgementStatus.UNMATCHED,
            outboxMessageId: null,
          }),
        }),
      );
      expect(mockAlert.createOrUpdateAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          icdId: 'icd-1',
          sourceType: EdiAlertSourceType.ACKNOWLEDGEMENT,
          sourceId: 'ack-3',
          alertType: EdiAlertType.ACK_UNMATCHED,
          severity: EdiAlertSeverity.WARNING,
        }),
      );
    });
  });
});
