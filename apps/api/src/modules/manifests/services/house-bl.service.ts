import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
} from '../../../generated/prisma/client';

import {
  PrismaService,
} from '../../../database/prisma.service';

import {
  MANIFEST_ERROR_CODES,
} from '../constants/manifest-error-codes.constants';

import {
  CreateHouseBlDto,
} from '../dto/house-bl/create-house-bl.dto';

import {
  QueryHouseBlsDto,
} from '../dto/house-bl/query-house-bls.dto';

import {
  UpdateHouseBlDto,
} from '../dto/house-bl/update-house-bl.dto';

import {
  ManifestMapper,
} from '../mappers/manifest.mapper';

import {
  ManifestStatePolicy,
} from '../policies/manifest-state.policy';

@Injectable()
export class HouseBlService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getMblWithManifestOrThrow(
    icdId: string,
    manifestId: string,
    mblId: string,
  ) {
    const mbl = await this.prisma.masterBl.findFirst({
      where: {
        id: mblId,
        manifestId,
        manifest: {
          icdId,
        },
      },
      include: {
        manifest: true,
      },
    });

    if (!mbl) {
      throw new NotFoundException({
        code: MANIFEST_ERROR_CODES.MBL_NOT_FOUND,
        message: 'Không tìm thấy Master B/L hoặc Manifest tương ứng.',
      });
    }

    return mbl;
  }

  async list(
    icdId: string,
    manifestId: string,
    mblId: string,
    query: QueryHouseBlsDto,
  ) {
    await this.getMblWithManifestOrThrow(icdId, manifestId, mblId);

    const {
      page,
      pageSize,
      search,
      consigneeId,
      clearingAgentId,
    } = query;

    const skip = (page - 1) * pageSize;

    const where: Prisma.HouseBlWhereInput = {
      masterBlId: mblId,
      ...(consigneeId ? { consigneeId } : {}),
      ...(clearingAgentId ? { clearingAgentId } : {}),
      ...(search
        ? {
            OR: [
              {
                hblNumber: {
                  contains: search,
                },
              },
              {
                cargoDescription: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.houseBl.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          consignee: true,
          clearingAgent: true,
        },
      }),
      this.prisma.houseBl.count({ where }),
    ]);

    return {
      items: items.map(ManifestMapper.toHouseBlResponse),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async create(
    icdId: string,
    manifestId: string,
    mblId: string,
    dto: CreateHouseBlDto,
  ) {
    const mbl = await this.getMblWithManifestOrThrow(
      icdId,
      manifestId,
      mblId,
    );

    ManifestStatePolicy.assertCanModifyBills(mbl.manifest.status);

    const consignee = await this.prisma.consignee.findFirst({
      where: {
        id: dto.consigneeId,
        active: true,
      },
    });

    if (!consignee) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.CONSIGNEE_INVALID,
        message: 'Consignee không hợp lệ hoặc đã bị vô hiệu hóa.',
      });
    }

    const clearingAgent = await this.prisma.clearingAgent.findFirst({
      where: {
        id: dto.clearingAgentId,
        active: true,
      },
    });

    if (!clearingAgent) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.CLEARING_AGENT_INVALID,
        message: 'Clearing Agent không hợp lệ hoặc đã bị vô hiệu hóa.',
      });
    }

    const existingHbl = await this.prisma.houseBl.findFirst({
      where: {
        masterBlId: mblId,
        hblNumber: dto.hblNumber,
      },
    });

    if (existingHbl) {
      throw new ConflictException({
        code: MANIFEST_ERROR_CODES.HBL_NUMBER_IN_USE,
        message: 'Mã House B/L đã tồn tại trong Master B/L này.',
      });
    }

    const hbl = await this.prisma.houseBl.create({
      data: {
        masterBlId: mblId,
        hblNumber: dto.hblNumber,
        consigneeId: dto.consigneeId,
        clearingAgentId: dto.clearingAgentId,
        cargoDescription: dto.cargoDescription,
        grossWeight: new Prisma.Decimal(dto.grossWeight),
        packageCount: dto.packageCount,
      },
      include: {
        consignee: true,
        clearingAgent: true,
      },
    });

    return ManifestMapper.toHouseBlResponse(hbl);
  }

  async update(
    icdId: string,
    manifestId: string,
    mblId: string,
    hblId: string,
    dto: UpdateHouseBlDto,
  ) {
    const mbl = await this.getMblWithManifestOrThrow(
      icdId,
      manifestId,
      mblId,
    );

    ManifestStatePolicy.assertCanModifyBills(mbl.manifest.status);

    const hbl = await this.prisma.houseBl.findFirst({
      where: {
        id: hblId,
        masterBlId: mblId,
      },
    });

    if (!hbl) {
      throw new NotFoundException({
        code: MANIFEST_ERROR_CODES.HBL_NOT_FOUND,
        message: 'Không tìm thấy House B/L.',
      });
    }

    if (dto.hblNumber && dto.hblNumber !== hbl.hblNumber) {
      const existing = await this.prisma.houseBl.findFirst({
        where: {
          masterBlId: mblId,
          hblNumber: dto.hblNumber,
        },
      });

      if (existing) {
        throw new ConflictException({
          code: MANIFEST_ERROR_CODES.HBL_NUMBER_IN_USE,
          message: 'Mã House B/L đã tồn tại trong Master B/L này.',
        });
      }
    }

    if (dto.consigneeId) {
      const consignee = await this.prisma.consignee.findFirst({
        where: {
          id: dto.consigneeId,
          active: true,
        },
      });

      if (!consignee) {
        throw new BadRequestException({
          code: MANIFEST_ERROR_CODES.CONSIGNEE_INVALID,
          message: 'Consignee không hợp lệ hoặc đã bị vô hiệu hóa.',
        });
      }
    }

    if (dto.clearingAgentId) {
      const clearingAgent = await this.prisma.clearingAgent.findFirst({
        where: {
          id: dto.clearingAgentId,
          active: true,
        },
      });

      if (!clearingAgent) {
        throw new BadRequestException({
          code: MANIFEST_ERROR_CODES.CLEARING_AGENT_INVALID,
          message: 'Clearing Agent không hợp lệ hoặc đã bị vô hiệu hóa.',
        });
      }
    }

    const updated = await this.prisma.houseBl.update({
      where: { id: hblId },
      data: {
        ...(dto.hblNumber ? { hblNumber: dto.hblNumber } : {}),
        ...(dto.consigneeId ? { consigneeId: dto.consigneeId } : {}),
        ...(dto.clearingAgentId
          ? { clearingAgentId: dto.clearingAgentId }
          : {}),
        ...(dto.cargoDescription
          ? { cargoDescription: dto.cargoDescription }
          : {}),
        ...(dto.grossWeight !== undefined
          ? { grossWeight: new Prisma.Decimal(dto.grossWeight) }
          : {}),
        ...(dto.packageCount !== undefined
          ? { packageCount: dto.packageCount }
          : {}),
      },
      include: {
        consignee: true,
        clearingAgent: true,
      },
    });

    return ManifestMapper.toHouseBlResponse(updated);
  }

  async remove(
    icdId: string,
    manifestId: string,
    mblId: string,
    hblId: string,
  ) {
    const mbl = await this.getMblWithManifestOrThrow(
      icdId,
      manifestId,
      mblId,
    );

    ManifestStatePolicy.assertCanModifyBills(mbl.manifest.status);

    const hbl = await this.prisma.houseBl.findFirst({
      where: {
        id: hblId,
        masterBlId: mblId,
      },
    });

    if (!hbl) {
      throw new NotFoundException({
        code: MANIFEST_ERROR_CODES.HBL_NOT_FOUND,
        message: 'Không tìm thấy House B/L.',
      });
    }

    await this.prisma.houseBl.delete({
      where: { id: hblId },
    });

    return {
      success: true,
      message: 'Đã xóa House B/L thành công.',
    };
  }
}
