import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { ManifestStatus, Prisma } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma.service';

import { MANIFEST_ERROR_CODES } from '../constants/manifest-error-codes.constants';

import { CreateManifestDto } from '../dto/manifest/create-manifest.dto';

import { QueryManifestsDto } from '../dto/manifest/query-manifests.dto';

import { UpdateManifestDto } from '../dto/manifest/update-manifest.dto';

import { ManifestMapper } from '../mappers/manifest.mapper';

import { ManifestStatePolicy } from '../policies/manifest-state.policy';

import { generateManifestNumber } from '../utils/manifest-number.util';

@Injectable()
export class ManifestService {
  constructor(private readonly prisma: PrismaService) {}

  async list(icdId: string, query: QueryManifestsDto) {
    const { page, pageSize, search, status, shippingLineId, etaFrom, etaTo } = query;

    const skip = (page - 1) * pageSize;

    const where: Prisma.ManifestWhereInput = {
      icdId,
      ...(status ? { status } : {}),
      ...(shippingLineId ? { shippingLineId } : {}),
      ...(etaFrom || etaTo
        ? {
            eta: {
              ...(etaFrom ? { gte: new Date(etaFrom) } : {}),
              ...(etaTo ? { lte: new Date(etaTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                manifestNo: {
                  contains: search,
                },
              },
              {
                vesselName: {
                  contains: search,
                },
              },
              {
                voyageNo: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.manifest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          shippingLine: true,
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              masterBls: true,
            },
          },
        },
      }),
      this.prisma.manifest.count({ where }),
    ]);

    return {
      items: items.map(ManifestMapper.toManifestResponse),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getDetail(icdId: string, manifestId: string) {
    const manifest = await this.prisma.manifest.findFirst({
      where: {
        id: manifestId,
        icdId,
      },
      include: {
        shippingLine: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            masterBls: true,
          },
        },
      },
    });

    if (!manifest) {
      throw new NotFoundException({
        code: MANIFEST_ERROR_CODES.NOT_FOUND,
        message: 'Không tìm thấy Manifest.',
      });
    }

    return ManifestMapper.toManifestResponse(manifest);
  }

  async create(icdId: string, userId: string, dto: CreateManifestDto) {
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

    let manifestNo = generateManifestNumber();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const existing = await this.prisma.manifest.findFirst({
        where: {
          icdId,
          manifestNo,
        },
      });

      if (!existing) {
        isUnique = true;
      } else {
        manifestNo = generateManifestNumber();
        attempts++;
      }
    }

    const manifest = await this.prisma.manifest.create({
      data: {
        icdId,
        manifestNo,
        shippingLineId: dto.shippingLineId,
        vesselName: dto.vesselName,
        voyageNo: dto.voyageNo,
        eta: new Date(dto.eta),
        portOfLoading: dto.portOfLoading,
        portOfDischarge: dto.portOfDischarge,
        status: ManifestStatus.DRAFT,
        createdById: userId,
      },
      include: {
        shippingLine: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            masterBls: true,
          },
        },
      },
    });

    return ManifestMapper.toManifestResponse(manifest);
  }

  async update(icdId: string, manifestId: string, dto: UpdateManifestDto) {
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

    ManifestStatePolicy.assertCanUpdate(manifest.status);

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

    const dataToUpdate: Prisma.ManifestUpdateInput = {};

    if (dto.shippingLineId !== undefined) {
      dataToUpdate.shippingLine = {
        connect: { id: dto.shippingLineId },
      };
    }
    if (dto.vesselName !== undefined) {
      dataToUpdate.vesselName = dto.vesselName;
    }
    if (dto.voyageNo !== undefined) {
      dataToUpdate.voyageNo = dto.voyageNo;
    }
    if (dto.eta !== undefined) {
      dataToUpdate.eta = new Date(dto.eta);
    }
    if (dto.portOfLoading !== undefined) {
      dataToUpdate.portOfLoading = dto.portOfLoading;
    }
    if (dto.portOfDischarge !== undefined) {
      dataToUpdate.portOfDischarge = dto.portOfDischarge;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      throw new BadRequestException({
        code: MANIFEST_ERROR_CODES.UPDATE_EMPTY,
        message: 'Không có dữ liệu nào được cung cấp để cập nhật.',
      });
    }

    const updated = await this.prisma.manifest.update({
      where: { id: manifestId },
      data: dataToUpdate,
      include: {
        shippingLine: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            masterBls: true,
          },
        },
      },
    });

    return ManifestMapper.toManifestResponse(updated);
  }

  async submit(icdId: string, manifestId: string) {
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

    ManifestStatePolicy.assertCanSubmit(manifest.status);

    const updated = await this.prisma.manifest.update({
      where: { id: manifestId },
      data: {
        status: ManifestStatus.SUBMITTED,
      },
      include: {
        shippingLine: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            masterBls: true,
          },
        },
      },
    });

    return ManifestMapper.toManifestResponse(updated);
  }

  async cancel(icdId: string, manifestId: string) {
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

    ManifestStatePolicy.assertCanCancel(manifest.status);

    const updated = await this.prisma.manifest.update({
      where: { id: manifestId },
      data: {
        status: ManifestStatus.CANCELLED,
      },
      include: {
        shippingLine: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            masterBls: true,
          },
        },
      },
    });

    return ManifestMapper.toManifestResponse(updated);
  }
}
