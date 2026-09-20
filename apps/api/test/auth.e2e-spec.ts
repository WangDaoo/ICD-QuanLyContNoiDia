import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap/configure-app';
import { PrismaService } from '../src/database/prisma.service';
import { assertE2EDatabase } from './helpers/assert-e2e-database';

config({ path: path.resolve(__dirname, '../../../.env') });

type AuthResult = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: {
    id: string;
    icdId: string;
    sessionId: string;
    name: string;
    email: string;
    roleCodes: string[];
    permissionCodes: string[];
  };
};

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@icd.local';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ICD2026!StrongPass';

  async function login(): Promise<AuthResult> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(200);

    return response.body as AuthResult;
  }

  beforeAll(async () => {
    if (!adminEmail || !adminPassword) {
      throw new Error('BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD are required for E2E.');
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await assertE2EDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login rejects invalid password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password: 'DefinitelyWrongPassword123!',
      })
      .expect(401);
  });

  it('POST /api/auth/login returns access and refresh tokens', async () => {
    const auth = await login();

    expect(auth.accessToken).toEqual(expect.any(String));
    expect(auth.refreshToken).toEqual(expect.any(String));
    expect(auth.tokenType).toBe('Bearer');
    expect(auth.expiresIn).toBe(900);
    expect(auth.refreshExpiresIn).toBe(604800);

    expect(auth.user).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        icdId: expect.any(String),
        sessionId: expect.any(String),
        email: adminEmail,
      }),
    );

    expect(auth.user.roleCodes).toContain('ADMIN');
    expect(auth.user.permissionCodes.length).toBeGreaterThan(0);
  });

  it('GET /api/auth/me rejects anonymous request', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
  });

  it('GET /api/auth/me rejects invalid bearer token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401);
  });

  it('GET /api/auth/me returns authenticated user', async () => {
    const auth = await login();

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200);

    const body = response.body.data ?? response.body;

    expect(body.email).toBe(adminEmail);
    expect(body.id).toBe(auth.user.id);
  });

  it('POST /api/auth/refresh rotates refresh token', async () => {
    const auth = await login();

    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: auth.refreshToken,
      })
      .expect(200);

    const rotated = response.body as AuthResult;

    expect(rotated.accessToken).toEqual(expect.any(String));
    expect(rotated.refreshToken).toEqual(expect.any(String));
    expect(rotated.refreshToken).not.toBe(auth.refreshToken);
    expect(rotated.user.sessionId).toBe(auth.user.sessionId);
  });

  it('detects refresh-token reuse and revokes session', async () => {
    const original = await login();

    const rotateResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: original.refreshToken,
      })
      .expect(200);

    const rotated = rotateResponse.body as AuthResult;

    // Token cũ bị reuse
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: original.refreshToken,
      })
      .expect(401);

    // Vì reuse revoke toàn bộ session, token mới của cùng session cũng không được refresh tiếp
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: rotated.refreshToken,
      })
      .expect(401);
  });

  it('POST /api/auth/refresh rejects garbage token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'not-a-valid-refresh-token',
      })
      .expect(401);
  });

  it('POST /api/auth/logout revokes refresh session', async () => {
    const auth = await login();

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
    });

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({
        refreshToken: auth.refreshToken,
      })
      .expect(401);
  });
});
