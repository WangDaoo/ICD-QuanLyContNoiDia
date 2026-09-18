import { Injectable } from '@nestjs/common';

import { ContainerVisitStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface RecordContainerEventInput {
  containerVisitId: string;
  eventType: string;
  fromStatus?: ContainerVisitStatus;
  toStatus?: ContainerVisitStatus;
  actorUserId?: string;
  referenceType?: string;
  referenceId?: string;
  metadataJson?: Record<string, unknown> | null;
  note?: string;
}

@Injectable()
export class ContainerEventService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    tx: Prisma.TransactionClient,
    input: RecordContainerEventInput,
  ) {
    const metadata: Record<string, unknown> = {
      ...(input.metadataJson || {}),
      ...(input.referenceType && { referenceType: input.referenceType }),
      ...(input.referenceId && { referenceId: input.referenceId }),
    };

    return tx.containerEvent.create({
      data: {
        visitId: input.containerVisitId,
        eventType: input.eventType,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actorId: input.actorUserId,
        metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        note: input.note,
      },
    });
  }
}
