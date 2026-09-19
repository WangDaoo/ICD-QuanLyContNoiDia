import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationDevicePlatform,
  NotificationProvider,
  NotificationType,
  Prisma,
} from '../../../generated/prisma/client';
import { BaseNotificationEvent } from '../interfaces/notification-event.interface';
import { InvoicePdfData, InvoicePdfService } from './invoice-pdf.service';
import { SmtpEmailProvider } from '../providers/smtp-email.provider';

@Injectable()
export class NotificationTriggerService {
  private readonly logger = new Logger(NotificationTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly smtpEmailProvider: SmtpEmailProvider,
  ) {}

  async emitNotification(event: BaseNotificationEvent): Promise<string | null> {
    try {
      // Check dedupe key first
      const existing = await this.prisma.notification.findUnique({
        where: { dedupeKey: event.dedupeKey },
      });

      if (existing) {
        this.logger.debug(`Notification with dedupeKey ${event.dedupeKey} already exists. Skipping.`);
        return existing.id;
      }

      // Create notification
      const notification = await this.prisma.notification.create({
        data: {
          icdId: event.icdId,
          recipientUserId: event.recipientUserId,
          recipientEmail: event.recipientEmail,
          type: event.type,
          title: event.title,
          body: event.body,
          deepLink: event.deepLink,
          sourceType: event.sourceType,
          sourceId: event.sourceId,
          dedupeKey: event.dedupeKey,
          dataJson: (event.dataJson as Prisma.InputJsonValue) || undefined,
        },
      });

      // Materialize email delivery if recipientEmail provided
      if (event.recipientEmail) {
        const deliveryKey = `EMAIL:${notification.id}:${event.recipientEmail}`;
        await this.prisma.notificationDelivery.upsert({
          where: { deliveryKey },
          create: {
            notificationId: notification.id,
            channel: NotificationChannel.EMAIL,
            provider: NotificationProvider.SMTP,
            status: NotificationDeliveryStatus.PENDING,
            deliveryKey,
          },
          update: {},
        });
      }

      // Materialize push deliveries if recipientUserId provided
      if (event.recipientUserId) {
        const devices = await this.prisma.notificationDevice.findMany({
          where: {
            userId: event.recipientUserId,
            active: true,
          },
        });

        for (const device of devices) {
          const deliveryKey = `PUSH:${notification.id}:${device.id}`;
          const provider =
            device.platform === NotificationDevicePlatform.IOS
              ? NotificationProvider.APNS
              : NotificationProvider.FCM;

          await this.prisma.notificationDelivery.upsert({
            where: { deliveryKey },
            create: {
              notificationId: notification.id,
              deviceId: device.id,
              channel: NotificationChannel.PUSH,
              provider,
              status: NotificationDeliveryStatus.PENDING,
              deliveryKey,
            },
            update: {},
          });
        }
      }

      return notification.id;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Failed to emit notification for dedupeKey ${event.dedupeKey}: ${errMsg}`,
        stack,
      );
      return null;
    }
  }

  async triggerGateOutNotification(params: {
    icdId: string;
    containerVisitId: string;
    containerNo: string;
    consigneeEmail?: string;
    userId?: string;
  }) {
    const { icdId, containerVisitId, containerNo, consigneeEmail, userId } = params;

    return this.emitNotification({
      type: NotificationType.GATE_OUT_COMPLETED,
      icdId,
      recipientUserId: userId,
      recipientEmail: consigneeEmail,
      title: `Container ${containerNo} Gate-Out Completed`,
      body: `Container ${containerNo} has successfully gated out of ICD.`,
      deepLink: `/containers/${containerVisitId}`,
      sourceType: 'ContainerVisit',
      sourceId: containerVisitId,
      dedupeKey: `GATE_OUT:${containerVisitId}`,
      dataJson: { containerNo, containerVisitId },
    });
  }

  async triggerInspectionHoldNotification(params: {
    icdId: string;
    inspectionId: string;
    containerNo: string;
    inspectorUserId?: string;
    reason?: string;
  }) {
    const { icdId, inspectionId, containerNo, inspectorUserId, reason } = params;

    return this.emitNotification({
      type: NotificationType.INSPECTION_HOLD,
      icdId,
      recipientUserId: inspectorUserId,
      title: `Inspection HOLD: Container ${containerNo}`,
      body: `Container ${containerNo} was placed on HOLD during inspection.${reason ? ` Reason: ${reason}` : ''}`,
      deepLink: `/inspections/${inspectionId}`,
      sourceType: 'ContainerInspection',
      sourceId: inspectionId,
      dedupeKey: `INSPECTION_HOLD:${inspectionId}`,
      dataJson: { containerNo, inspectionId, reason },
    });
  }

  async triggerGateInWorkQueueNotification(params: {
    icdId: string;
    containerVisitId: string;
    containerNo: string;
    operatorUserId: string;
    slotLocation?: string;
  }) {
    const { icdId, containerVisitId, containerNo, operatorUserId, slotLocation } = params;

    return this.emitNotification({
      type: NotificationType.WORK_QUEUE_GATE_IN,
      icdId,
      recipientUserId: operatorUserId,
      title: `New Gate-In Task: ${containerNo}`,
      body: `Container ${containerNo} has arrived at gate.${slotLocation ? ` Recommended slot: ${slotLocation}` : ''}`,
      deepLink: `/tasks/gate-in/${containerVisitId}`,
      sourceType: 'ContainerVisit',
      sourceId: containerVisitId,
      dedupeKey: `WORK_QUEUE_GATE_IN:${containerVisitId}:${operatorUserId}`,
      dataJson: { containerNo, containerVisitId, slotLocation },
    });
  }

  async triggerInvoiceEmailNotification(params: {
    icdId: string;
    invoiceId: string;
    recipientEmail: string;
    invoiceData: InvoicePdfData;
  }) {
    const { icdId, invoiceId, recipientEmail, invoiceData } = params;

    try {
      const pdfBuffer = await this.invoicePdfService.generateInvoicePdf(invoiceData);

      // Create notification record
      const dedupeKey = `INVOICE_EMAIL:${invoiceId}`;
      const notificationId = await this.emitNotification({
        type: NotificationType.INVOICE_EMAIL,
        icdId,
        recipientEmail,
        title: `ICD Invoice #${invoiceData.invoiceNumber}`,
        body: `Dear ${invoiceData.customerName},\n\nPlease find attached your tax invoice #${invoiceData.invoiceNumber} for the amount of ${invoiceData.totalAmount} ${invoiceData.currency}.\n\nThank you for choosing ICD services.`,
        sourceType: 'Invoice',
        sourceId: invoiceId,
        dedupeKey,
        dataJson: {
          invoiceNumber: invoiceData.invoiceNumber,
          totalAmount: invoiceData.totalAmount,
          currency: invoiceData.currency,
        },
      });

