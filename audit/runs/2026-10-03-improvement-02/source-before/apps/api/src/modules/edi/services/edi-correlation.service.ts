import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { IngestEdiAckDto } from '../dto/ingest-edi-ack.dto';
import { EdiOutboxMessage } from '../../../generated/prisma/client';

export interface CorrelationResult {
  matched: boolean;
  outboxMessage: (EdiOutboxMessage & { ediRoute: { icdId: string } }) | null;
}

@Injectable()
export class EdiCorrelationService {
  private readonly logger = new Logger(EdiCorrelationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async correlate(dto: IngestEdiAckDto): Promise<CorrelationResult> {
    // 1. Match by explicit outboxMessageId
    if (dto.outboxMessageId) {
      const message = await this.prisma.ediOutboxMessage.findFirst({
        where: {
          id: dto.outboxMessageId,
          shippingLineId: dto.shippingLineId,
        },
        include: {
          ediRoute: {
            select: { icdId: true },
          },
        },
      });

      if (message) {
        this.logger.debug(`Matched EDI ACK to outbox message ${message.id} via explicit ID`);
        return { matched: true, outboxMessage: message };
      }
    }

    // 2. Match by idempotencyKey
    if (dto.idempotencyKey) {
      const message = await this.prisma.ediOutboxMessage.findFirst({
        where: {
          idempotencyKey: dto.idempotencyKey,
          shippingLineId: dto.shippingLineId,
        },
        include: {
          ediRoute: {
            select: { icdId: true },
          },
        },
      });

      if (message) {
        this.logger.debug(`Matched EDI ACK to outbox message ${message.id} via idempotencyKey`);
        return { matched: true, outboxMessage: message };
      }
    }

    // 3. Match by externalReference
    if (dto.externalReference) {
      const message = await this.prisma.ediOutboxMessage.findFirst({
        where: {
          externalReference: dto.externalReference,
          shippingLineId: dto.shippingLineId,
        },
        include: {
          ediRoute: {
            select: { icdId: true },
          },
        },
      });

      if (message) {
        this.logger.debug(`Matched EDI ACK to outbox message ${message.id} via externalReference`);
        return { matched: true, outboxMessage: message };
      }
    }

    this.logger.warn(
      `Could not correlate EDI ACK for shippingLine ${dto.shippingLineId}, externalReference: ${dto.externalReference ?? 'none'}`,
    );

    return { matched: false, outboxMessage: null };
  }
}
