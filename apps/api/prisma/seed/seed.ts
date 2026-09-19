import { resolve } from 'node:path';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { config } from 'dotenv';

import { PrismaClient } from '../../src/generated/prisma/client';

import { ROLE_CODES } from '../../src/common/constants/role-codes.constants';

import { hashPassword } from '../../src/common/security/password.util';

import { permissions } from './data/permissions.data';

import { rolePermissions } from './data/role-permissions.data';

import { roles } from './data/roles.data';

import { serviceTypes } from './data/service-types.data';

import { TariffStatus, ContainerSize } from '../../src/generated/prisma/client';

config({
  path: resolve(process.cwd(), '../../.env'),
});

function getRequiredEnvironment(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

const adapter = new PrismaMariaDb({
  host: process.env.MYSQL_HOST ?? '127.0.0.1',

  port: Number(process.env.MYSQL_PORT ?? 3306),

  user: getRequiredEnvironment('MYSQL_USER'),

  password: getRequiredEnvironment('MYSQL_PASSWORD'),

  database: getRequiredEnvironment('MYSQL_DATABASE'),

  connectionLimit: 2,

  connectTimeout: 5_000,
});

const prisma = new PrismaClient({
  adapter,
});

async function seedPermissions(): Promise<void> {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },

      update: {
        name: permission.name,

        description: permission.description,

        active: true,
      },

      create: {
        code: permission.code,

        name: permission.name,

        description: permission.description,

        active: true,
      },
    });
  }
}

async function seedRoles(): Promise<void> {
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        code: role.code,
      },

      update: {
        name: role.name,

        description: role.description,

        active: true,
      },

      create: {
        code: role.code,

        name: role.name,

        description: role.description,

        active: true,
      },
    });
  }
}

function getRequiredMapValue(map: Map<string, string>, key: string): string {
  const value = map.get(key);

  if (!value) {
    throw new Error(`Seed reference not found: ${key}`);
  }

  return value;
}

async function seedRolePermissions(): Promise<void> {
  const roleRecords = await prisma.role.findMany({
    select: {
      id: true,
      code: true,
    },
  });

  const permissionRecords = await prisma.permission.findMany({
    select: {
      id: true,
      code: true,
    },
  });

  const roleIdByCode = new Map(roleRecords.map((role) => [role.code, role.id]));

  const permissionIdByCode = new Map(
    permissionRecords.map((permission) => [permission.code, permission.id]),
  );

  const mappings = Object.entries(rolePermissions).flatMap(([roleCode, permissionCodes]) => {
    const roleId = getRequiredMapValue(roleIdByCode, roleCode);

    return permissionCodes.map((permissionCode) => ({
      roleId,

      permissionId: getRequiredMapValue(permissionIdByCode, permissionCode),
    }));
  });

  await prisma.rolePermission.createMany({
    data: mappings,

    skipDuplicates: true,
  });
}

/**
 * Bootstrap ICD Site.
 */
async function seedIcdSite() {
  const code = getRequiredEnvironment('BOOTSTRAP_SITE_CODE');

  const name = getRequiredEnvironment('BOOTSTRAP_SITE_NAME');

  return prisma.icdSite.upsert({
    where: {
      code,
    },

    update: {
      name,
      active: true,
    },

    create: {
      code,
      name,
      active: true,
    },
  });
}

/**
 * Bootstrap ADMIN.
 *
 * Password chỉ được sử dụng khi user chưa tồn tại.
 *
 * Chạy seed lại KHÔNG reset password.
 */
async function seedAdminUser(icdId: string): Promise<void> {
  const name = getRequiredEnvironment('BOOTSTRAP_ADMIN_NAME');

  const email = getRequiredEnvironment('BOOTSTRAP_ADMIN_EMAIL').trim().toLowerCase();

  const password = getRequiredEnvironment('BOOTSTRAP_ADMIN_PASSWORD');

  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    const passwordHash = await hashPassword(password);

    user = await prisma.user.create({
      data: {
        icdId,

        name,

        email,

        passwordHash,

        active: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        icdId,
        name,
        active: true,
      },
    });
  }

  const adminRole = await prisma.role.findUnique({
    where: {
      code: ROLE_CODES.ADMIN,
    },
  });

  if (!adminRole) {
    throw new Error('ADMIN role not found.');
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  return user;
}

