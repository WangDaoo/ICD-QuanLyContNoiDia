import { EdiDispatcherService } from './edi-dispatcher.service';
import { EdiOutboxStatus, EdiTransport } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { EdiConfigService } from './edi-config.service';
import { EdiAlertService } from './edi-alert.service';
import { EdiMockTransport } from '../transports/edi-mock.transport';
import { EdiHttpsTransport } from '../transports/edi-https.transport';
import { EdiSftpTransport } from '../transports/edi-sftp.transport';
import type { RealtimeService } from '../../realtime/realtime.service';

describe('EdiDispatcherService', () => {
  let service: EdiDispatcherService;
  let mockPrisma: {
    ediOutboxMessage: {
      updateMany: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let mockConfigService: {
    getConfig: jest.Mock;
  };
  let mockAlertService: {
    createOrUpdateAlert: jest.Mock;
  };
  let mockMockTransport: {
    deliver: jest.Mock;
  };
  let mockHttpsTransport: {
    deliver: jest.Mock;
  };
  let mockSftpTransport: {
    deliver: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      ediOutboxMessage: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    mockConfigService = {
      getConfig: jest.fn().mockResolvedValue({
        maxRetries: 3,
        baseBackoffSeconds: 30,
        maxBackoffSeconds: 3600,
        batchSize: 50,
        processingStaleSeconds: 300,
      }),
    };

    mockAlertService = {
      createOrUpdateAlert: jest.fn().mockResolvedValue({}),
    };

    mockMockTransport = {
      deliver: jest.fn().mockResolvedValue({ externalReference: 'MOCK-123' }),
    };
    mockHttpsTransport = {
      deliver: jest.fn(),
    };
    mockSftpTransport = {
      deliver: jest.fn(),
    };

    service = new EdiDispatcherService(
      mockPrisma as unknown as PrismaService,
      mockConfigService as unknown as EdiConfigService,
      mockAlertService as unknown as EdiAlertService,
      mockMockTransport as unknown as EdiMockTransport,
      mockHttpsTransport as unknown as EdiHttpsTransport,
      mockSftpTransport as unknown as EdiSftpTransport,
    );
  });

  it('should recover stale processing messages', async () => {
    mockPrisma.ediOutboxMessage.updateMany.mockResolvedValue({ count: 2 });

    await service.recoverStaleProcessing();

    expect(mockPrisma.ediOutboxMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EdiOutboxStatus.PROCESSING,
        }),
        data: {
          status: EdiOutboxStatus.PENDING,
        },
      }),
    );
  });

  it('should dispatch pending messages successfully via mock transport', async () => {
    const mockMsg = {
      id: 'msg-1',
      messageType: 'CODECO_GATE_IN',
      idempotencyKey: 'KEY-1',
      requestId: 'REQ-1',
      status: EdiOutboxStatus.PENDING,
      retryCount: 0,
      routingSnapshot: {
        routeId: 'route-1',
        icdId: 'icd-1',
        transport: EdiTransport.MOCK,
        partnerTarget: 'mock://target',
        timeoutMs: 5000,
      },
      payloadSnapshot: {
        schemaVersion: 'CODECO_CANONICAL_JSON_V1',
      },
    };

    mockPrisma.ediOutboxMessage.findMany.mockResolvedValue([mockMsg]);
    mockPrisma.ediOutboxMessage.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ediOutboxMessage.update.mockResolvedValue({ ...mockMsg, status: EdiOutboxStatus.SENT });

    const result = await service.dispatchPendingBatch(10);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockMockTransport.deliver).toHaveBeenCalled();
    expect(mockPrisma.ediOutboxMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg-1' },
      data: expect.objectContaining({
        status: EdiOutboxStatus.SENT,
        externalReference: 'MOCK-123',
      }),
    });
  });

  it('should handle transport failure and apply exponential backoff', async () => {
    const mockMsg = {
      id: 'msg-2',
      messageType: 'CODECO_GATE_OUT',
      idempotencyKey: 'KEY-2',
      requestId: 'REQ-2',
      status: EdiOutboxStatus.PENDING,
      retryCount: 0,
      routingSnapshot: {
        routeId: 'route-1',
        icdId: 'icd-1',
        transport: EdiTransport.MOCK,
        partnerTarget: 'mock://target',
        timeoutMs: 5000,
      },
      payloadSnapshot: {},
    };

    mockPrisma.ediOutboxMessage.findMany.mockResolvedValue([mockMsg]);
    mockPrisma.ediOutboxMessage.updateMany.mockResolvedValue({ count: 1 });
    mockMockTransport.deliver.mockRejectedValue(new Error('Connection timeout'));

    const result = await service.dispatchPendingBatch(10);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockPrisma.ediOutboxMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg-2' },
      data: expect.objectContaining({
        status: EdiOutboxStatus.FAILED,
        retryCount: 1,
        lastError: 'Connection timeout',
      }),
    });
  });

  it('should transition to DEAD status when maxRetries exceeded', async () => {
    const mockMsg = {
      id: 'msg-3',
      messageType: 'CODECO_GATE_IN',
      idempotencyKey: 'KEY-3',
      requestId: 'REQ-3',
      status: EdiOutboxStatus.PENDING,
      retryCount: 2, // Next will be 3 = maxRetries
      routingSnapshot: {
        routeId: 'route-1',
        icdId: 'icd-1',
        transport: EdiTransport.MOCK,
        partnerTarget: 'mock://target',
        timeoutMs: 5000,
      },
      payloadSnapshot: {},
    };

    mockPrisma.ediOutboxMessage.findMany.mockResolvedValue([mockMsg]);
    mockPrisma.ediOutboxMessage.updateMany.mockResolvedValue({ count: 1 });
    mockMockTransport.deliver.mockRejectedValue(new Error('Persistent 500'));

    const result = await service.dispatchPendingBatch(10);

    expect(result.processed).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(mockPrisma.ediOutboxMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg-3' },
      data: expect.objectContaining({
        status: EdiOutboxStatus.DEAD,
        retryCount: 3,
        lastError: 'Persistent 500',
      }),
    });
  });

  describe('realtime events', () => {
    function outboxMessage(id: string, icdId: string) {
      return {
        id,
        messageType: 'CODECO_GATE_IN',
        idempotencyKey: `KEY-${id}`,
        requestId: `REQ-${id}`,
        status: EdiOutboxStatus.PENDING,
        retryCount: 0,
        routingSnapshot: {
          routeId: 'route-1',
          icdId,
          transport: EdiTransport.MOCK,
          partnerTarget: 'mock://target',
          timeoutMs: 5000,
        },
        payloadSnapshot: { schemaVersion: 'CODECO_CANONICAL_JSON_V1' },
      };
    }

    function serviceWithRealtime(publish: jest.Mock) {
      return new EdiDispatcherService(
        mockPrisma as unknown as PrismaService,
        mockConfigService as unknown as EdiConfigService,
        mockAlertService as unknown as EdiAlertService,
        mockMockTransport as unknown as EdiMockTransport,
        mockHttpsTransport as unknown as EdiHttpsTransport,
        mockSftpTransport as unknown as EdiSftpTransport,
        { publish } as unknown as RealtimeService,
      );
    }

    it('publishes one edi event per ICD whose messages changed', async () => {
      const publish = jest.fn();
      mockPrisma.ediOutboxMessage.findMany.mockResolvedValue([
        outboxMessage('a-1', 'icd-a'),
        outboxMessage('a-2', 'icd-a'),
        outboxMessage('b-1', 'icd-b'),
      ]);
      mockPrisma.ediOutboxMessage.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.ediOutboxMessage.update.mockResolvedValue({});

      await serviceWithRealtime(publish).dispatchPendingBatch(10);

      expect(publish).toHaveBeenCalledTimes(2);
      expect(publish).toHaveBeenCalledWith({ topics: ['edi'], source: 'system', icdId: 'icd-a' });
      expect(publish).toHaveBeenCalledWith({ topics: ['edi'], source: 'system', icdId: 'icd-b' });
    });

    it('does not publish when another worker already locked the messages', async () => {
      const publish = jest.fn();
      mockPrisma.ediOutboxMessage.findMany.mockResolvedValue([outboxMessage('a-1', 'icd-a')]);
      mockPrisma.ediOutboxMessage.updateMany.mockResolvedValue({ count: 0 });

      await serviceWithRealtime(publish).dispatchPendingBatch(10);

      expect(publish).not.toHaveBeenCalled();
    });

    it('does not publish when the outbox is empty', async () => {
      const publish = jest.fn();
      mockPrisma.ediOutboxMessage.findMany.mockResolvedValue([]);

      await serviceWithRealtime(publish).dispatchPendingBatch(10);

      expect(publish).not.toHaveBeenCalled();
    });
  });
});
