import { TestingModuleBuilder } from '@nestjs/testing';

import { NotificationTriggerService } from '../../src/modules/notifications/services/notification-trigger.service';

export function disableE2ENotificationTriggers(
  builder: TestingModuleBuilder,
): TestingModuleBuilder {
  return builder.overrideProvider(NotificationTriggerService).useValue({
    triggerGateOutNotification: jest.fn().mockResolvedValue(null),
    triggerInspectionHoldNotification: jest.fn().mockResolvedValue(null),
    triggerGateInWorkQueueNotification: jest.fn().mockResolvedValue(null),
    triggerInvoiceEmailNotification: jest.fn().mockResolvedValue(null),
  });
}
