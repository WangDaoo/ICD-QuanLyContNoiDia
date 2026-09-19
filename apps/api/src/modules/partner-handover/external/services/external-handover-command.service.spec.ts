import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  TransportConfirmationType,
  TransportHandoverStatus,
} from '../../../../generated/prisma/client';
import { ExternalHandoverCommandService } from './external-handover-command.service';

describe('ExternalHandoverCommandService', () => {
  let service: ExternalHandoverCommandService;
  let mockTx: {
    $queryRawUnsafe: jest.Mock;
    transportHandover: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    transportConfirmation: {
      create: jest.Mock;
    };
  };

  const principal = {
    clientId: 'client-1',
    partnerCode: 'PARTNER-01',
    partnerName: 'Test Partner',
    scopes: ['handover.accept', 'handover.transit', 'handover.confirm_warehouse'],
  };

  beforeEach(() => {
    service = new ExternalHandoverCommandService();
    mockTx = {
      $queryRawUnsafe: jest.fn(),
      transportHandover: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transportConfirmation: {
        create: jest.fn(),
      },
    };
  });

  describe('lockOwnedHandoverOrThrow', () => {
    it('throws NotFoundException if raw row lock returns empty', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([]);

      await expect(
        service.lockOwnedHandoverOrThrow(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if row belongs to another partner client', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'other-client',
          status: 'READY_FOR_HANDOVER',
          version: 1,
        },
      ]);

      await expect(
        service.lockOwnedHandoverOrThrow(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    it('throws ConflictException if handover is not READY_FOR_HANDOVER', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'PARTNER_ACCEPTED',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.PARTNER_ACCEPTED,
        warehouse: { code: 'WH-01' },
      });

      await expect(
        service.accept(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
          { accepted_at: '2026-09-19T10:00:00Z' },
          'req-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('transitions status to PARTNER_ACCEPTED and creates confirmation', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'READY_FOR_HANDOVER',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.READY_FOR_HANDOVER,
        warehouse: { code: 'WH-01' },
      });
      mockTx.transportHandover.update.mockResolvedValue({
        id: 'handover-1',
        transportCode: 'TR-100',
        status: TransportHandoverStatus.PARTNER_ACCEPTED,
        partnerAcceptedAt: new Date('2026-09-19T10:00:00Z'),
      });

      const result = await service.accept(
        mockTx as unknown as Prisma.TransactionClient,
        'handover-1',
        principal,
        {
          accepted_at: '2026-09-19T10:00:00Z',
          note: 'Accepted on time',
        },
        'req-1',
      );

      expect(mockTx.transportHandover.update).toHaveBeenCalledWith({
        where: { id: 'handover-1' },
        data: expect.objectContaining({
          status: TransportHandoverStatus.PARTNER_ACCEPTED,
        }),
        select: expect.any(Object),
      });
      expect(mockTx.transportConfirmation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transportHandoverId: 'handover-1',
          confirmationType: TransportConfirmationType.PARTNER_ACCEPTED,
          partnerRequestId: 'req-1',
        }),
      });
      expect(result.status).toBe(TransportHandoverStatus.PARTNER_ACCEPTED);
    });
  });

  describe('markInTransit', () => {
    it('throws ConflictException if handover is not PARTNER_ACCEPTED', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'READY_FOR_HANDOVER',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.READY_FOR_HANDOVER,
        warehouse: { code: 'WH-01' },
      });

      await expect(
        service.markInTransit(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
          {
            departed_at: '2026-09-19T10:30:00Z',
            vehicle_plate: '51C-12345',
            driver_name: 'Nguyen Van B',
          },
          'req-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('transitions status to IN_TRANSIT and creates confirmation', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'PARTNER_ACCEPTED',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.PARTNER_ACCEPTED,
        warehouse: { code: 'WH-01' },
      });
      mockTx.transportHandover.update.mockResolvedValue({
        id: 'handover-1',
        transportCode: 'TR-100',
        status: TransportHandoverStatus.IN_TRANSIT,
        departedAt: new Date('2026-09-19T10:30:00Z'),
      });

      const result = await service.markInTransit(
        mockTx as unknown as Prisma.TransactionClient,
        'handover-1',
        principal,
        {
          departed_at: '2026-09-19T10:30:00Z',
          vehicle_plate: '51C-12345',
          driver_name: 'Nguyen Van B',
          partner_trip_code: 'TRIP-99',
        },
        'req-1',
      );

      expect(mockTx.transportHandover.update).toHaveBeenCalledWith({
        where: { id: 'handover-1' },
        data: expect.objectContaining({
          status: TransportHandoverStatus.IN_TRANSIT,
        }),
        select: expect.any(Object),
      });
      expect(result.status).toBe(TransportHandoverStatus.IN_TRANSIT);
    });
  });

  describe('warehouseReceived', () => {
    it('throws ConflictException if handover is not IN_TRANSIT', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'PARTNER_ACCEPTED',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.PARTNER_ACCEPTED,
        warehouse: { code: 'WH-01' },
      });

      await expect(
        service.warehouseReceived(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
          {
            received_at: '2026-09-19T12:00:00Z',
            receiver_name: 'Tran Van C',
            warehouse_code: 'WH-01',
          },
          'req-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if warehouse_code does not match handover destination warehouse', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'IN_TRANSIT',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.IN_TRANSIT,
        warehouse: { code: 'WH-01' },
      });

      await expect(
        service.warehouseReceived(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
          {
            received_at: '2026-09-19T12:00:00Z',
            receiver_name: 'Tran Van C',
            warehouse_code: 'WH-WRONG',
          },
          'req-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('transitions status to PARTNER_CONFIRMED and stores confirmation details', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'IN_TRANSIT',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.IN_TRANSIT,
        warehouse: { code: 'WH-01' },
      });
      mockTx.transportHandover.update.mockResolvedValue({
        id: 'handover-1',
        transportCode: 'TR-100',
        status: TransportHandoverStatus.PARTNER_CONFIRMED,
        partnerConfirmedAt: new Date('2026-09-19T12:00:00Z'),
      });

      const result = await service.warehouseReceived(
        mockTx as unknown as Prisma.TransactionClient,
        'handover-1',
        principal,
        {
          received_at: '2026-09-19T12:00:00Z',
          receiver_name: 'Tran Van C',
          receiver_phone: '0912345678',
          warehouse_code: 'WH-01',
          location: {
            latitude: 10.1234567,
            longitude: 106.1234567,
            accuracy_m: 5,
          },
        },
        'req-1',
      );

      expect(mockTx.transportHandover.update).toHaveBeenCalledWith({
        where: { id: 'handover-1' },
        data: expect.objectContaining({
          status: TransportHandoverStatus.PARTNER_CONFIRMED,
        }),
        select: expect.any(Object),
      });
      expect(mockTx.transportConfirmation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transportHandoverId: 'handover-1',
          confirmationType: TransportConfirmationType.WAREHOUSE_RECEIVED,
          receiverName: 'Tran Van C',
        }),
      });
      expect(result.status).toBe(TransportHandoverStatus.PARTNER_CONFIRMED);
    });
  });

  describe('reject', () => {
    it('throws ConflictException if handover is not READY_FOR_HANDOVER', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'PARTNER_ACCEPTED',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.PARTNER_ACCEPTED,
        warehouse: { code: 'WH-01' },
      });

      await expect(
        service.reject(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
          { reason: 'Driver unavailable' },
          'req-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('transitions status to PARTNER_REJECTED and creates confirmation record', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'READY_FOR_HANDOVER',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.READY_FOR_HANDOVER,
        warehouse: { code: 'WH-01' },
      });
      mockTx.transportHandover.update.mockResolvedValue({
        id: 'handover-1',
        transportCode: 'TR-100',
        status: TransportHandoverStatus.PARTNER_REJECTED,
      });

      const result = await service.reject(
        mockTx as unknown as Prisma.TransactionClient,
        'handover-1',
        principal,
        { reason: 'Driver unavailable', note: 'No vehicle in area' },
        'req-1',
      );

      expect(mockTx.transportHandover.update).toHaveBeenCalledWith({
        where: { id: 'handover-1' },
        data: expect.objectContaining({
          status: TransportHandoverStatus.PARTNER_REJECTED,
        }),
        select: expect.any(Object),
      });
      expect(mockTx.transportConfirmation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transportHandoverId: 'handover-1',
          confirmationType: TransportConfirmationType.DELIVERY_FAILED,
          condition: 'Driver unavailable',
        }),
      });
      expect(result.status).toBe(TransportHandoverStatus.PARTNER_REJECTED);
      expect(result.rejected_reason).toBe('Driver unavailable');
    });
  });

  describe('deliveryFailed', () => {
    it('throws ConflictException if handover is not IN_TRANSIT', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'PARTNER_ACCEPTED',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.PARTNER_ACCEPTED,
        warehouse: { code: 'WH-01' },
      });

      await expect(
        service.deliveryFailed(
          mockTx as unknown as Prisma.TransactionClient,
          'handover-1',
          principal,
          {
            reason_code: 'ACCIDENT',
            reason_description: 'Vehicle broken down',
            failed_at: '2026-09-19T11:00:00Z',
          },
          'req-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('transitions status to DELIVERY_FAILED and creates confirmation record', async () => {
      mockTx.$queryRawUnsafe.mockResolvedValue([
        {
          id: 'handover-1',
          partner_api_client_id: 'client-1',
          status: 'IN_TRANSIT',
          version: 1,
        },
      ]);
      mockTx.transportHandover.findUnique.mockResolvedValue({
        id: 'handover-1',
        partnerApiClientId: 'client-1',
        status: TransportHandoverStatus.IN_TRANSIT,
        warehouse: { code: 'WH-01' },
      });
      mockTx.transportHandover.update.mockResolvedValue({
        id: 'handover-1',
        transportCode: 'TR-100',
        status: TransportHandoverStatus.DELIVERY_FAILED,
      });

      const result = await service.deliveryFailed(
        mockTx as unknown as Prisma.TransactionClient,
        'handover-1',
        principal,
        {
          reason_code: 'ROAD_BLOCKED',
          reason_description: 'Highway flooded',
          failed_at: '2026-09-19T11:00:00Z',
          location: { latitude: 10.5, longitude: 106.8, accuracy_m: 10 },
        },
        'req-1',
      );

      expect(mockTx.transportHandover.update).toHaveBeenCalledWith({
        where: { id: 'handover-1' },
        data: expect.objectContaining({
          status: TransportHandoverStatus.DELIVERY_FAILED,
        }),
        select: expect.any(Object),
      });
      expect(mockTx.transportConfirmation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          transportHandoverId: 'handover-1',
          confirmationType: TransportConfirmationType.DELIVERY_FAILED,
          condition: 'ROAD_BLOCKED',
          note: 'Highway flooded',
        }),
      });
      expect(result.status).toBe(TransportHandoverStatus.DELIVERY_FAILED);
    });
  });
});

