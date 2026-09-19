import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  Tariff,
  TariffRule,
  TariffStatus,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { BILLING_ERROR_CODES } from '../constants/billing-error-codes.constants';
import { AddTariffRuleDto } from '../dto/add-tariff-rule.dto';
import { CreateTariffDto } from '../dto/create-tariff.dto';
import { QueryTariffsDto } from '../dto/query-tariffs.dto';
import { UpdateTariffDto } from '../dto/update-tariff.dto';
import { TariffPolicy } from '../policies/tariff.policy';

@Injectable()
export class TariffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: TariffPolicy,
  ) {}

  async createTariff(
    dto: CreateTariffDto,
    actor: AuthenticatedUser,
  ): Promise<Tariff> {
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.TARIFF_EFFECTIVE_RANGE_INVALID,
        message: 'effectiveTo must be after effectiveFrom',
      });
    }

    return this.prisma.tariff.create({
      data: {
        icdId: actor.icdId,
        name: dto.name,
        status: TariffStatus.DRAFT,
        effectiveFrom,
        effectiveTo,
        createdById: actor.id,
      },
    });
  }

  async updateTariff(
    id: string,
    dto: UpdateTariffDto,
    actor: AuthenticatedUser,
  ): Promise<Tariff> {
    const tariff = await this.getTariffOrThrow(id, actor.icdId);
    this.policy.assertCanModify(tariff);

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : tariff.effectiveFrom;
    const effectiveTo =
      dto.effectiveTo !== undefined
        ? dto.effectiveTo
          ? new Date(dto.effectiveTo)
          : null
        : tariff.effectiveTo;

    if (effectiveTo && effectiveTo <= effectiveFrom) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.TARIFF_EFFECTIVE_RANGE_INVALID,
        message: 'effectiveTo must be after effectiveFrom',
      });
    }

    return this.prisma.tariff.update({
      where: { id: tariff.id },
      data: {
        name: dto.name ?? tariff.name,
        effectiveFrom,
        effectiveTo,
      },
    });
  }

  async addTariffRule(
    tariffId: string,
    dto: AddTariffRuleDto,
    actor: AuthenticatedUser,
  ): Promise<TariffRule> {
    const tariff = await this.prisma.tariff.findFirst({
      where: { id: tariffId, icdId: actor.icdId },
      include: { rules: true },
    });

    if (!tariff) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.TARIFF_NOT_FOUND,
        message: `Tariff with ID ${tariffId} not found`,
      });
    }

    this.policy.assertCanModify(tariff);

    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: dto.serviceTypeId },
    });

    if (!serviceType || !serviceType.active) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.SERVICE_TYPE_INVALID,
        message: `Invalid or inactive service type: ${dto.serviceTypeId}`,
      });
    }

    this.policy.assertCanAddRule(
      tariff.rules,
      dto.serviceTypeId,
      dto.containerSize,
      dto.containerType,
    );

    return this.prisma.tariffRule.create({
      data: {
        tariffId: tariff.id,
        serviceTypeId: dto.serviceTypeId,
        containerSize: dto.containerSize,
        containerType: dto.containerType,
        unitPrice: dto.unitPrice,
        currency: dto.currency ?? 'VND',
      },
    });
  }

  async removeTariffRule(
    tariffId: string,
    ruleId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tariff = await this.getTariffOrThrow(tariffId, actor.icdId);
    this.policy.assertCanModify(tariff);

    const rule = await this.prisma.tariffRule.findFirst({
      where: { id: ruleId, tariffId: tariff.id },
    });

    if (!rule) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.TARIFF_RULE_NOT_FOUND,
        message: `Tariff rule with ID ${ruleId} not found`,
      });
    }

    await this.prisma.tariffRule.delete({
      where: { id: rule.id },
    });
  }

  async activateTariff(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<Tariff> {
    const tariff = await this.prisma.tariff.findFirst({
      where: { id, icdId: actor.icdId },
      include: { rules: true },
    });

    if (!tariff) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.TARIFF_NOT_FOUND,
        message: `Tariff with ID ${id} not found`,
      });
    }

    this.policy.assertCanTransition(tariff.status, TariffStatus.ACTIVE);

    return this.prisma.$transaction(async (tx) => {
      // Retire previously active tariffs for this ICD if overlapping
      await tx.tariff.updateMany({
        where: {
          icdId: actor.icdId,
          status: TariffStatus.ACTIVE,
          id: { not: tariff.id },
        },
        data: {
          status: TariffStatus.RETIRED,
        },
      });

      return tx.tariff.update({
        where: { id: tariff.id },
        data: {
          status: TariffStatus.ACTIVE,
        },
        include: {
          rules: {
            include: { serviceType: true },
          },
        },
      });
    });
  }

  async retireTariff(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<Tariff> {
    const tariff = await this.getTariffOrThrow(id, actor.icdId);
    this.policy.assertCanTransition(tariff.status, TariffStatus.RETIRED);

    return this.prisma.tariff.update({
      where: { id: tariff.id },
      data: {
        status: TariffStatus.RETIRED,
      },
    });
  }

  async findTariffs(
    dto: QueryTariffsDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.tariff.findMany({
      where: {
        icdId: actor.icdId,
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.keyword
          ? { name: { contains: dto.keyword } }
          : {}),
      },
      include: {
        rules: {
          include: { serviceType: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTariffById(id: string, actor: AuthenticatedUser) {
    const tariff = await this.prisma.tariff.findFirst({
      where: { id, icdId: actor.icdId },
      include: {
        rules: {
          include: { serviceType: true },
        },
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!tariff) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.TARIFF_NOT_FOUND,
        message: `Tariff with ID ${id} not found`,
      });
    }

    return tariff;
  }

  async getActiveTariffForDate(
    icdId: string,
    targetDate: Date,
    explicitTariffId?: string,
  ) {
    if (explicitTariffId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { id: explicitTariffId, icdId },
        include: {
          rules: {
            include: { serviceType: true },
          },
        },
      });

      if (!tariff) {
        throw new NotFoundException({
          code: BILLING_ERROR_CODES.TARIFF_NOT_FOUND,
          message: `Specified tariff ${explicitTariffId} not found`,
        });
      }

      return tariff;
    }

    const tariff = await this.prisma.tariff.findFirst({
      where: {
        icdId,
        status: TariffStatus.ACTIVE,
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
      },
      include: {
        rules: {
          include: { serviceType: true },
        },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!tariff) {
      throw new BadRequestException({
        code: BILLING_ERROR_CODES.BILLING_CONFIGURATION_MISSING,
        message: 'No active tariff found for the given site and date.',
      });
    }

    return tariff;
  }

  async listServiceTypes() {
    return this.prisma.serviceType.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
  }

  private async getTariffOrThrow(
    id: string,
    icdId: string,
  ): Promise<Tariff> {
    const tariff = await this.prisma.tariff.findFirst({
      where: { id, icdId },
    });

    if (!tariff) {
      throw new NotFoundException({
        code: BILLING_ERROR_CODES.TARIFF_NOT_FOUND,
        message: `Tariff with ID ${id} not found`,
      });
    }

    return tariff;
  }
}
