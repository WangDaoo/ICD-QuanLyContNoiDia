import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.types';
import { HandoverService } from '../../services/handover.service';
import { TransportHandoverReadService } from '../../services/transport-handover-read.service';
import {
  ContainerHandoverSummaryController,
  TransportHandoverController,
} from './transport-handover.controller';

describe('Transport handover query controllers', () => {
  let transportController: TransportHandoverController;
  let summaryController: ContainerHandoverSummaryController;
  let commandService: {
    findMany: jest.Mock;
    findById: jest.Mock;
    findSummaryByContainerVisit: jest.Mock;
  };
  let readService: {
    findMany: jest.Mock;
    findById: jest.Mock;
    findSummaryByContainerVisit: jest.Mock;
  };

  const actor = {
    id: 'user-1',
    sessionId: 'session-1',
    name: 'Admin User',
    email: 'admin@icd.local',
    roleCodes: ['ADMIN'],
    icdId: 'icd-1',
    permissionCodes: ['handover.read'],
  } satisfies AuthenticatedUser;

  beforeEach(async () => {
    commandService = {
      findMany: jest.fn().mockResolvedValue({ source: 'command' }),
      findById: jest.fn().mockResolvedValue({ source: 'command' }),
      findSummaryByContainerVisit: jest
        .fn()
        .mockResolvedValue({ source: 'command' }),
    };
    readService = {
      findMany: jest.fn().mockResolvedValue({ source: 'read' }),
      findById: jest.fn().mockResolvedValue({ source: 'read' }),
      findSummaryByContainerVisit: jest
        .fn()
        .mockResolvedValue({ source: 'read' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        TransportHandoverController,
        ContainerHandoverSummaryController,
      ],
      providers: [
        { provide: HandoverService, useValue: commandService },
        { provide: TransportHandoverReadService, useValue: readService },
      ],
    }).compile();

    transportController = module.get(TransportHandoverController);
    summaryController = module.get(ContainerHandoverSummaryController);
  });

  it('delegates handover list and detail queries to read service', async () => {
    await expect(
      transportController.findMany({} as never, actor),
    ).resolves.toEqual({ source: 'read' });
    await expect(
      transportController.findById('handover-1', actor),
    ).resolves.toEqual({ data: { source: 'read' } });

    expect(readService.findMany).toHaveBeenCalledWith('icd-1', {});
    expect(readService.findById).toHaveBeenCalledWith('handover-1', 'icd-1');
    expect(commandService.findMany).not.toHaveBeenCalled();
    expect(commandService.findById).not.toHaveBeenCalled();
  });

  it('delegates container handover summary query to read service', async () => {
    await expect(
      summaryController.findSummary('visit-1', actor),
    ).resolves.toEqual({ data: { source: 'read' } });

    expect(readService.findSummaryByContainerVisit).toHaveBeenCalledWith(
      'visit-1',
      'icd-1',
    );
    expect(commandService.findSummaryByContainerVisit).not.toHaveBeenCalled();
  });
});
