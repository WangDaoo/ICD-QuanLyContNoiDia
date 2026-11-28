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
      this.logger.warn(`Native APNs credentials for ${bundleId} are not used by this provider. iOS delivery requires FCM registration tokens and Firebase APNs configuration.`);
    } else {
      this.logger.warn(
        'iOS delivery uses FCM registration tokens and requires Firebase APNs configuration.',
      );
    }
  }

  async sendPush(payload: PushNotificationPayload): Promise<PushNotificationResult> {
    // This adapter accepts FCM registration tokens, not raw APNs device tokens.
    return this.fcmProvider.sendPush(payload);
  }
}
