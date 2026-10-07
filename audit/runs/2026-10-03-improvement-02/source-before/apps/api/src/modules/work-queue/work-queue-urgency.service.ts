import { Injectable } from '@nestjs/common';
import {
  WORK_QUEUE_URGENCY,
  type WorkQueueUrgency,
} from './work-queue.constants';

export interface UrgencyCalculationResult {
  urgency: WorkQueueUrgency;
  dueAt: Date;
  minutesRemaining: number;
}

@Injectable()
export class WorkQueueUrgencyService {
  calculateUrgency(
    baseTime: Date,
    slaMinutes: number,
    dueSoonMinutes: number,
    now: Date = new Date(),
  ): UrgencyCalculationResult {
    const dueAt = new Date(baseTime.getTime() + slaMinutes * 60_000);
    const diffMinutes = Math.round((dueAt.getTime() - now.getTime()) / 60_000);

    let urgency: WorkQueueUrgency;

    if (diffMinutes < 0) {
      urgency = WORK_QUEUE_URGENCY.OVERDUE;
    } else if (diffMinutes <= dueSoonMinutes) {
      urgency = WORK_QUEUE_URGENCY.CRITICAL;
    } else if (diffMinutes <= dueSoonMinutes * 2) {
      urgency = WORK_QUEUE_URGENCY.HIGH;
    } else {
      urgency = WORK_QUEUE_URGENCY.NORMAL;
    }

    return {
      urgency,
      dueAt,
      minutesRemaining: diffMinutes,
    };
  }

  calculateUrgencyFromDueDate(
    dueAt: Date,
    dueSoonMinutes: number,
    now: Date = new Date(),
  ): UrgencyCalculationResult {
    const diffMinutes = Math.round((dueAt.getTime() - now.getTime()) / 60_000);

    let urgency: WorkQueueUrgency;

    if (diffMinutes < 0) {
      urgency = WORK_QUEUE_URGENCY.OVERDUE;
    } else if (diffMinutes <= dueSoonMinutes) {
      urgency = WORK_QUEUE_URGENCY.CRITICAL;
    } else if (diffMinutes <= dueSoonMinutes * 2) {
      urgency = WORK_QUEUE_URGENCY.HIGH;
    } else {
      urgency = WORK_QUEUE_URGENCY.NORMAL;
    }

    return {
      urgency,
      dueAt,
      minutesRemaining: diffMinutes,
    };
  }
}
