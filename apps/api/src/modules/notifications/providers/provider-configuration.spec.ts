import { ConfigService } from '@nestjs/config';
import { NotificationDevicePlatform } from '../../../generated/prisma/client';
import { SmtpEmailProvider } from './smtp-email.provider';
import { FcmPushProvider } from './fcm-push.provider';
import { ApnsPushProvider } from './apns-push.provider';

describe('Notification delivery without provider configuration', () => {
  const config = new ConfigService({});
  jest.spyOn(config, 'get').mockReturnValue(undefined);
  const payload = {
    token: 'synthetic-test-token',
    title: 'Audit notification',
    body: 'Synthetic test only',
    platform: NotificationDevicePlatform.ANDROID,
  };

  it('does not report SMTP delivery when no transport exists', async () => {
    const result = await new SmtpEmailProvider(config).sendEmail({
      to: 'recipient@example.invalid', subject: 'Audit', text: 'Test',
    });
    expect(result.success).toBe(false);
    expect(result.messageId).toBeUndefined();
    expect(result.error).toMatch(/SMTP.*configured/i);
  });

  it('does not report push delivery when Firebase is unconfigured', async () => {
    const result = await new FcmPushProvider(config).sendPush(payload);
    expect(result.success).toBe(false);
    expect(result.messageId).toBeUndefined();
    expect(result.invalidToken).not.toBe(true);
    expect(result.error).toMatch(/FCM.*configured/i);
  });

  it('preserves the delivery failure for iOS fallback', async () => {
    const result = await new ApnsPushProvider(config, new FcmPushProvider(config))
      .sendPush({ ...payload, platform: NotificationDevicePlatform.IOS });
    expect(result.success).toBe(false);
    expect(result.messageId).toBeUndefined();
  });
});
