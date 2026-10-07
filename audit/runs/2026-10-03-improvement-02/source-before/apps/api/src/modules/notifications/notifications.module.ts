import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../database/prisma.module';
import { TokenCipherService } from './crypto/token-cipher.service';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { FcmPushProvider } from './providers/fcm-push.provider';
import { ApnsPushProvider } from './providers/apns-push.provider';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { NotificationService } from './services/notification.service';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationTriggerService } from './services/notification-trigger.service';
import { NotificationCronService } from './services/notification-cron.service';
import { NotificationsController } from './controllers/notifications.controller';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [
    TokenCipherService,
    SmtpEmailProvider,
    FcmPushProvider,
    ApnsPushProvider,
    InvoicePdfService,
    NotificationService,
    NotificationDispatcherService,
    NotificationTriggerService,
    NotificationCronService,
  ],
  exports: [
    NotificationService,
    NotificationTriggerService,
    NotificationDispatcherService,
    InvoicePdfService,
  ],
})
export class NotificationsModule {}
