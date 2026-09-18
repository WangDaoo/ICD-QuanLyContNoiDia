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
  CreateMasterBlDto,
} from '../dto/master-bl/create-master-bl.dto';

import {
  QueryMasterBlsDto,
} from '../dto/master-bl/query-master-bls.dto';

import {
  UpdateMasterBlDto,
} from '../dto/master-bl/update-master-bl.dto';

import {
  ManifestMapper,
} from '../mappers/manifest.mapper';

import {
  ManifestStatePolicy,
} from '../policies/manifest-state.policy';

@Injectable()
export class MasterBlService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async getManifestOrThrow(
    icdId: string,
    manifestId: string,
  ) {
    const manifest = await this.prisma.manifest.findFirst({
      where: {
        id: manifestId,
        icdId,
      },
    });

    if (!manifest) {
      throw new NotFoundException({
        code: MANIFEST_ERROR_CODES.NOT_FOUND,
        message: 'Không tìm thấy Manifest.',
      });
    }

    return manifest;
  }

  async list(
    icdId: string,
    manifestId: string,
    query: QueryMasterBlsDto,
  ) {
    await this.getManifestOrThrow(icdId, manifestId);

    const { page, pageSize, search } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MasterBlWhereInput = {
      manifestId,
      ...(search
        ? {
            mblNumber: {
              contains: search,
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.masterBl.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          shippingLine: true,
          _count: {
            select: {
              houseBls: true,
            },
          },
        },
      }),
      this.prisma.masterBl.count({ where }),
    ]);

    return {
      items: items.map(ManifestMapper.toMasterBlResponse),
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
    dto: CreateMasterBlDto,
  ) {
    const manifest = await this.getManifestOrThrow(icdId, manifestId);

    ManifestStatePolicy.assertCanModifyBills(manifest.status);

    const shippingLineId = dto.shippingLineId || manifest.shippingLineId;

    if (dto.shippingLineId) {
      const shippingLine = await this.prisma.shippingLine.findFirst({
        where: {
          id: dto.shippingLineId,
          active: true,
        },
      });

      if (!shippingLine) {
        throw new BadRequestException({
          code: MANIFEST_ERROR_CODES.SHIPPING_LINE_INVALID,
          message: 'Hãng tàu không hợp lệ hoặc đã bị vô hiệu hóa.',
        });
      }
    }

    const existingMbl = await this.prisma.masterBl.findFirst({
      where: {
        manifestId,
        mblNumber: dto.mblNumber,
      },
    });

    if (existingMbl) {
      throw new ConflictException({
        code: MANIFEST_ERROR_CODES.MBL_NUMBER_IN_USE,
        message: 'Mã Master B/L đã tồn tại trong Manifest này.',
      });
    }

    const mbl = await this.prisma.masterBl.create({
      data: {
        manifestId,
        mblNumber: dto.mblNumber,
        shippingLineId,
      },
      include: {
        shippingLine: true,
        _count: {
          select: {
            houseBls: true,
          },
        },
      },
    });

    return ManifestMapper.toMasterBlResponse(mbl);
  }

  async update(
    icdId: string,
    manifestId: string,
    mblId: string,
    dto: UpdateMasterBlDto,
  ) {
    const manifest = await this.getManifestOrThrow(icdId, manifestId);

    ManifestStatePolicy.assertCanModifyBills(manifest.status);

    const mbl = await this.prisma.masterBl.findFirst({
      where: {
        id: mblId,
        manifestId,
      },
    });

    if (!mbl) {
      throw new NotFoundException({
        code: MANIFEST_ERROR_CODES.MBL_NOT_FOUND,
        message: 'Không tìm thấy Master B/L.',
      });
    }

    if (dto.mblNumber && dto.mblNumber !== mbl.mblNumber) {
      const existing = await this.prisma.masterBl.findFirst({
        where: {
          manifestId,
          mblNumber: dto.mblNumber,
        },
      });

      if (existing) {
        throw new ConflictException({
          code: MANIFEST_ERROR_CODES.MBL_NUMBER_IN_USE,
          message: 'Mã Master B/L đã tồn tại trong Manifest này.',
        });
      }
    }

    if (dto.shippingLineId) {
      const shippingLine = await this.prisma.shippingLine.findFirst({
        where: {
          id: dto.shippingLineId,
          active: true,
        },
      });

      if (!shippingLine) {
        throw new BadRequestException({
          code: MANIFEST_ERROR_CODES.SHIPPING_LINE_INVALID,
          message: 'Hãng tàu không hợp lệ hoặc đã bị vô hiệu hóa.',
        });
      }
    }

    const updated = await this.prisma.masterBl.update({
      where: { id: mblId },
      data: {
        ...(dto.mblNumber ? { mblNumber: dto.mblNumber } : {}),
        ...(dto.shippingLineId ? { shippingLineId: dto.shippingLineId } : {}),
      },
      include: {
        shippingLine: true,
        _count: {
          select: {
            houseBls: true,
          },
        },
      },
    });

    return ManifestMapper.toMasterBlResponse(updated);
  }

  async remove(
    icdId: string,
    manifestId: string,
    mblId: string,
  ) {
    const manifest = await this.getManifestOrThrow(icdId, manifestId);

    ManifestStatePolicy.assertCanModifyBills(manifest.status);

    const mbl = await this.prisma.masterBl.findFirst({
      where: {
        id: mblId,
        manifestId,
      },
      include: {
        _count: {
          select: {
            houseBls: true,
          },
        },
      },
    });

    if (!mbl) {
      throw new NotFoundException({
        code: MANIFEST_ERROR_CODES.MBL_NOT_FOUND,
        message: 'Không tìm thấy Master B/L.',
      });
    }

    if (mbl._count.houseBls > 0) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.MBL_HAS_HOUSE_BLS,
        message:
          'Không thể xóa Master B/L khi vẫn còn House B/L bên trong. Hãy xóa House B/L trước.',
      });
    }

    await this.prisma.masterBl.delete({
      where: { id: mblId },
    });

    return {
      success: true,
      message: 'Đã xóa Master B/L thành công.',
    };
  }
}
