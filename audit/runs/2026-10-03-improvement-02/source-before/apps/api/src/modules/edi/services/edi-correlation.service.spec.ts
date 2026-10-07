import { EdiCorrelationService } from './edi-correlation.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  EdiAcknowledgementStatus,
  EdiAcknowledgementType,
} from '../../../generated/prisma/client';

describe('EdiCorrelationService', () => {
  let service: EdiCorrelationService;
  let mockPrisma: {
    ediOutboxMessage: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      ediOutboxMessage: {
        findFirst: jest.fn(),
      },
    };

    service = new EdiCorrelationService(mockPrisma as unknown as PrismaService);
  });

  it('should correlate via explicit outboxMessageId', async () => {
    const mockOutbox = {
      id: 'outbox-1',
      shippingLineId: 'ship-1',
      ediRoute: { icdId: 'icd-1' },
    };
    mockPrisma.ediOutboxMessage.findFirst.mockResolvedValue(mockOutbox);

    const result = await service.correlate({
      shippingLineId: 'ship-1',
      ackType: EdiAcknowledgementType.CONTRL,
      status: EdiAcknowledgementStatus.ACCEPTED,
      outboxMessageId: 'outbox-1',
    });

    expect(result.matched).toBe(true);
    expect(result.outboxMessage).toEqual(mockOutbox);
    expect(mockPrisma.ediOutboxMessage.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'outbox-1',
        shippingLineId: 'ship-1',
      },
      include: {
        ediRoute: { select: { icdId: true } },
      },
    });
  });

  it('should correlate via idempotencyKey when outboxMessageId is missing', async () => {
    const mockOutbox = {
      id: 'outbox-2',
      shippingLineId: 'ship-1',
      idempotencyKey: 'CODECO_GATE_IN:visit-1',
      ediRoute: { icdId: 'icd-1' },
    };
    mockPrisma.ediOutboxMessage.findFirst.mockResolvedValue(mockOutbox);

    const result = await service.correlate({
      shippingLineId: 'ship-1',
      ackType: EdiAcknowledgementType.APERAK,
      status: EdiAcknowledgementStatus.ACCEPTED,
      idempotencyKey: 'CODECO_GATE_IN:visit-1',
    });

    expect(result.matched).toBe(true);
    expect(result.outboxMessage).toEqual(mockOutbox);
    expect(mockPrisma.ediOutboxMessage.findFirst).toHaveBeenCalledWith({
      where: {
        idempotencyKey: 'CODECO_GATE_IN:visit-1',
        shippingLineId: 'ship-1',
      },
      include: {
        ediRoute: { select: { icdId: true } },
      },
    });
  });

  it('should correlate via externalReference when other keys are missing', async () => {
    const mockOutbox = {
      id: 'outbox-3',
      shippingLineId: 'ship-1',
      externalReference: 'EXT-REF-999',
      ediRoute: { icdId: 'icd-1' },
    };
    mockPrisma.ediOutboxMessage.findFirst.mockResolvedValue(mockOutbox);

    const result = await service.correlate({
      shippingLineId: 'ship-1',
      ackType: EdiAcknowledgementType.CONTRL,
      status: EdiAcknowledgementStatus.ACCEPTED,
      externalReference: 'EXT-REF-999',
    });

    expect(result.matched).toBe(true);
    expect(result.outboxMessage).toEqual(mockOutbox);
  });

  it('should return unmatched when no matching outbox message is found', async () => {
    mockPrisma.ediOutboxMessage.findFirst.mockResolvedValue(null);

    const result = await service.correlate({
      shippingLineId: 'ship-1',
      ackType: EdiAcknowledgementType.CONTRL,
      status: EdiAcknowledgementStatus.ACCEPTED,
      externalReference: 'NON-EXISTENT',
    });

    expect(result.matched).toBe(false);
    expect(result.outboxMessage).toBeNull();
  });
});
