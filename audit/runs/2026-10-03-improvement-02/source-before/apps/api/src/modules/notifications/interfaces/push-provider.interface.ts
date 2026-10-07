import { NotificationDevicePlatform } from '../../../generated/prisma/client';

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
  platform: NotificationDevicePlatform;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  invalidToken?: boolean;
}

export const PUSH_PROVIDER = 'PUSH_PROVIDER';

export interface IPushProvider {
  sendPush(payload: PushNotificationPayload): Promise<PushNotificationResult>;
}