      if (notificationId) {
        // Send email with PDF attachment
        const emailResult = await this.smtpEmailProvider.sendEmail({
          to: recipientEmail,
          subject: `ICD Invoice #${invoiceData.invoiceNumber}`,
          text: `Dear ${invoiceData.customerName},\n\nPlease find attached your invoice #${invoiceData.invoiceNumber}.\n\nTotal: ${invoiceData.totalAmount} ${invoiceData.currency}`,
          attachments: [
            {
              filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

        // Mark delivery status accordingly
        const deliveryKey = `EMAIL:${notificationId}:${recipientEmail}`;
        await this.prisma.notificationDelivery.upsert({
          where: { deliveryKey },
          create: {
            notificationId,
            channel: NotificationChannel.EMAIL,
            provider: NotificationProvider.SMTP,
            status: emailResult.success
              ? NotificationDeliveryStatus.SENT
              : NotificationDeliveryStatus.FAILED,
            deliveryKey,
            sentAt: emailResult.success ? new Date() : null,
            providerMessageId: emailResult.messageId,
            lastError: emailResult.error,
          },
          update: {
            status: emailResult.success
              ? NotificationDeliveryStatus.SENT
              : NotificationDeliveryStatus.FAILED,
            sentAt: emailResult.success ? new Date() : null,
            providerMessageId: emailResult.messageId,
            lastError: emailResult.error,
          },
        });
      }

      return notificationId;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Failed to trigger invoice email: ${errMsg}`, stack);
      return null;
    }
  }
}
