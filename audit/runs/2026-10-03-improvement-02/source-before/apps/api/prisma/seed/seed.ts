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

import {
  TariffStatus,
  ContainerSize,
  ContainerType,
  ContainerVisitStatus,
  FullEmptyStatus,
  ContainerCategory,
  ManifestStatus,
  PartnerApiClientStatus,
  TransportHandoverStatus,
  YardLocationSource,
} from '../../src/generated/prisma/client';

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

function validateRolePermissionReferences(): void {
  const permissionCodes = new Set(permissions.map((p) => p.code as string));
  const missing = new Set<string>();

  for (const permissionCodesForRole of Object.values(rolePermissions)) {
    for (const code of permissionCodesForRole) {
      if (!permissionCodes.has(code)) {
        missing.add(code);
      }
    }
  }

  if (missing.size > 0) {
    throw new Error(
      `Seed permissions are missing referenced codes: ${[...missing].sort().join(', ')}`,
    );
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
async function seedAdminUser(icdId: string): Promise<any> {
  const name = getRequiredEnvironment('BOOTSTRAP_ADMIN_NAME');
  const email = getRequiredEnvironment('BOOTSTRAP_ADMIN_EMAIL').trim().toLowerCase();
  const password = getRequiredEnvironment('BOOTSTRAP_ADMIN_PASSWORD');

  const defaultUsers = [
    { name, email, roleCode: ROLE_CODES.ADMIN },
    { name: 'Trần Quản Lý (Manager)', email: 'manager@icd.local', roleCode: ROLE_CODES.MANAGER },
    { name: 'Nguyễn Thị Lan (Điều Phối)', email: 'operator@icd.local', roleCode: ROLE_CODES.OPERATOR },
    { name: 'Trần Thị Chứng Từ (Docs)', email: 'docs@icd.local', roleCode: ROLE_CODES.OPERATOR },
    { name: 'Lê Văn Cổng (Gate Staff)', email: 'gate@icd.local', roleCode: ROLE_CODES.GATE_STAFF },
    { name: 'Phạm Văn Bãi (Yard Staff)', email: 'yard@icd.local', roleCode: ROLE_CODES.YARD_STAFF },
    { name: 'Đại Lý Hải Quan TransLog', email: 'agent@icd.local', roleCode: ROLE_CODES.AGENT },
    { name: 'Công ty Samsung SEVT', email: 'consignee@icd.local', roleCode: ROLE_CODES.CONSIGNEE },
  ];

  let adminUserRecord: any = null;

  for (const u of defaultUsers) {
    let user = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (!user) {
      const passwordHash = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          icdId,
          name: u.name,
          email: u.email,
          passwordHash,
          active: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { icdId, name: u.name, active: true },
      });
    }

    const role = await prisma.role.findUnique({
      where: { code: u.roleCode },
    });

    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    if (u.roleCode === ROLE_CODES.ADMIN) {
      adminUserRecord = user;
    }
  }

  return adminUserRecord;
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

async function seedWorkQueueSettings(icdId: string): Promise<void> {
  const workQueueSettings = [
    {
      key: 'GATE_IN_SLA_MINUTES',
      value: '120',
    },
    {
      key: 'YARD_ASSIGN_SLA_MINUTES',
      value: '60',
    },
    {
      key: 'WORK_QUEUE_DUE_SOON_MINUTES',
      value: '30',
    },
    {
      key: 'GATE_OUT_DUE_SOON_MINUTES',
      value: '120',
    },
  ];

  for (const setting of workQueueSettings) {
    await prisma.icdSetting.upsert({
      where: {
        icdId_key: {
          icdId,
          key: setting.key,
        },
      },
      update: {},
      create: {
        icdId,
        key: setting.key,
        value: setting.value,
        valueType: 'NUMBER',
      },
    });
  }
}

async function seedEdiSettings(icdId: string): Promise<void> {
  const ediSettings = [
    {
      key: 'EDI_MAX_RETRIES',
      value: '5',
    },
    {
      key: 'EDI_BASE_BACKOFF_SECONDS',
      value: '30',
    },
    {
      key: 'EDI_MAX_BACKOFF_SECONDS',
      value: '1800',
    },
    {
      key: 'EDI_DISPATCH_BATCH_SIZE',
      value: '20',
    },
    {
      key: 'EDI_PROCESSING_STALE_SECONDS',
      value: '300',
    },
  ];

  for (const setting of ediSettings) {
    await prisma.icdSetting.upsert({
      where: {
        icdId_key: {
          icdId,
          key: setting.key,
        },
      },
      update: {},
      create: {
        icdId,
        key: setting.key,
        value: setting.value,
        valueType: 'NUMBER',
      },
    });
  }
}

async function seedMasterCatalogs(): Promise<void> {
  // Shipping Lines (International & Vietnam Domestic)
  const shippingLinesData = [
    // Top Vietnam Shipping Lines
    { name: 'Công ty Cổ phần Vận tải biển Việt Nam (VOSCO)', scacCode: 'VSCU' },
    { name: 'Tổng công ty Hàng hải Việt Nam (VIMC / Vinalines)', scacCode: 'VMCU' },
    { name: 'Công ty CP Vận tải và Xếp dỡ Hải An (HATS / HAH)', scacCode: 'HACU' },
    { name: 'Công ty CP Vận tải Thủy Tân Cảng (Tan Cang Shipping)', scacCode: 'TCSU' },
    { name: 'Công ty Vận tải Biển Đông (Bien Dong Shipping)', scacCode: 'BDCU' },
    { name: 'Công ty Cổ phần Gemadept (GMD Shipping)', scacCode: 'GLDU' },
    { name: 'Công ty Cổ phần Vinafco (Vinafco Shipping)', scacCode: 'VFCU' },
    { name: 'Công ty Vận tải biển Nhật Việt (Glory Marine)', scacCode: 'GLRU' },
    // Global Major Carriers
    { name: 'MSC (Mediterranean Shipping Company)', scacCode: 'MSCU' },
    { name: 'Maersk Line (A.P. Moller)', scacCode: 'MAEU' },
    { name: 'CMA CGM Group', scacCode: 'CMDU' },
    { name: 'COSCO Shipping Lines', scacCode: 'COSU' },
    { name: 'Hapag-Lloyd AG', scacCode: 'HLCU' },
    { name: 'ONE (Ocean Network Express)', scacCode: 'ONEY' },
    { name: 'Evergreen Marine Corp.', scacCode: 'EGLV' },
    { name: 'HMM Co., Ltd. (Hyundai)', scacCode: 'HDMU' },
    { name: 'Yang Ming Marine Transport', scacCode: 'YMLU' },
    { name: 'Wan Hai Lines', scacCode: 'WHLC' },
  ];
  for (const sl of shippingLinesData) {
    await prisma.shippingLine.upsert({
      where: { scacCode: sl.scacCode },
      update: { name: sl.name, active: true },
      create: { name: sl.name, scacCode: sl.scacCode, active: true },
    });
  }

  // Consignees (Major Exporters & Manufacturers)
  const consigneesData = [
    { name: 'Công ty TNHH Samsung Electronics VN (SEVT)', taxCode: '0312345678', phone: '02437654321', email: 'logistics.sevt@samsung.com', address: 'KCN Yên Phong, Bắc Ninh' },
    { name: 'Công ty TNHH LG Innotek Việt Nam Hải Phòng', taxCode: '0201234567', phone: '02253888999', email: 'supplychain@lginnotek.com', address: 'KCN Tràng Duệ, Hải Phòng' },
    { name: 'Công ty Cổ phần Sản xuất & Kinh doanh VinFast', taxCode: '0801234567', phone: '02253999888', email: 'inbound@vinfast.vn', address: 'Khu kinh tế Đình Vũ - Cát Hải, Hải Phòng' },
    { name: 'Công ty Cổ phần Tập đoàn Hòa Phát', taxCode: '0101234567', phone: '02439876543', email: 'shipping@hoaphat.com.vn', address: 'KCN Phố Nối A, Hưng Yên' },
    { name: 'Công ty CP Ô tô Trường Hải (THACO Chu Lai)', taxCode: '4000345678', phone: '02353567890', email: 'logistics@thaco.com.vn', address: 'Khu KT Mở Chu Lai, Núi Thành, Quảng Nam' },
    { name: 'Công ty TNHH Gang Thép Hưng Nghiệp Formosa Hà Tĩnh', taxCode: '3001234567', phone: '02393722222', email: 'import@fhs.com.vn', address: 'Khu KT Vũng Áng, Kỳ Anh, Hà Tĩnh' },
    { name: 'Tổng Công ty Dệt May Việt Nam (Vinatex)', taxCode: '0900123456', phone: '02438257890', email: 'ops@vinatex.com.vn', address: '41A Lý Thái Tổ, Hoàn Kiếm, Hà Nội' },
    { name: 'Công ty CP Thực phẩm Đông lạnh Sao Biển', taxCode: '0355667788', phone: '02838990011', email: 'export@saobienseafood.vn', address: 'KCN Hiệp Phước, Nhà Bè, TP.HCM' },
    { name: 'Công ty TNHH Hyosung Việt Nam (Đồng Nai)', taxCode: '3600876543', phone: '02513560000', email: 'supply@hyosung.com', address: 'KCN Nhơn Trạch 5, Nhơn Trạch, Đồng Nai' },
  ];
  for (const csg of consigneesData) {
    await prisma.consignee.upsert({
      where: { taxCode: csg.taxCode },
      update: { name: csg.name, phone: csg.phone, email: csg.email, address: csg.address, active: true },
      create: { name: csg.name, taxCode: csg.taxCode, phone: csg.phone, email: csg.email, address: csg.address, active: true },
    });
  }

  // Clearing Agents
  const agentsData = [
    { name: 'Đại lý Hải quan TransLog Toàn Cầu', licenseNo: '0399887766' },
    { name: 'Đại lý Hải quan Quốc tế Việt Thịnh', licenseNo: '0388776655' },
    { name: 'Đại lý T&M Forwarding & Customs Broker', licenseNo: '0377889900' },
    { name: 'Đại lý Hải quan Tân Cảng Logistics', licenseNo: '0366778899' },
  ];
  for (const ca of agentsData) {
    await prisma.clearingAgent.upsert({
      where: { licenseNo: ca.licenseNo },
      update: { name: ca.name, active: true },
      create: { name: ca.name, licenseNo: ca.licenseNo, active: true },
    });
  }

  // Transporters (Trucking & Haulage companies)
  const transportersData = [
    { name: 'Công ty CP Vận tải Container Bắc Nam (VNPost Logistics)', taxCode: '0377665544' },
    { name: 'Công ty TNHH Vận tải Biển & Đường bộ Đại Dương Xanh', taxCode: '0366554433' },
    { name: 'Công ty CP Dịch vụ Vận tải Container Hoàng Long', taxCode: '0355443322' },
    { name: 'Công ty CP Logistics Á Châu (AsiaTrans)', taxCode: '0344332211' },
    { name: 'Công ty TNHH Tiếp vận Indo-Trans (ITL Haulage)', taxCode: '0333221100' },
  ];
  for (const tp of transportersData) {
    await prisma.transporter.upsert({
      where: { taxCode: tp.taxCode },
      update: { name: tp.name, active: true },
      create: { name: tp.name, taxCode: tp.taxCode, active: true },
    });
  }
}


async function seedYardBlocksAndSlots(icdId: string): Promise<void> {
  const blocksData = [
    { blockCode: 'A', name: 'Khu A — Hàng khô Dry Cargo' },
    { blockCode: 'B', name: 'Khu B — Hàng xuất kiểm & Stripping' },
    { blockCode: 'C', name: 'Khu C — Container nặng & Chờ xuất' },
    { blockCode: 'D', name: 'Khu D — Container lạnh Reefer' },
  ];

  for (const blk of blocksData) {
    const block = await prisma.yardBlock.upsert({
      where: {
        icdId_blockCode: {
          icdId,
          blockCode: blk.blockCode,
        },
      },
      update: { name: blk.name, operational: true },
      create: {
        icdId,
        blockCode: blk.blockCode,
        name: blk.name,
        operational: true,
      },
    });

    // Create 12 slots for each block
    for (let row = 1; row <= 2; row++) {
      for (let bay = 1; bay <= 3; bay++) {
        for (let tier = 1; tier <= 2; tier++) {
          const slotCode = `${blk.blockCode}-0${row}-0${bay}-${tier}`;
          await prisma.yardSlot.upsert({
            where: {
              yardBlockId_rowNo_bayNo_tierNo: {
                yardBlockId: block.id,
                rowNo: String(row),
                bayNo: String(bay),
                tierNo: String(tier),
              },
            },
            update: {
              slotCode,
              operational: true,
              reeferPower: blk.blockCode === 'D',
            },
            create: {
              yardBlockId: block.id,
              rowNo: String(row),
              bayNo: String(bay),
              tierNo: String(tier),
              slotCode,
              operational: true,
              reeferPower: blk.blockCode === 'D',
              maxWeight: 32000,
            },
          });
        }
      }
    }
  }
}

async function seedWarehousesAndPartners(icdId: string, adminId: string): Promise<void> {
  const csg = await prisma.consignee.findFirst();
  if (csg) {
    const warehousesData = [
      {
        code: 'WH-LONG-BINH',
        name: 'Kho Ngoại quan Long Bình (Đồng Nai)',
        address: 'KCN Long Bình, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
        contactName: 'Trịnh Hoài Nam',
        contactPhone: '0912345678',
        latitude: 10.923456,
        longitude: 106.887654,
      },
      {
        code: 'WH-VSIP-BN',
        name: 'Kho Trung tâm Logistics VSIP Bắc Ninh',
        address: 'Đường Hữu Nghị 1, KCN VSIP Bắc Ninh, Từ Sơn, Bắc Ninh',
        contactName: 'Nguyễn Tiến Dũng',
        contactPhone: '0988776655',
        latitude: 21.123456,
        longitude: 105.987654,
      },
      {
        code: 'WH-PHUOC-LONG',
        name: 'Kho ICD Phước Long 3',
        address: 'Km 9, Xa lộ Hà Nội, P. Phước Long A, TP. Thủ Đức, TP.HCM',
        contactName: 'Đặng Mai Phương',
        contactPhone: '0903332211',
        latitude: 10.825123,
        longitude: 106.772341,
      },
    ];

    for (const wh of warehousesData) {
      await prisma.customerWarehouse.upsert({
        where: {
          icdId_code: {
            icdId,
            code: wh.code,
          },
        },
        update: {
          name: wh.name,
          address: wh.address,
          contactName: wh.contactName,
          contactPhone: wh.contactPhone,
          latitude: wh.latitude,
          longitude: wh.longitude,
          active: true,
        },
        create: {
          icdId,
          consigneeId: csg.id,
          code: wh.code,
          name: wh.name,
          address: wh.address,
          contactName: wh.contactName,
          contactPhone: wh.contactPhone,
          latitude: wh.latitude,
          longitude: wh.longitude,
          active: true,
        },
      });
    }
  }

  // Partner API Clients
  const partners = [
    {
      partnerCode: 'ABC_LOGISTICS',
      partnerName: 'Công ty Cổ phần Vận tải & Tiếp vận ABC',
      apiKeyHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
      keyLast4: '9A4F',
      scopes: ['handover.read', 'handover.accept', 'handover.transit', 'handover.confirm_warehouse'],
    },
    {
      partnerCode: 'VINATRANS_EXPRESS',
      partnerName: 'Tổng Công ty Giao nhận Kho vận VinaTrans',
      apiKeyHash: 'b776b56a315330ae528f5978fedd50c9b15b20400020b18f009f970808b38bf4',
      keyLast4: '3F88',
      scopes: ['handover.read', 'handover.accept', 'handover.transit', 'handover.confirm_warehouse', 'handover.failure'],
    },
  ];

  for (const p of partners) {
    await prisma.partnerApiClient.upsert({
      where: { partnerCode: p.partnerCode },
      update: {
        partnerName: p.partnerName,
        status: PartnerApiClientStatus.ACTIVE,
        scopes: p.scopes,
      },
      create: {
        partnerCode: p.partnerCode,
        partnerName: p.partnerName,
        apiKeyHash: p.apiKeyHash,
        keyLast4: p.keyLast4,
        status: PartnerApiClientStatus.ACTIVE,
        scopes: p.scopes,
        createdById: adminId,
      },
    });
  }

}

async function seedVietnameseContainers(icdId: string, adminId: string): Promise<void> {
  const vnLines = await prisma.shippingLine.findMany({
    where: { scacCode: { in: ['VSCU', 'VMCU', 'HACU', 'TCSU', 'BDCU', 'GLDU', 'VFCU', 'GLRU'] } },
  });
  if (vnLines.length === 0) return;

  const consignees = await prisma.consignee.findMany();
  const clearingAgents = await prisma.clearingAgent.findMany();
  const slots = await prisma.yardSlot.findMany({ include: { yardBlock: true } });

  const containerSpecs = [
    {
      containerNumber: 'HACU4829103',
      isoCode: '45R1',
      size: ContainerSize.SIZE_40,
      type: ContainerType.REEFER,
      lineScac: 'HACU',
      vessel: 'HAIAN BELL 014W',
      mbl: 'MBL-HACU-2026-001',
      hbl: 'HBL-HACU-VN01',
      cargo: 'Thủy hải sản tôm đông lạnh xuất khẩu (Frozen Shrimp)',
      grossWeight: 26500,
      sealNo: 'HAH-883921',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'D-01-01-1',
      consigneeTax: '0355667788', // Sao Bien Seafood
    },
    {
      containerNumber: 'VSCU1049281',
      isoCode: '22G1',
      size: ContainerSize.SIZE_20,
      type: ContainerType.DRY,
      lineScac: 'VSCU',
      vessel: 'VOSCO SUNRISE 2026N',
      mbl: 'MBL-VSCU-2026-002',
      hbl: 'HBL-VSCU-VN02',
      cargo: 'Thép cuộn mạ kẽm chất lượng cao (Galvanized Steel Coils)',
      grossWeight: 28400,
      sealNo: 'VOS-112093',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'C-01-01-1',
      consigneeTax: '0101234567', // Hoa Phat
    },
    {
      containerNumber: 'TCSU8849201',
      isoCode: '42G1',
      size: ContainerSize.SIZE_40,
      type: ContainerType.DRY,
      lineScac: 'TCSU',
      vessel: 'TAN CANG GLORY 108E',
      mbl: 'MBL-TCSU-2026-003',
      hbl: 'HBL-TCSU-VN03',
      cargo: 'Màn hình & Linh kiện điện tử thông minh (Display Modules)',
      grossWeight: 21500,
      sealNo: 'TC-994012',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'A-01-01-1',
      consigneeTax: '0312345678', // Samsung SEVT
    },
    {
      containerNumber: 'GLDU5739201',
      isoCode: '45G1',
      size: ContainerSize.SIZE_40,
      type: ContainerType.DRY,
      lineScac: 'GLDU',
      vessel: 'GEMADEPT PROGRESS 092S',
      mbl: 'MBL-GLDU-2026-004',
      hbl: 'HBL-GLDU-VN04',
      cargo: 'Bộ linh kiện truyền động pin xe điện (EV Powertrain)',
      grossWeight: 24300,
      sealNo: 'GMD-772810',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'A-01-02-1',
      consigneeTax: '0801234567', // VinFast
    },
    {
      containerNumber: 'VMCU9284012',
      isoCode: '22G1',
      size: ContainerSize.SIZE_20,
      type: ContainerType.DRY,
      lineScac: 'VMCU',
      vessel: 'VIMC PIONEER 005W',
      mbl: 'MBL-VMCU-2026-005',
      hbl: 'HBL-VMCU-VN05',
      cargo: 'Sợi bông tự nhiên dệt may xuất khẩu (Cotton Yarn)',
      grossWeight: 19800,
      sealNo: 'VMC-445829',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'B-01-01-1',
      consigneeTax: '0900123456', // Vinatex
    },
    {
      containerNumber: 'BDCU3849102',
      isoCode: '22G1',
      size: ContainerSize.SIZE_20,
      type: ContainerType.DRY,
      lineScac: 'BDCU',
      vessel: 'BIEN DONG STAR 033E',
      mbl: 'MBL-BDCU-2026-006',
      hbl: 'HBL-BDCU-VN06',
      cargo: 'Hạt nhựa nguyên sinh kỹ thuật cao (Polypropylene Resins)',
      grossWeight: 22000,
      sealNo: 'BDS-339102',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'B-01-02-1',
      consigneeTax: '3600876543', // Hyosung
    },
    {
      containerNumber: 'VFCU7482910',
      isoCode: '42G1',
      size: ContainerSize.SIZE_40,
      type: ContainerType.DRY,
      lineScac: 'VFCU',
      vessel: 'VINAFCO FORTUNE 018N',
      mbl: 'MBL-VFCU-2026-007',
      hbl: 'HBL-VFCU-VN07',
      cargo: 'Camera Modules & Thiết bị cảm biến quang học',
      grossWeight: 18200,
      sealNo: 'VFC-882019',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'A-01-03-1',
      consigneeTax: '0201234567', // LG Innotek
    },
    {
      containerNumber: 'HACU2938475',
      isoCode: '22G1',
      size: ContainerSize.SIZE_20,
      type: ContainerType.DRY,
      lineScac: 'HACU',
      vessel: 'HAIAN LINK 044S',
      mbl: 'MBL-HACU-2026-008',
      hbl: 'HBL-HACU-VN08',
      cargo: 'Phụ tùng cabin xe tải lắp ráp CKD (Auto Parts)',
      grossWeight: 17500,
      sealNo: 'HAH-192837',
      state: ContainerVisitStatus.AUTHORIZED,
      consigneeTax: '4000345678', // THACO
    },
    {
      containerNumber: 'TCSU9283741',
      isoCode: '45R1',
      size: ContainerSize.SIZE_40,
      type: ContainerType.REEFER,
      lineScac: 'TCSU',
      vessel: 'TAN CANG OCEAN 021E',
      mbl: 'MBL-TCSU-2026-009',
      hbl: 'HBL-TCSU-VN09',
      cargo: 'Thanh long & Xoài tươi lạnh bảo quản nhiệt độ -18C',
      grossWeight: 27100,
      sealNo: 'TC-552819',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'D-01-02-1',
      consigneeTax: '0355667788', // Sao Bien Seafood
    },
    {
      containerNumber: 'VSCU6748392',
      isoCode: '42G1',
      size: ContainerSize.SIZE_40,
      type: ContainerType.DRY,
      lineScac: 'VSCU',
      vessel: 'VOSCO VANGUARD 012W',
      mbl: 'MBL-VSCU-2026-010',
      hbl: 'HBL-VSCU-VN10',
      cargo: 'Phôi thép đúc đặc chủng & Thép xây dựng kết cấu',
      grossWeight: 29500,
      sealNo: 'VOS-993821',
      state: ContainerVisitStatus.IN_YARD,
      slotCode: 'C-01-02-1',
      consigneeTax: '3001234567', // Formosa
    },
  ];

  for (let i = 0; i < containerSpecs.length; i++) {
    const spec = containerSpecs[i];
    const line = vnLines.find((l) => l.scacCode === spec.lineScac) || vnLines[0];
    const csg = consignees.find((c) => c.taxCode === spec.consigneeTax) || consignees[0];
    const agent = clearingAgents[i % clearingAgents.length] || clearingAgents[0];

    // 1. Container asset
    const container = await prisma.container.upsert({
      where: { containerNumber: spec.containerNumber },
      update: {
        isoCode: spec.isoCode,
        size: spec.size,
        type: spec.type,
      },
      create: {
        containerNumber: spec.containerNumber,
        isoCode: spec.isoCode,
        size: spec.size,
        type: spec.type,
        tareWeight: spec.size === ContainerSize.SIZE_20 ? 2200 : 3800,
        maxPayload: spec.size === ContainerSize.SIZE_20 ? 28280 : 26680,
      },
    });

    // 2. Manifest
    const manifest = await prisma.manifest.upsert({
      where: {
        icdId_manifestNo: {
          icdId,
          manifestNo: `MNF-VN-${spec.lineScac}-${String(i + 1).padStart(3, '0')}`,
        },
      },
      update: {
        status: ManifestStatus.SUBMITTED,
      },
      create: {
        icdId,
        manifestNo: `MNF-VN-${spec.lineScac}-${String(i + 1).padStart(3, '0')}`,
        shippingLineId: line.id,
        vesselName: spec.vessel,
        voyageNo: spec.vessel.split(' ').pop() || '01',
        eta: new Date(Date.now() - 3600 * 1000 * 48),
        portOfLoading: 'VNHPH (Hải Phòng Port)',
        portOfDischarge: 'VNSGN (Cát Lái / Tân Cảng)',
        status: ManifestStatus.SUBMITTED,
        createdById: adminId,
      },
    });

    // 3. Master BL
    const masterBl = await prisma.masterBl.upsert({
      where: {
        manifestId_mblNumber: {
          manifestId: manifest.id,
          mblNumber: spec.mbl,
        },
      },
      update: {},
      create: {
        manifestId: manifest.id,
        mblNumber: spec.mbl,
        shippingLineId: line.id,
      },
    });

    // 4. House BL
    const houseBl = await prisma.houseBl.upsert({
      where: {
        masterBlId_hblNumber: {
          masterBlId: masterBl.id,
          hblNumber: spec.hbl,
        },
      },
      update: {
        cargoDescription: spec.cargo,
        grossWeight: spec.grossWeight,
      },
      create: {
        masterBlId: masterBl.id,
        hblNumber: spec.hbl,
        consigneeId: csg.id,
        clearingAgentId: agent.id,
        cargoDescription: spec.cargo,
        grossWeight: spec.grossWeight,
        packageCount: 50 + (i * 12),
      },
    });

    // 5. Container Visit
    let visit = await prisma.containerVisit.findFirst({
      where: {
        icdId,
        containerId: container.id,
      },
    });

    if (!visit) {
      visit = await prisma.containerVisit.create({
        data: {
          icdId,
          containerId: container.id,
          manifestId: manifest.id,
          masterBlId: masterBl.id,
          houseBlId: houseBl.id,
          consigneeId: csg.id,
          state: spec.state,
          fullEmptyStatus: FullEmptyStatus.FULL,
          sealNo: spec.sealNo,
          cargoDescription: spec.cargo,
          grossWeight: spec.grossWeight,
          category: ContainerCategory.IMPORT,
          gateInAt: spec.state === ContainerVisitStatus.IN_YARD ? new Date(Date.now() - 3600 * 1000 * 24) : null,
        },
      });
    }

    // 6. Assign yard slot if specified
    if (spec.slotCode && spec.state === ContainerVisitStatus.IN_YARD) {
      const slot = slots.find((s) => s.slotCode === spec.slotCode);
        // Location Log (check if already assigned)
        const existingLog = await prisma.containerLocationLog.findFirst({
          where: { containerVisitId: visit.id, yardSlotId: slot.id, endedAt: null },
        });
        if (!existingLog) {
          await prisma.containerLocationLog.create({
            data: {
              containerVisitId: visit.id,
              yardSlotId: slot.id,
              assignedById: adminId,
              source: YardLocationSource.RULE,
            },
          });
        }
    }
  }
}

async function seedEdiRoutes(icdId: string): Promise<void> {
  const lines = await prisma.shippingLine.findMany();
  for (const line of lines) {
    await prisma.ediRoute.upsert({
      where: {
        icdId_shippingLineId: {
          icdId,
          shippingLineId: line.id,
        },
      },
      update: { enabled: true, transport: 'MOCK' as any, partnerTarget: 'mock://local' },
      create: {
        icdId,
        shippingLineId: line.id,
        transport: 'MOCK' as any,
        partnerTarget: 'mock://local',
        enabled: true,
      },
    });
  }
}

async function main(): Promise<void> {
  validateRolePermissionReferences();

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

  await seedWorkQueueSettings(site.id);
  console.log('Seeded Work Queue Settings.');

  await seedEdiSettings(site.id);
  console.log('Seeded EDI Settings.');

  await seedMasterCatalogs();
  console.log('Seeded Master Catalogs (Shipping Lines, Consignees, Agents, Transporters).');

  await seedYardBlocksAndSlots(site.id);
  console.log('Seeded Yard Blocks & Slots (A, B, C, D).');

  await seedWarehousesAndPartners(site.id, admin.id);
  console.log('Seeded Warehouses & Partner Clients.');

  await seedEdiRoutes(site.id);
  console.log('Seeded EDI Routes.');

  await seedVietnameseContainers(site.id, admin.id);
  console.log('Seeded Vietnamese Container inventory & visits.');

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
