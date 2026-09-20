import crypto from 'node:crypto';
import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import {
  NotificationDeliveryStatus,
  NotificationDevicePlatform,
  NotificationType,
} from '../src/generated/prisma/client';
import { assertE2EDatabase } from './helpers/assert-e2e-database';
import { createCoreScenario } from './helpers/core-lifecycle-fixture';

config({ path: path.resolve(__dirname, '../../../.env') });

type AuthResult = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};

type NotificationHistoryResponse = {
  data: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    readAt: string | null;
    createdAt: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
};

describe('Notifications Integration E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let adminUserId: string;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@icd.local';
  const adminPassword =
    process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ICD2026!StrongPass';

  async function login(email: string, password: string): Promise<AuthResult> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return res.body as AuthResult;
  }

  async function createUserHelper(prefix: string): Promise<{
    id: string;
    email: string;
    accessToken: string;
  }> {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const email = `${prefix.toLowerCase()}_${suffix}@example.test`;
    const password = `UserPass@${suffix}!Aa1`;

    const createRes = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: `Notification User ${suffix}`,
        email,
        password,
        roleCodes: ['ADMIN'], // Grant ADMIN to avoid permission blocks
      })
      .expect(201);

    const auth = await login(email, password);
    return {
      id: createRes.body.data.id,
      email,
      accessToken: auth.accessToken,
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await assertE2EDatabase(prisma);

    const adminAuth = await login(adminEmail, adminPassword);
    adminAccessToken = adminAuth.accessToken;
    adminUserId = adminAuth.user.id;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. registers device with encrypted token persistence in DB without plaintext', async () => {
    const rawToken = `fcm_raw_token_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const regRes = await request(app.getHttpServer())
      .post('/api/notifications/register-device')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        platform: NotificationDevicePlatform.ANDROID,
        token: rawToken,
      })
      .expect(200);

    expect(regRes.body.success).toBe(true);
    expect(regRes.body.deviceId).toBeDefined();

    const device = await prisma.notificationDevice.findUniqueOrThrow({
      where: { id: regRes.body.deviceId },
    });

    expect(device.active).toBe(true);
    expect(device.tokenHash).toEqual(expect.any(String));
    expect(device.tokenCiphertext).toEqual(expect.any(String));
    expect(device.tokenIv).toEqual(expect.any(String));
    expect(device.tokenAuthTag).toEqual(expect.any(String));

    // Security Invariant: Plaintext token must NEVER appear anywhere in the database record
    expect(device.tokenCiphertext).not.toContain(rawToken);
    expect(JSON.stringify(device)).not.toContain(rawToken);
  });

  it('2. handles duplicate device registration idempotently without creating duplicate active records', async () => {
    const rawToken = `fcm_duplicate_test_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    await request(app.getHttpServer())
      .post('/api/notifications/register-device')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        platform: NotificationDevicePlatform.ANDROID,
        token: rawToken,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/notifications/register-device')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        platform: NotificationDevicePlatform.ANDROID,
        token: rawToken,
      })
      .expect(200);

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const activeDevices = await prisma.notificationDevice.findMany({
      where: {
        userId: adminUserId,
        tokenHash,
        active: true,
      },
    });

    expect(activeDevices).toHaveLength(1);
  });

  it('3. triggers Notification & pending NotificationDelivery on business Gate-out event', async () => {
    // Ensure user has at least one active registered device
    const rawToken = `fcm_gateout_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    await request(app.getHttpServer())
      .post('/api/notifications/register-device')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        platform: NotificationDevicePlatform.ANDROID,
        token: rawToken,
      })
      .expect(200);

    const scenario = await createCoreScenario(app, adminAccessToken, 'GATE_PASS');

    // Perform Gate-out
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      })
      .expect(201);

    // Wait briefly for asynchronous trigger
    await new Promise((resolve) => setTimeout(resolve, 300));

    const notification = await prisma.notification.findFirstOrThrow({
      where: {
        recipientUserId: adminUserId,
        type: NotificationType.GATE_OUT_COMPLETED,
        sourceType: 'ContainerVisit',
        sourceId: scenario.containerVisitId,
      },
    });

    expect(notification.title).toBeDefined();
    expect(notification.body).toBeDefined();
    expect(notification.deepLink).toContain(scenario.containerVisitId);

    const deliveries = await prisma.notificationDelivery.findMany({
      where: {
        notificationId: notification.id,
      },
    });

    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries.every((item) => item.status === NotificationDeliveryStatus.PENDING)).toBe(
      true,
    );
  });

  it('4. strictly isolates history between users and returns 404 for foreign notification read attempt', async () => {
    const userA = await createUserHelper('USER_A');
    const userB = await createUserHelper('USER_B');

    // Register devices for both
    await request(app.getHttpServer())
      .post('/api/notifications/register-device')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({
        platform: NotificationDevicePlatform.ANDROID,
        token: `fcm_a_${Date.now()}`,
      })
      .expect(200);

    // Create a notification for User A via Gate-out scenario
    const scenario = await createCoreScenario(app, userA.accessToken, 'GATE_PASS');

    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      })
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // User A reads history -> finds notification
    const historyARes = await request(app.getHttpServer())
      .get('/api/notifications/history')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .expect(200);

    const historyA = historyARes.body as NotificationHistoryResponse;
    const notificationA = historyA.data.find(
      (n) => n.type === NotificationType.GATE_OUT_COMPLETED,
    );
    expect(notificationA).toBeDefined();

    // User B reads history -> must NOT see User A's notification
    const historyBRes = await request(app.getHttpServer())
      .get('/api/notifications/history')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(200);

    const historyB = historyBRes.body as NotificationHistoryResponse;
    const foundInB = historyB.data.find((n) => n.id === notificationA?.id);
    expect(foundInB).toBeUndefined();

    // User B attempts to mark User A's notification as read -> must return 404 (prevent leak)
    await request(app.getHttpServer())
      .patch(`/api/notifications/${notificationA?.id}/read`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .expect(404);
  });

  it('5. marks single notification as read and marks all unread notifications as read', async () => {
    const user = await createUserHelper('USER_READ');

    // Create 2 notifications for this user via Gate-out scenarios
    const scenario1 = await createCoreScenario(app, user.accessToken, 'GATE_PASS');
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        visitId: scenario1.containerVisitId,
        qrToken: scenario1.qrToken,
      })
      .expect(201);

    const scenario2 = await createCoreScenario(app, user.accessToken, 'GATE_PASS');
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        visitId: scenario2.containerVisitId,
        qrToken: scenario2.qrToken,
      })
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 400));

    const historyRes = await request(app.getHttpServer())
      .get('/api/notifications/history')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const history = historyRes.body as NotificationHistoryResponse;
    expect(history.data.length).toBeGreaterThanOrEqual(2);

    const targetNotif = history.data[0]!;

    // Mark single notification as read
    const markRes = await request(app.getHttpServer())
      .patch(`/api/notifications/${targetNotif.id}/read`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(markRes.body.success).toBe(true);
    expect(markRes.body.readAt).toEqual(expect.any(String));

    const persisted = await prisma.notification.findUniqueOrThrow({
      where: { id: targetNotif.id },
    });
    expect(persisted.readAt).not.toBeNull();

    // Mark all remaining unread as read
    const readAllRes = await request(app.getHttpServer())
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({})
      .expect(200);

    expect(readAllRes.body.success).toBe(true);
    expect(readAllRes.body.markedCount).toBeGreaterThanOrEqual(1);

    // Verify unread count is now 0
    const finalHistoryRes = await request(app.getHttpServer())
      .get('/api/notifications/history')
      .query({ unreadOnly: true })
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    const finalHistory = finalHistoryRes.body as NotificationHistoryResponse;
    expect(finalHistory.meta.unreadCount).toBe(0);
    expect(finalHistory.data.length).toBe(0);
  });

  it('6. unregisters device and ensures no subsequent deliveries are dispatched to deactivated device', async () => {
    const user = await createUserHelper('USER_UNREG');
    const rawToken = `fcm_unreg_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // 1. Register device
    const regRes = await request(app.getHttpServer())
      .post('/api/notifications/register-device')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        platform: NotificationDevicePlatform.ANDROID,
        token: rawToken,
      })
      .expect(200);

    const deviceId = regRes.body.deviceId;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 2. Unregister device
    await request(app.getHttpServer())
      .delete('/api/notifications/unregister-device')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        token: rawToken,
      })
      .expect(200);

    const device = await prisma.notificationDevice.findFirstOrThrow({
      where: {
        userId: user.id,
        tokenHash,
      },
    });

    expect(device.active).toBe(false);

    const unregisteredAt = new Date();

    // 3. Trigger new business notification after unregister
    const scenario = await createCoreScenario(app, user.accessToken, 'GATE_PASS');
    await request(app.getHttpServer())
      .post('/api/gate-out')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({
        visitId: scenario.containerVisitId,
        qrToken: scenario.qrToken,
      })
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // 4. Invariant: No delivery records created for the inactive device after unregistration
    const deliveryCount = await prisma.notificationDelivery.count({
      where: {
        deviceId,
        notification: {
          createdAt: {
            gt: unregisteredAt,
          },
        },
      },
    });

    expect(deliveryCount).toBe(0);
  });
});
