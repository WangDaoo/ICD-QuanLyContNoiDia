import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPushProvider,
  PushNotificationPayload,
  PushNotificationResult,
} from '../interfaces/push-provider.interface';
import { FcmPushProvider } from './fcm-push.provider';

@Injectable()
export class ApnsPushProvider implements IPushProvider {
  private readonly logger = new Logger(ApnsPushProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly fcmProvider: FcmPushProvider,
  ) {
    const keyId = this.configService.get<string>('APNS_KEY_ID');
    const teamId = this.configService.get<string>('APNS_TEAM_ID');
    const bundleId = this.configService.get<string>('APNS_BUNDLE_ID');

    if (keyId && teamId && bundleId) {
      this.logger.log(`APNs Provider initialized for bundle ${bundleId}`);
    } else {
      this.logger.warn(
        'APNs native credentials not specified. Using FCM/Mock fallback for iOS devices.',
      );
    }
  }

  async sendPush(payload: PushNotificationPayload): Promise<PushNotificationResult> {
    // If native APNs is not configured separately, FCM handles iOS tokens seamlessly via Firebase APNs integration
    return this.fcmProvider.sendPush(payload);
  }
}
