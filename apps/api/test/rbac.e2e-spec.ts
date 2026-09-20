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
  user: {
    id: string;
    email: string;
    roleCodes: string[];
    permissionCodes: string[];
  };
};

describe('RBAC E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@icd.local';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'Admin@ICD2026!StrongPass';
  const suffix = `${Date.now()}`.slice(-10);
  const roleCode = `E2E_RBAC_${suffix}`;
  const limitedEmail = `e2e-rbac-${suffix}@example.test`;
  const limitedPassword = `E2e-Rbac-${suffix}!Aa1`;

  async function login(email: string, password: string): Promise<AuthResult> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    return response.body as AuthResult;
  }

  beforeAll(async () => {
    if (!adminEmail || !adminPassword) {
      throw new Error('Bootstrap admin credentials are missing.');
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

  it('enforces 401 -> 403 -> 200 based on users.read', async () => {
    // 1. Anonymous
    await request(app.getHttpServer())
      .get('/api/users')
      .expect(401);

    // 2. Login ADMIN
    const admin = await login(adminEmail!, adminPassword!);

    // ADMIN phải đọc users được
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    // 3. Tạo role không có permission
    const createRoleResponse = await request(app.getHttpServer())
      .post('/api/roles')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        code: roleCode,
        name: `E2E RBAC ${suffix}`,
        description: 'Temporary E2E RBAC role',
      })
      .expect(201);

    const roleId = createRoleResponse.body.data.id as string;
    expect(createRoleResponse.body.data.code).toBe(roleCode);

    // 5. Tạo limited user
    const createUserResponse = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: `E2E RBAC User ${suffix}`,
        email: limitedEmail,
        password: limitedPassword,
        roleCodes: [roleCode],
      })
      .expect(201);

    expect(createUserResponse.body.data.email).toBe(limitedEmail);

    // 6. Login limited user
    const limitedBefore = await login(limitedEmail, limitedPassword);
    expect(limitedBefore.user.roleCodes).toContain(roleCode);
    expect(limitedBefore.user.permissionCodes).not.toContain('users.read');

    // 7. Authenticated nhưng thiếu quyền
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${limitedBefore.accessToken}`)
      .expect(403);

    // 8. ADMIN cấp users.read cho role
    const permissionResponse = await request(app.getHttpServer())
      .put(`/api/roles/${roleId}/permissions`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        permissionCodes: ['users.read'],
      })
      .expect(200);

    const permissions = permissionResponse.body.data.permissions;
    // permissions can be string[] or object[] with code
    if (permissions && permissions.length > 0 && typeof permissions[0] === 'object') {
      expect(permissions.map((p: any) => p.code ?? p.permission?.code)).toContain('users.read');
    } else {
      expect(permissions).toContain('users.read');
    }

    // 9. Re-login để access token nhận permission snapshot mới
    const limitedAfter = await login(limitedEmail, limitedPassword);
    expect(limitedAfter.user.permissionCodes).toContain('users.read');

    // 10. Cùng endpoint giờ phải PASS
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${limitedAfter.accessToken}`)
      .expect(200);
  });
});
