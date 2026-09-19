import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggerService } from './notification-trigger.service';
import { PrismaService } from '../../../database/prisma.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { SmtpEmailProvider } from '../providers/smtp-email.provider';
import {
  NotificationDevicePlatform,
  NotificationType,
} from '../../../generated/prisma/client';

describe('NotificationTriggerService', () => {
  let service: NotificationTriggerService;
  let prisma: {
    notification: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    notificationDelivery: {
      upsert: jest.Mock;
    };
    notificationDevice: {
      findMany: jest.Mock;
    };
  };
  let invoicePdfService: {
    generateInvoicePdf: jest.Mock;
  };
  let smtpEmailProvider: {
    sendEmail: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      notificationDelivery: {
        upsert: jest.fn(),
      },
      notificationDevice: {
        findMany: jest.fn(),
      },
    };

    invoicePdfService = {
      generateInvoicePdf: jest.fn(),
    };

    smtpEmailProvider = {
      sendEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTriggerService,
        { provide: PrismaService, useValue: prisma },
        { provide: InvoicePdfService, useValue: invoicePdfService },
        { provide: SmtpEmailProvider, useValue: smtpEmailProvider },
      ],
    }).compile();

    service = module.get<NotificationTriggerService>(NotificationTriggerService);
  });

  it('should skip duplicate notification when dedupeKey exists', async () => {
    prisma.notification.findUnique.mockResolvedValue({ id: 'existing-id' });

    const result = await service.emitNotification({
      type: NotificationType.GATE_OUT_COMPLETED,
      icdId: 'icd-1',
      recipientEmail: 'test@example.com',
      title: 'Gate Out',
      body: 'Body',
      dedupeKey: 'GATE_OUT:visit-1',
    });

    expect(result).toBe('existing-id');
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('should create notification and materialize email and push delivery outbox rows', async () => {
    prisma.notification.findUnique.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'new-notif-1' });
    prisma.notificationDevice.findMany.mockResolvedValue([
      { id: 'dev-1', platform: NotificationDevicePlatform.ANDROID, active: true },
      { id: 'dev-2', platform: NotificationDevicePlatform.IOS, active: true },
    ]);
    prisma.notificationDelivery.upsert.mockResolvedValue({});

    const result = await service.emitNotification({
      type: NotificationType.GATE_OUT_COMPLETED,
      icdId: 'icd-1',
      recipientUserId: 'user-1',
      recipientEmail: 'consignee@example.com',
      title: 'Gate Out',
      body: 'Body',
      dedupeKey: 'GATE_OUT:visit-1',
    });

    expect(result).toBe('new-notif-1');
    expect(prisma.notification.create).toHaveBeenCalled();
    // 1 email + 2 push deliveries = 3 calls
    expect(prisma.notificationDelivery.upsert).toHaveBeenCalledTimes(3);
  });
});