async function seedServiceTypes(): Promise<void> {
  for (const st of serviceTypes) {
    await prisma.serviceType.upsert({
      where: {
        code: st.code,
      },
      update: {
        name: st.name,
        unit: st.unit,
        description: st.description,
        active: true,
      },
      create: {
        code: st.code,
        name: st.name,
        unit: st.unit,
        description: st.description,
        active: true,
      },
    });
  }
}

async function seedDefaultTariff(icdId: string, adminUserId: string): Promise<void> {
  const serviceTypeRecords = await prisma.serviceType.findMany();
  const serviceTypeMap = new Map(serviceTypeRecords.map((st) => [st.code, st.id]));

  const existingTariff = await prisma.tariff.findFirst({
    where: {
      icdId,
      status: TariffStatus.ACTIVE,
    },
  });

  if (!existingTariff) {
    const tariff = await prisma.tariff.create({
      data: {
        icdId,
        name: 'Biểu phí tiêu chuẩn ICD 2026',
        status: TariffStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01T00:00:00Z'),
        createdById: adminUserId,
      },
    });

    const receptionId = serviceTypeMap.get('RECEPTION');
    const storageId = serviceTypeMap.get('STORAGE');
    const strippingId = serviceTypeMap.get('STRIPPING');
    const inspectionId = serviceTypeMap.get('INSPECTION');
    const movementId = serviceTypeMap.get('MOVEMENT');

    const rulesData: Array<{
      tariffId: string;
      serviceTypeId: string;
      containerSize?: ContainerSize;
      unitPrice: number;
    }> = [];

    if (receptionId) {
      rulesData.push({ tariffId: tariff.id, serviceTypeId: receptionId, unitPrice: 350000 });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: receptionId,
        containerSize: ContainerSize.SIZE_20,
        unitPrice: 300000,
      });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: receptionId,
        containerSize: ContainerSize.SIZE_40,
        unitPrice: 450000,
      });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: receptionId,
        containerSize: ContainerSize.SIZE_45,
        unitPrice: 500000,
      });
    }

    if (storageId) {
      rulesData.push({ tariffId: tariff.id, serviceTypeId: storageId, unitPrice: 50000 });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: storageId,
        containerSize: ContainerSize.SIZE_20,
        unitPrice: 40000,
      });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: storageId,
        containerSize: ContainerSize.SIZE_40,
        unitPrice: 70000,
      });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: storageId,
        containerSize: ContainerSize.SIZE_45,
        unitPrice: 80000,
      });
    }

    if (strippingId) {
      rulesData.push({ tariffId: tariff.id, serviceTypeId: strippingId, unitPrice: 800000 });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: strippingId,
        containerSize: ContainerSize.SIZE_20,
        unitPrice: 650000,
      });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: strippingId,
        containerSize: ContainerSize.SIZE_40,
        unitPrice: 1100000,
      });
    }

    if (inspectionId) {
      rulesData.push({ tariffId: tariff.id, serviceTypeId: inspectionId, unitPrice: 200000 });
    }

    if (movementId) {
      rulesData.push({ tariffId: tariff.id, serviceTypeId: movementId, unitPrice: 150000 });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: movementId,
        containerSize: ContainerSize.SIZE_20,
        unitPrice: 120000,
      });
      rulesData.push({
        tariffId: tariff.id,
        serviceTypeId: movementId,
        containerSize: ContainerSize.SIZE_40,
        unitPrice: 180000,
      });
    }

    for (const rule of rulesData) {
      await prisma.tariffRule.create({
        data: rule,
      });
    }
  }
}

async function main(): Promise<void> {
  console.log('Starting ICD database seed...');

  await seedPermissions();

  console.log(`Seeded ${permissions.length} permissions.`);

  await seedRoles();

  console.log(`Seeded ${roles.length} roles.`);

  await seedRolePermissions();

  console.log('Seeded role-permission mappings.');

  const site = await seedIcdSite();

  console.log(`Seeded ICD Site: ${site.code}.`);

  const admin = await seedAdminUser(site.id);

  console.log('Seeded bootstrap ADMIN.');

  await seedServiceTypes();
  console.log('Seeded Service Types.');

  await seedDefaultTariff(site.id, admin.id);
  console.log('Seeded Default Tariff & Rules.');

  console.log('ICD database seed completed.');
}

main()
  .catch((error: unknown) => {
    console.error('ICD database seed failed.', error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
