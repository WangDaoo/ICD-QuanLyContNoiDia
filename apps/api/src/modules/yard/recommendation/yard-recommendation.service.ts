import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  ContainerVisitStatus,
  Prisma,
  YardRecommendationAlgorithm,
} from '../../../generated/prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { PrismaService } from '../../../database/prisma.service';
import { YARD_ERROR_CODES } from '../constants/yard-error-codes.constants';
import { MlClient, type MlCandidateInput } from './ml-client.client';

export interface RecommendationItemDto {
  rank: number;
  yardSlotId: string;
  slotCode: string | null;
  blockCode: string;
  rowNo: string;
  bayNo: string;
  tierNo: string;
  reeferPower: boolean;
  maxWeight: string | null;
  ruleScore: number;
  ruleRank: number;
  mlProbability: number | null;
  mlRank: number | null;
  reasons: string[];
  warnings: string[];
}

export interface RecommendationResponseDto {
  recommendationId: string;
  algorithm: YardRecommendationAlgorithm;
  modelVersion: string | null;
  contextToken: string;
  containerVisit: {
    id: string;
    containerNumber: string;
    containerType: string;
    grossWeight: string | null;
  };
  data: RecommendationItemDto[];
}

@Injectable()
export class YardRecommendationService {
  private readonly logger = new Logger(YardRecommendationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mlClient: MlClient,
    private readonly configService: ConfigService,
  ) {}

  private get secret(): string {
    return (
      this.configService.get<string>('RECOMMENDATION_SECRET') ??
      process.env.RECOMMENDATION_SECRET ??
      'icd-ml-recommendation-default-secret-key-2026'
    );
  }

