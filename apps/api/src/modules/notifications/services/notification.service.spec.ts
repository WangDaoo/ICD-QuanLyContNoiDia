import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../../database/prisma.service';
import { TokenCipherService } from '../crypto/token-cipher.service';
import { NotificationDevicePlatform } from '../../../generated/prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: {
    notificationDevice: {
      upsert: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    notification: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let tokenCipher: {
    encryptToken: jest.Mock;
    hashToken: jest.Mock;
    decryptToken: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      notificationDevice: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    tokenCipher = {
      encryptToken: jest.fn().mockReturnValue({
        tokenHash: 'hash-123',
        tokenCiphertext: 'cipher-123',
        tokenIv: 'iv-123',
        tokenAuthTag: 'tag-123',
      }),
      hashToken: jest.fn().mockReturnValue('hash-123'),
      decryptToken: jest.fn().mockReturnValue('plain-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenCipherService, useValue: tokenCipher },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('registerDevice', () => {
    it('should encrypt token and upsert device', async () => {
      prisma.notificationDevice.upsert.mockResolvedValue({
        id: 'device-1',
        platform: NotificationDevicePlatform.ANDROID,
        active: true,
      });

      const result = await service.registerDevice('user-1', {
        platform: NotificationDevicePlatform.ANDROID,
        token: 'sample-token',
      });

      expect(tokenCipher.encryptToken).toHaveBeenCalledWith('sample-token');
      expect(prisma.notificationDevice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenHash: 'hash-123' },
        }),
      );
      expect(result).toEqual({
        success: true,
        deviceId: 'device-1',
        platform: NotificationDevicePlatform.ANDROID,
        active: true,
      });
    });
  });

  describe('unregisterDevice', () => {
    it('should deactivate existing device', async () => {
      prisma.notificationDevice.findFirst.mockResolvedValue({
        id: 'device-1',
        active: true,
      });
      prisma.notificationDevice.update.mockResolvedValue({
        id: 'device-1',
        active: false,
      });

      const result = await service.unregisterDevice('user-1', {
        token: 'sample-token',
      });

      expect(prisma.notificationDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-1' },
        data: { active: false },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('getHistory', () => {
    it('should return paginated notifications and unread count', async () => {
      prisma.notification.findMany.mockResolvedValue([
        {
          id: 'notif-1',
          type: 'GATE_OUT_COMPLETED',
          title: 'Gate out',
          body: 'Container out',
          deepLink: '/link',
          sourceType: 'ContainerVisit',
          sourceId: 'visit-1',
          dataJson: {},
          readAt: null,
          createdAt: new Date(),
        },
      ]);
      prisma.notification.count.mockResolvedValueOnce(1); // total
      prisma.notification.count.mockResolvedValueOnce(1); // unread

      const result = await service.getHistory('user-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.unreadCount).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark user notification as read', async () => {
      const now = new Date();
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        recipientUserId: 'user-1',
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        readAt: now,
      });

      const result = await service.markAsRead('user-1', 'notif-1');
      expect(result.success).toBe(true);
      expect(result.readAt).toEqual(now);
    });
  });
});
