import { z } from 'zod';
import { EdiOutboundFormat, EdiTransport } from '../../../generated/prisma/client';

export const EdiRoutingSnapshotSchema = z.object({
  routeId: z.string().uuid(),
  icdId: z.string().uuid(),
  transport: z.nativeEnum(EdiTransport),
  outboundFormat: z.nativeEnum(EdiOutboundFormat),
  partnerTarget: z.string().min(1),
  credentialRef: z.string().min(1).nullable(),
  hostKeySha256: z.string().min(1).nullable(),
  timeoutMs: z.number().int().positive(),
});

export type EdiRoutingSnapshot = z.infer<typeof EdiRoutingSnapshotSchema>;
