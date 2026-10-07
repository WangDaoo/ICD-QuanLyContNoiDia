import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

export function stopE2ECronJobs(app: INestApplication): void {
  const schedulerRegistry = app.get(SchedulerRegistry, { strict: false });

  for (const [name, job] of schedulerRegistry.getCronJobs()) {
    job.stop();
    schedulerRegistry.deleteCronJob(name);
  }
}
