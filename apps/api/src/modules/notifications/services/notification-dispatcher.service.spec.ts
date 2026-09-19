import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { PrismaService } from '../../../database/prisma.service';
import { TokenCipherService } from '../crypto/token-cipher.service';
import { SmtpEmailProvider } from '../providers/smtp-email.provider';
import { FcmPushProvider } from '../providers/fcm-push.provider';
import { ApnsPushProvider } from '../providers/apns-push.provider';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationDevicePlatform,
  NotificationProvider,
} from '../../../generated/prisma/client';

describe('NotificationDispatcherService', () => {
  let service: NotificationDispatcherService;
  let prisma: {
    notificationDelivery: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    notificationDevice: {
      update: jest.Mock;
    };
  };
  let tokenCipher: {
    decryptToken: jest.Mock;
  };
  let smtpEmailProvider: {
    sendEmail: jest.Mock;
  };
  let fcmPushProvider: {
    sendPush: jest.Mock;
  };
  let apnsPushProvider: {
    sendPush: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      notificationDelivery: {
        findMany: jest.Mock ? jest.fn() : null,
        update: jest.fn(),
      },
      notificationDevice: {
        update: jest.fn(),
      },
    };

    tokenCipher = {
      decryptToken: jest.fn().mockReturnValue('raw-token'),
    };

    smtpEmailProvider = {
      sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-smtp-1' }),
    };

    fcmPushProvider = {
      sendPush: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-fcm-1' }),
    };

    apnsPushProvider = {
      sendPush: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-apns-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatcherService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenCipherService, useValue: tokenCipher },
        { provide: SmtpEmailProvider, useValue: smtpEmailProvider },
        { provide: FcmPushProvider, useValue: fcmPushProvider },
        { provide: ApnsPushProvider, useValue: apnsPushProvider },
      ],
    }).compile();

    service = module.get<NotificationDispatcherService>(NotificationDispatcherService);
  });

  it('should process pending email delivery successfully', async () => {
    prisma.notificationDelivery.findMany.mockResolvedValue([
      {
        id: 'del-1',
        channel: NotificationChannel.EMAIL,
        provider: NotificationProvider.SMTP,
        status: NotificationDeliveryStatus.PENDING,
        retryCount: 0,
        notification: {
          id: 'notif-1',
          recipientEmail: 'user@example.com',
          title: 'Hello',
          body: 'World',
        },
      },
    ]);

    const count = await service.processPendingDeliveries();

    expect(count).toBe(1);
    expect(smtpEmailProvider.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Hello',
      }),
    );
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          status: NotificationDeliveryStatus.SENT,
          providerMessageId: 'msg-smtp-1',
        }),
      }),
    );
  });

  it('should process pending push delivery and decrypt token', async () => {
    prisma.notificationDelivery.findMany.mockResolvedValue([
      {
        id: 'del-2',
        channel: NotificationChannel.PUSH,
        provider: NotificationProvider.FCM,
        status: NotificationDeliveryStatus.PENDING,
        retryCount: 0,
        device: {
          id: 'dev-1',
          platform: NotificationDevicePlatform.ANDROID,
          active: true,
          tokenCiphertext: 'cipher',
          tokenIv: 'iv',
          tokenAuthTag: 'tag',
        },
        notification: {
          id: 'notif-1',
          title: 'Push Title',
          body: 'Push Body',
        },
      },
    ]);

    const count = await service.processPendingDeliveries();

    expect(count).toBe(1);
    expect(tokenCipher.decryptToken).toHaveBeenCalledWith({
      tokenCiphertext: 'cipher',
      tokenIv: 'iv',
      tokenAuthTag: 'tag',
    });
    expect(fcmPushProvider.sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'raw-token',
        title: 'Push Title',
      }),
    );
  });
});
