import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import {
  IPushProvider,
  PushNotificationPayload,
  PushNotificationResult,
} from '../interfaces/push-provider.interface';

@Injectable()
export class FcmPushProvider implements IPushProvider {
  private readonly logger = new Logger(FcmPushProvider.name);
  private firebaseApp: App | null = null;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      try {
        if (!getApps().length) {
          this.firebaseApp = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        } else {
          this.firebaseApp = getApp();
        }
        this.logger.log(`FCM Push Provider initialized with project ${projectId}`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to initialize Firebase Admin: ${errorMsg}`);
      }
    } else {
      this.logger.warn(
        'FCM credentials not provided. FcmPushProvider running in mock/dry-run mode.',
      );
    }
  }

  async sendPush(payload: PushNotificationPayload): Promise<PushNotificationResult> {
    try {
      if (!this.firebaseApp) {
        this.logger.log(
          `[MOCK_FCM] Sending push to token [${payload.token.substring(0, 8)}...]: Title="${payload.title}", Body="${payload.body}"`,
        );
        return {
          success: true,
          messageId: `mock-fcm-${Date.now()}`,
        };
      }

      const message: Message = {
        token: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          ...(payload.data || {}),
          ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: payload.deepLink || undefined,
          },
        },
      };

      const messageId = await getMessaging(this.firebaseApp).send(message);

      return {
        success: true,
        messageId,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: string })?.code;
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`FCM send error: ${errorMsg}`, stack);
      const isInvalidToken =
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered';

      return {
        success: false,
        error: errorMsg || 'Unknown FCM error',
        invalidToken: isInvalidToken,
      };
    }
  }
}

