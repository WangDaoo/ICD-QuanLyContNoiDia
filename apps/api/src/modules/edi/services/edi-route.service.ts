import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { AuditService } from '../../audit/audit.service';
import { UpdateEdiRouteDto } from '../dto/update-edi-route.dto';
import { EDI_ERROR_CODES } from '../constants/edi-error-codes.constants';

@Injectable()
export class EdiRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getRoutes(actor: AuthenticatedUser) {
    return this.prisma.ediRoute.findMany({
      where: {
        icdId: actor.icdId,
      },
      include: {
        shippingLine: {
          select: {
            id: true,
            name: true,
            scacCode: true,
            active: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateRoute(
    shippingLineId: string,
    dto: UpdateEdiRouteDto,
    actor: AuthenticatedUser,
  ) {
    const shippingLine = await this.prisma.shippingLine.findUnique({
      where: { id: shippingLineId },
    });

    if (!shippingLine) {
      throw new NotFoundException({
        code: EDI_ERROR_CODES.SHIPPING_LINE_NOT_FOUND,
        message: `Hãng tàu ${shippingLineId} không tồn tại.`,
      });
    }

    const existing = await this.prisma.ediRoute.findUnique({
      where: {
        icdId_shippingLineId: {
          icdId: actor.icdId,
          shippingLineId,
        },
      },
    });

    const route = await this.prisma.ediRoute.upsert({
      where: {
        icdId_shippingLineId: {
          icdId: actor.icdId,
          shippingLineId,
        },
      },
      update: {
        enabled: dto.enabled,
        transport: dto.transport,
        outboundFormat: dto.outboundFormat,
        partnerTarget: dto.partnerTarget,
        credentialRef: dto.credentialRef ?? null,
        hostKeySha256: dto.hostKeySha256 ?? null,
        timeoutMs: dto.timeoutMs,
      },
      create: {
        icdId: actor.icdId,
        shippingLineId,
        enabled: dto.enabled,
        transport: dto.transport,
        outboundFormat: dto.outboundFormat,
        partnerTarget: dto.partnerTarget,
        credentialRef: dto.credentialRef ?? null,
        hostKeySha256: dto.hostKeySha256 ?? null,
        timeoutMs: dto.timeoutMs,
      },
      include: {
        shippingLine: {
          select: {
            id: true,
            name: true,
            scacCode: true,
            active: true,
          },
        },
      },
    });

    await this.auditService.record({
      icdId: actor.icdId,
      actorUserId: actor.id,
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'EDI_ROUTE',
      entityId: route.id,
      oldData: existing
        ? {
            enabled: existing.enabled,
            transport: existing.transport,
            partnerTarget: existing.partnerTarget,
            credentialRef: existing.credentialRef,
            timeoutMs: existing.timeoutMs,
          }
        : undefined,
      newData: {
        enabled: route.enabled,
        transport: route.transport,
        partnerTarget: route.partnerTarget,
        credentialRef: route.credentialRef,
        timeoutMs: route.timeoutMs,
      },
    });

    return route;
  }
}
