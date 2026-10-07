import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { SmtpEmailProvider } from '../src/modules/notifications/providers/smtp-email.provider';
import { FcmPushProvider } from '../src/modules/notifications/providers/fcm-push.provider';
import { ApnsPushProvider } from '../src/modules/notifications/providers/apns-push.provider';
import { EdiHttpsTransport } from '../src/modules/edi/transports/edi-https.transport';
import { EdiSftpTransport } from '../src/modules/edi/transports/edi-sftp.transport';
import { stopE2ECronJobs } from './helpers/stop-e2e-cron-jobs';
test('serve the guarded isolated UI audit runtime', async () => {
  if (process.env.ICD_AUDIT_RUN !== '2026-10-03-improvement-02' || process.env.MYSQL_DATABASE !== 'icd_ux_audit_20261003_e2e' ||
      process.env.MYSQL_HOST !== '127.0.0.1' || process.env.MYSQL_PORT !== '3308' || process.env.API_PORT !== '3001') {
    throw new Error('UI audit runtime guard rejected configuration.');
  }
  const delivered = async () => ({ success: true, messageId: 'audit-local-delivery' });
  const rejectedExternal = async () => { throw new Error('External EDI transport disabled in isolated audit. Use MOCK route.'); };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SmtpEmailProvider).useValue({ sendEmail: delivered })
    .overrideProvider(FcmPushProvider).useValue({ sendPush: delivered })
    .overrideProvider(ApnsPushProvider).useValue({ sendPush: delivered })
    .overrideProvider(EdiHttpsTransport).useValue({ deliver: rejectedExternal, send: rejectedExternal })
    .overrideProvider(EdiSftpTransport).useValue({ deliver: rejectedExternal, send: rejectedExternal }).compile();
  const app = module.createNestApplication();
  configureApp(app);
  await app.init();
  stopE2ECronJobs(app);
  const actual = await app.get(PrismaService).$queryRaw<Array<{ name: string }>>`SELECT DATABASE() AS name`;
  if (actual[0]?.name !== process.env.MYSQL_DATABASE) { await app.close(); throw new Error('Actual database mismatch.'); }
  await app.listen(3001, '0.0.0.0');
  console.log('UI audit API ready: 3001; isolated DB; cron disabled; external delivery replaced.');
  await new Promise<void>(resolve => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
  await app.close();
}, 86_400_000);
