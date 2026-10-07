import { NotificationType } from '../../../generated/prisma/client';

export interface BaseNotificationEvent {
  type: NotificationType;
  icdId: string;
  recipientUserId?: string;
  recipientEmail?: string;
  title: string;
  body: string;
  deepLink?: string;
  sourceType: string;
  sourceId: string;
  dedupeKey: string;
  dataJson?: Record<string, unknown>;
  emailAttachment?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  };
}