  generateContextToken(recommendationId: string, visitId: string): string {
    const payload = `${recommendationId}:${visitId}`;
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  verifyContextToken(recommendationId: string, visitId: string, token: string): boolean {
    const expected = this.generateContextToken(recommendationId, visitId);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  }

  async getRecommendations(
    visitId: string,
    actor: AuthenticatedUser,
  ): Promise<RecommendationResponseDto> {
    const context = await this.getVisitContextOrThrow(this.prisma, visitId, actor.icdId);

    if (context.status !== ContainerVisitStatus.IN_YARD) {
      throw new ConflictException({
        code: YARD_ERROR_CODES.VISIT_NOT_IN_YARD,
        message: 'Container phải ở trạng thái IN_YARD trước khi xếp vị trí.',
      });
    }

    const currentLocation = await this.prisma.containerLocationLog.findFirst({
      where: {
        containerVisitId: visitId,
        endedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (currentLocation) {
      throw new ConflictException({
        code: YARD_ERROR_CODES.LOCATION_ALREADY_ASSIGNED,
        message: 'Container đã có vị trí bãi hiện tại.',
      });
    }

    const effectiveWeight = this.getEffectiveWeight(context);
    const containerTypeStr = String(context.container.type);
    const isReeferContainer = this.isReefer(containerTypeStr);

    // Hard Safety Filter query
    const slots = await this.prisma.yardSlot.findMany({
      where: {
        operational: true,
        yardBlock: {
          icdId: actor.icdId,
          operational: true,
        },
        OR: [
          {
            supportedContainerType: null,
          },
          {
            supportedContainerType: containerTypeStr,
          },
        ],
        ...(isReeferContainer
          ? {
              reeferPower: true,
            }
          : {}),
        ...(effectiveWeight !== null
          ? {
              OR: [
                {
                  maxWeight: null,
                },
                {
                  maxWeight: {
                    gte: effectiveWeight,
                  },
                },
              ],
            }
          : {}),
        locationLogs: {
          none: {
            endedAt: null,
          },
        },
      },
      include: {
        yardBlock: true,
      },
      orderBy: [
        {
          yardBlock: {
            blockCode: 'asc',
          },
        },
        {
          rowNo: 'asc',
        },
        {
          bayNo: 'asc',
        },
        {
          tierNo: 'asc',
        },
      ],
      take: 50,
    });

    const candidateInputs: MlCandidateInput[] = slots.map((slot, index) => ({
      yardSlotId: slot.id,
      slotCode: slot.slotCode,
      blockCode: slot.yardBlock.blockCode,
      rowNo: slot.rowNo,
      bayNo: slot.bayNo,
      tierNo: slot.tierNo,
      reeferPower: slot.reeferPower,
      maxWeight: slot.maxWeight ? Number(slot.maxWeight) : null,
      ruleScore: 100,
      ruleRank: index + 1,
    }));

    // Call ML service if available
    const mlResult = await this.mlClient.rerankCandidates({
      containerVisitId: context.id,
      containerNumber: context.container.containerNumber,
      containerType: containerTypeStr,
      category: String(context.category),
      grossWeight: effectiveWeight,
      dwellDays: context.dwellDays ?? 0,
      candidates: candidateInputs,
    });

    const slotMap = new Map(slots.map((s) => [s.id, s]));
    let algorithm: YardRecommendationAlgorithm = YardRecommendationAlgorithm.RULE_BASED_V1;
    let modelVersion: string | null = null;
    let items: RecommendationItemDto[] = [];

    if (mlResult && mlResult.candidates.length > 0) {
      algorithm = YardRecommendationAlgorithm.ML_RERANK;
      modelVersion = mlResult.modelVersion;

      const mlCandidateMap = new Map(mlResult.candidates.map((c) => [c.yardSlotId, c]));

      const scoredItems = candidateInputs.map((cand) => {
        const mlInfo = mlCandidateMap.get(cand.yardSlotId);
        const slot = slotMap.get(cand.yardSlotId)!;
        return {
          yardSlotId: slot.id,
          slotCode: slot.slotCode,
          blockCode: slot.yardBlock.blockCode,
          rowNo: slot.rowNo,
          bayNo: slot.bayNo,
          tierNo: slot.tierNo,
          reeferPower: slot.reeferPower,
          maxWeight: slot.maxWeight?.toString() ?? null,
          ruleScore: cand.ruleScore,
          ruleRank: cand.ruleRank,
          mlProbability: mlInfo?.mlProbability ?? null,
          mlRank: mlInfo?.mlRank ?? null,
          reasons: mlInfo ? ['Gợi ý tối ưu từ mô hình ML.'] : ['Đạt toàn bộ hard rules.'],
          warnings:
            effectiveWeight === null && slot.maxWeight !== null
              ? ['Chưa có trọng lượng để đối chiếu max weight.']
              : [],
        };
      });

      // Sort primarily by mlRank, then ruleRank
      scoredItems.sort((a, b) => {
        if (a.mlRank !== null && b.mlRank !== null) {
          return a.mlRank - b.mlRank;
        }
        if (a.mlRank !== null) return -1;
        if (b.mlRank !== null) return 1;
        return a.ruleRank - b.ruleRank;
      });

      items = scoredItems.map((item, idx) => ({
        rank: idx + 1,
        ...item,
      }));
    } else {
      // RULE_BASED_V1 baseline fallback
      algorithm = YardRecommendationAlgorithm.RULE_BASED_V1;
      modelVersion = null;

      items = candidateInputs.map((cand, idx) => {
        const slot = slotMap.get(cand.yardSlotId)!;
        return {
          rank: idx + 1,
          yardSlotId: slot.id,
          slotCode: slot.slotCode,
          blockCode: slot.yardBlock.blockCode,
          rowNo: slot.rowNo,
          bayNo: slot.bayNo,
          tierNo: slot.tierNo,
          reeferPower: slot.reeferPower,
          maxWeight: slot.maxWeight?.toString() ?? null,
          ruleScore: cand.ruleScore,
          ruleRank: cand.ruleRank,
          mlProbability: null,
          mlRank: null,
          reasons: ['Đạt toàn bộ hard rules.'],
          warnings:
            effectiveWeight === null && slot.maxWeight !== null
              ? ['Chưa có trọng lượng để đối chiếu max weight.']
              : [],
        };
      });
    }

    const recommendationId = crypto.randomUUID();
    const contextToken = this.generateContextToken(recommendationId, visitId);

    // Persist recommendation & candidate snapshots for ML training and audit
    if (items.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.yardRecommendation.create({
          data: {
            id: recommendationId,
            containerVisitId: visitId,
            algorithm,
            modelVersion,
            contextToken,
            candidates: {
              create: items.map((item) => ({
                yardSlotId: item.yardSlotId,
                ruleScore: new Prisma.Decimal(item.ruleScore),
                mlProbability:
                  item.mlProbability !== null ? new Prisma.Decimal(item.mlProbability) : null,
                ruleRank: item.ruleRank,
                mlRank: item.mlRank,
                selected: false,
              })),
            },
          },
        });
      });
    }

    return {
      recommendationId,
      algorithm,
      modelVersion,
      contextToken,
      containerVisit: {
        id: context.id,
        containerNumber: context.container.containerNumber,
        containerType: containerTypeStr,
        grossWeight: effectiveWeight?.toString() ?? null,
      },
      data: items,
    };
  }

  async recordFeedback(
    tx: Prisma.TransactionClient,
    recommendationId: string,
    selectedSlotId: string,
  ): Promise<void> {
    try {
      await tx.yardRecommendationCandidate.updateMany({
        where: {
          recommendationId,
          yardSlotId: selectedSlotId,
        },
        data: {
          selected: true,
          selectedAt: new Date(),
        },
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to record recommendation feedback for recommendationId=${recommendationId}, slotId=${selectedSlotId}: ${(err as Error).message}`,
      );
    }
  }

  private async getVisitContextOrThrow(
    db: PrismaService | Prisma.TransactionClient,
    visitId: string,
    icdId: string,
  ) {
    const visit = await db.containerVisit.findFirst({
      where: {
        id: visitId,
        icdId,
      },
      select: {
        id: true,
        status: true,
        category: true,
        dwellDays: true,
        grossWeight: true,
        container: {
          select: {
            containerNumber: true,
            type: true,
          },
        },
        reception: {
          select: {
            actualWeight: true,
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        code: YARD_ERROR_CODES.VISIT_NOT_FOUND,
        message: 'Không tìm thấy Container Visit.',
      });
    }

    return visit;
  }

  private getEffectiveWeight(context: {
    grossWeight: Prisma.Decimal | null;
    reception: {
      actualWeight: Prisma.Decimal | null;
    } | null;
  }): number | null {
    const value = context.reception?.actualWeight ?? context.grossWeight;
    return value ? Number(value) : null;
  }

  private isReefer(containerType: string): boolean {
    const upper = containerType.toUpperCase();
    return upper.endsWith('RF') || upper === 'REEFER';
  }
}
