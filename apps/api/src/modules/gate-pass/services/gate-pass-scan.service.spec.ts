import { ConfigService } from '@nestjs/config';

import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import type { PrismaService } from '../../../database/prisma.service';
import { ContainerVisitStatus, GatePassStatus } from '../../../generated/prisma/client';
import type { GatePassReadinessService } from './gate-pass-readiness.service';
import { GatePassScanService } from './gate-pass-scan.service';
import { GatePassTokenService } from './gate-pass-token.service';

describe('GatePassScanService', () => {
  it('returns the visit ID required by gate-out separately from the physical container ID', async () => {
    const actor: AuthenticatedUser = {
      id: 'gate-user',
      icdId: 'icd-site',
      sessionId: 'gate-session',
      name: 'Gate staff',
      email: 'gate@icd.local',
      roleCodes: ['GATE_STAFF'],
      permissionCodes: ['gate_pass.use'],
    };
    const expiresAt = new Date(Date.now() + 60_000);
    const tokenService = new GatePassTokenService({
      getOrThrow: () => 'scan-test-secret-with-more-than-32-characters',
    } as unknown as ConfigService);
    const qrToken = tokenService.create({
      gatePassId: 'gate-pass',
      expiresAt: expiresAt.getTime(),
    });
    const prisma = {
      gatePass: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'gate-pass',
          code: 'GP-001',
          status: GatePassStatus.ACTIVE,
          qrTokenHash: tokenService.hash(qrToken),
          containerVisitId: 'container-visit',
          expiresAt,
          issuedAt: new Date(),
          usedAt: null,
          vehiclePlate: '51C-12345',
          receiverName: 'Gate receiver',
          receiverIdNumber: null,
          containerVisit: {
            id: 'container-visit',
            state: ContainerVisitStatus.GATE_PASS_ISSUED,
            sealNo: 'SEAL-001',
            houseBl: null,
            locationLogs: [],
            container: {
              id: 'physical-container',
              containerNumber: 'MSCU1234567',
              isoCode: '22G1',
              size: 'SIZE_20',
              type: 'DRY',
            },
          },
        }),
      },
    };
    const readiness = {
      evaluateReadiness: jest.fn().mockResolvedValue({ ready: true, blockers: [], details: {} }),
    };
    const service = new GatePassScanService(
      prisma as unknown as PrismaService,
      readiness as unknown as GatePassReadinessService,
      tokenService,
    );

    const result = await service.scanGatePass(qrToken, actor);

    expect(result).toMatchObject({
      visitId: 'container-visit',
      gatePass: { id: 'gate-pass', containerVisitId: 'container-visit' },
      container: { id: 'physical-container' },
      canGateOut: true,
    });
    expect(readiness.evaluateReadiness).toHaveBeenCalledWith('container-visit', actor, 'GATE_OUT');
  });
});

describe('expired scan is a read-only query', () => {
  it('reports effective expiration without orphaning the issued visit', async () => {
    const pass = {
      id: 'pass',
      code: 'GP',
      status: GatePassStatus.ACTIVE,
      expiresAt: new Date(0),
      qrTokenHash: 'hash',
      containerVisitId: 'visit',
      containerVisit: {
        id: 'visit',
        state: ContainerVisitStatus.GATE_PASS_ISSUED,
        container: { id: 'c' },
        locationLogs: [],
      },
    };
    const prisma = {
      gatePass: { findFirst: jest.fn().mockResolvedValue(pass), updateMany: jest.fn() },
    };
    const service = new GatePassScanService(
      prisma as never,
      {
        evaluateReadiness: jest.fn().mockResolvedValue({ ready: true, blockers: [], details: {} }),
      } as never,
      { verify: () => ({ gatePassId: 'pass' }), hash: () => 'hash' } as never,
    );
    const result = await service.scanGatePass('qr', { icdId: 'icd' } as never);
    expect(result.gatePass.status).toBe(GatePassStatus.EXPIRED);
    expect(result.canGateOut).toBe(false);
    expect(prisma.gatePass.updateMany).not.toHaveBeenCalled();
  });
});
