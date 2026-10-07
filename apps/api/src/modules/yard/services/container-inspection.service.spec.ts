import { ContainerInspectionService } from './container-inspection.service';
import type { PrismaService } from '../../../database/prisma.service';
import type { ContainerInspectionPolicy } from '../policies/container-inspection.policy';
import type { ContainerEventService } from '../../containers/services/container-event.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.types';
import { ContainerInspectionResult } from '../../../generated/prisma/client';
import type { NotificationTriggerService } from '../../notifications/services/notification-trigger.service';
describe('inspection decision notes',()=> {
  it.each([ContainerInspectionResult.FAIL,ContainerInspectionResult.HOLD])('requires nonblank decision notes for %s',async result=> {
    const db={containerInspection:{findFirst:jest.fn(),update:jest.fn()}};
    const service=new ContainerInspectionService(db as unknown as PrismaService,{} as ContainerInspectionPolicy,{} as ContainerEventService,{} as NotificationTriggerService);
    await expect(service.completeInspection('id',{result,notes:'   '},{icdId:'icd'} as AuthenticatedUser)).rejects.toThrow('Cần ghi rõ lý do');
    expect(db.containerInspection.update).not.toHaveBeenCalled();
  });
});
