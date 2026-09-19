import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../database/prisma.service';
import { hashPartnerRequest } from '../utils/partner-request-hash.util';
import { PartnerApiIdempotencyService } from './partner-api-idempotency.service';

describe('PartnerApiIdempotencyService', () => {
  let service: PartnerApiIdempotencyService;
  let prisma: {
    partnerApiLog: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  const principal = {
    clientId: 'client-1',
    partnerCode: 'PARTNER-01',
    partnerName: 'Test Partner',
    scopes: ['handover.accept'],
  };

  beforeEach(async () => {
    prisma = {
      partnerApiLog: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerApiIdempotencyService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PartnerApiIdempotencyService>(
      PartnerApiIdempotencyService,
    );
  });

  describe('assertValidKey', () => {
    it('throws BadRequestException if key is missing', () => {
      expect(() => service.assertValidKey(undefined)).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if key format is invalid', () => {
      expect(() => service.assertValidKey('short')).toThrow(
        BadRequestException,
      );
      expect(() => service.assertValidKey('invalid spaces in key 123')).toThrow(
        BadRequestException,
      );
    });

    it('returns valid key', () => {
      expect(service.assertValidKey('valid-idempotency-key-12345')).toBe(
        'valid-idempotency-key-12345',
      );
    });
  });

  describe('reserveOrReplay', () => {
    const payload = { accepted_at: '2026-09-19T10:00:00Z' };
    const hash = hashPartnerRequest(payload);

    it('creates PENDING log when key is new (EXECUTE mode)', async () => {
      prisma.partnerApiLog.findFirst.mockResolvedValue(null);
      prisma.partnerApiLog.create.mockResolvedValue({ id: 'log-123' });

      const result = await service.reserveOrReplay({
        principal,
        endpoint: '/api/v1/external/handovers/h1/accept',
        method: 'POST',
        idempotencyKey: 'key-12345678',
        body: payload,
        requestId: 'req-1',
      });

      expect(result).toEqual({
        mode: 'EXECUTE',
        logId: 'log-123',
        requestHash: hash,
      });
      expect(prisma.partnerApiLog.create).toHaveBeenCalled();
    });

    it('throws ConflictException if payload differs from previous request (IDEMPOTENCY_CONFLICT)', async () => {
      prisma.partnerApiLog.findFirst.mockResolvedValue({
        id: 'log-1',
        requestHash: 'different-hash',
        completedAt: new Date(),
        responseBodyRedacted: { status: 'PARTNER_ACCEPTED' },
      });

      await expect(
        service.reserveOrReplay({
          principal,
          endpoint: '/api/v1/external/handovers/h1/accept',
          method: 'POST',
          idempotencyKey: 'key-12345678',
          body: payload,
          requestId: 'req-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if request is in-progress (IDEMPOTENCY_IN_PROGRESS)', async () => {
      prisma.partnerApiLog.findFirst.mockResolvedValue({
        id: 'log-1',
        requestHash: hash,
        completedAt: null,
        responseBodyRedacted: null,
      });

      await expect(
        service.reserveOrReplay({
          principal,
          endpoint: '/api/v1/external/handovers/h1/accept',
          method: 'POST',
          idempotencyKey: 'key-12345678',
          body: payload,
          requestId: 'req-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('replays response when already completed (REPLAY mode)', async () => {
      const savedResponse = {
        handover_id: 'h1',
        status: 'PARTNER_ACCEPTED',
      };

      prisma.partnerApiLog.findFirst.mockResolvedValue({
        id: 'log-1',
        requestHash: hash,
        completedAt: new Date(),
        responseBodyRedacted: savedResponse,
        httpStatus: 200,
      });

      const result = await service.reserveOrReplay({
        principal,
        endpoint: '/api/v1/external/handovers/h1/accept',
        method: 'POST',
        idempotencyKey: 'key-12345678',
        body: payload,
        requestId: 'req-1',
      });

      expect(result).toEqual({
        mode: 'REPLAY',
        response: savedResponse,
        httpStatus: 200,
      });
    });
  });
});
