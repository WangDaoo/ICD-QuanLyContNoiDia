import { ForbiddenException, Injectable } from '@nestjs/common';
import { PERMISSION_CODES } from '../../common/constants/permission-codes.constants';
import { getPaginationMeta } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';
import type { QueryWorkQueueDto } from './dto/query-work-queue.dto';
import {
  WORK_QUEUE_SLA_DEFAULTS,
  WORK_QUEUE_TASK_TYPES,
  WORK_QUEUE_URGENCY,
  type WorkQueueTaskType,
  type WorkQueueUrgency,
} from './work-queue.constants';
import { WorkQueueUrgencyService } from './work-queue-urgency.service';

export interface WorkQueueItem {
  id: string;
  type: WorkQueueTaskType;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  referenceNo?: string;
  containerNo?: string;
  urgency: WorkQueueUrgency;
  dueAt: Date;
  minutesRemaining: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const URGENCY_WEIGHT: Record<WorkQueueUrgency, number> = {
  [WORK_QUEUE_URGENCY.OVERDUE]: 1,
  [WORK_QUEUE_URGENCY.CRITICAL]: 2,
  [WORK_QUEUE_URGENCY.HIGH]: 3,
  [WORK_QUEUE_URGENCY.NORMAL]: 4,
};

const BOOKING_TASK_TITLES = {
  INSPECTION: 'Kiểm tra tại bãi',
  STRIPPING: 'Rút hàng tại bãi',
  STUFFING: 'Đóng hàng tại bãi',
} as const;

@Injectable()
export class WorkQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly urgencyService: WorkQueueUrgencyService,
  ) {}

  async getWorkQueue(actor: AuthenticatedUser, query: QueryWorkQueueDto) {
    const hasExternalRole = actor.roleCodes.some((role) => ['CONSIGNEE', 'AGENT'].includes(role));
    const hasInternalRole = actor.roleCodes.some((role) =>
      ['ADMIN', 'MANAGER', 'OPERATOR', 'GATE_STAFF', 'YARD_STAFF'].includes(role),
    );
    // This aggregate has no permission decorator, so it must enforce the same
    // customer-scope boundary before projecting any ICD-wide source records.
    if (hasExternalRole && !hasInternalRole) {
      throw new ForbiddenException({
        code: 'CUSTOMER_SCOPE_NOT_CONFIGURED',
        message:
          'Tài khoản chưa được liên kết với phạm vi chủ hàng hoặc đại lý. Vui lòng liên hệ quản trị viên.',
      });
    }

    const permissions = new Set<string>(actor.permissionCodes);
    const now = new Date();

    const tasks: WorkQueueItem[] = [];

    // 1. GATE_IN tasks
    if (
      (!query.type || query.type === WORK_QUEUE_TASK_TYPES.GATE_IN) &&
      (permissions.has(PERMISSION_CODES.GATE_IN_CREATE) ||
        permissions.has(PERMISSION_CODES.TRUCK_VISIT_READ))
    ) {
      const gateInTasks = await this.buildGateInTasks(actor.icdId, now);
      tasks.push(...gateInTasks);
    }

    // 2. YARD_ASSIGN tasks
    if (
      (!query.type || query.type === WORK_QUEUE_TASK_TYPES.YARD_ASSIGN) &&
      (permissions.has(PERMISSION_CODES.YARD_UPDATE) || permissions.has(PERMISSION_CODES.YARD_READ))
    ) {
      const yardAssignTasks = await this.buildYardAssignTasks(actor.icdId, now);
      tasks.push(...yardAssignTasks);
    }

    // 3. YARD_OPERATIONS tasks
    if (
      (!query.type || query.type === WORK_QUEUE_TASK_TYPES.YARD_OPERATIONS) &&
      (permissions.has(PERMISSION_CODES.YARD_MOVE) ||
        permissions.has(PERMISSION_CODES.YARD_INSPECT) ||
        permissions.has(PERMISSION_CODES.YARD_BOOKING))
    ) {
      const yardOpTasks = await this.buildYardOperationTasks(actor.icdId, permissions, now);
      tasks.push(...yardOpTasks);
    }

    // 4. BILLING tasks
    if (
      (!query.type || query.type === WORK_QUEUE_TASK_TYPES.BILLING) &&
      (permissions.has(PERMISSION_CODES.BILLING_READ) ||
        permissions.has(PERMISSION_CODES.BILLING_MANAGE))
    ) {
      const billingTasks = await this.buildBillingTasks(actor.icdId, now);
      tasks.push(...billingTasks);
    }

    // 5. GATE_OUT tasks
    if (
      (!query.type || query.type === WORK_QUEUE_TASK_TYPES.GATE_OUT) &&
      permissions.has(PERMISSION_CODES.GATE_PASS_USE)
    ) {
      const gateOutTasks = await this.buildGateOutTasks(actor.icdId, now);
      tasks.push(...gateOutTasks);
    }

    // Filter by urgency if requested
    let filtered = tasks;
    if (query.urgency) {
      filtered = filtered.filter((t) => t.urgency === query.urgency);
    }

    // Sort by Urgency rank ASC, then dueAt ASC
    filtered.sort((a, b) => {
      const weightDiff = URGENCY_WEIGHT[a.urgency] - URGENCY_WEIGHT[b.urgency];
      if (weightDiff !== 0) {
        return weightDiff;
      }
      return a.dueAt.getTime() - b.dueAt.getTime();
    });

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginated,
      meta: getPaginationMeta(page, pageSize, total),
      summary: {
        total,
        overdue: filtered.filter((t) => t.urgency === WORK_QUEUE_URGENCY.OVERDUE).length,
        critical: filtered.filter((t) => t.urgency === WORK_QUEUE_URGENCY.CRITICAL).length,
        high: filtered.filter((t) => t.urgency === WORK_QUEUE_URGENCY.HIGH).length,
        normal: filtered.filter((t) => t.urgency === WORK_QUEUE_URGENCY.NORMAL).length,
      },
    };
  }

  async getStats(actor: AuthenticatedUser) {
    const queue = await this.getWorkQueue(actor, {
      page: 1,
      pageSize: 1000,
      sortOrder: 'desc',
    });
    return queue.summary;
  }

  private async buildGateInTasks(icdId: string, now: Date): Promise<WorkQueueItem[]> {
    const eligibleTrucks = await this.prisma.truckVisit.findMany({
      where: {
        icdId,
        status: { in: ['ARRIVED', 'IN_PROGRESS'] },
      },
      include: {
        containers: {
          where: { containerVisit: { icdId } },
          include: {
            containerVisit: {
              include: {
                container: true,
                reception: true,
              },
            },
          },
        },
      },
      take: 50,
    });

    const items: WorkQueueItem[] = [];

    for (const truck of eligibleTrucks) {
      const baseTime = truck.arrivedAt ?? truck.createdAt;
      const urgencyResult = this.urgencyService.calculateUrgency(
        baseTime,
        WORK_QUEUE_SLA_DEFAULTS.GATE_IN_SLA_MINUTES,
        WORK_QUEUE_SLA_DEFAULTS.WORK_QUEUE_DUE_SOON_MINUTES,
        now,
      );

      for (const tc of truck.containers) {
        if (tc.containerVisit.state === 'AUTHORIZED' && !tc.containerVisit.reception) {
          const containerNo = tc.containerVisit.container.containerNumber;
          items.push({
            id: `gate_in_${truck.id}_${tc.containerVisit.id}`,
            type: WORK_QUEUE_TASK_TYPES.GATE_IN,
            title: `Tiếp nhận cổng cho container ${containerNo}`,
            description: `Xe ${truck.vehiclePlate} đã đến cổng lúc ${baseTime.toISOString()}. Cần hoàn tất tiếp nhận hạ bãi/nhập cổng.`,
            entityType: 'TRUCK_VISIT',
            entityId: truck.id,
            referenceNo: truck.visitCode,
            containerNo,
            urgency: urgencyResult.urgency,
            dueAt: urgencyResult.dueAt,
            minutesRemaining: urgencyResult.minutesRemaining,
            metadata: {
              licensePlate: truck.vehiclePlate,
              driverName: truck.driverName,
              containerVisitId: tc.containerVisit.id,
            },
            createdAt: truck.createdAt,
          });
        }
      }
    }

    return items;
  }

  private async buildYardAssignTasks(icdId: string, now: Date): Promise<WorkQueueItem[]> {
    const containersInYard = await this.prisma.containerVisit.findMany({
      where: {
        icdId,
        state: 'IN_YARD',
        locationLogs: {
          none: {
            endedAt: null,
          },
        },
      },
      include: {
        container: true,
      },
      take: 50,
    });

    const items: WorkQueueItem[] = [];

    for (const cv of containersInYard) {
      const baseTime = cv.gateInAt ?? cv.updatedAt;
      const urgencyResult = this.urgencyService.calculateUrgency(
        baseTime,
        WORK_QUEUE_SLA_DEFAULTS.YARD_ASSIGN_SLA_MINUTES,
        WORK_QUEUE_SLA_DEFAULTS.WORK_QUEUE_DUE_SOON_MINUTES,
        now,
      );

      const containerNo = cv.container.containerNumber;

      items.push({
        id: `yard_assign_${cv.id}`,
        type: WORK_QUEUE_TASK_TYPES.YARD_ASSIGN,
        title: `Chỉ định vị trí bãi cho container ${containerNo}`,
        description: `Container ${containerNo} đã vào bãi nhưng chưa có vị trí bãi hiện hành.`,
        entityType: 'CONTAINER_VISIT',
        entityId: cv.id,
        containerNo,
        urgency: urgencyResult.urgency,
        dueAt: urgencyResult.dueAt,
        minutesRemaining: urgencyResult.minutesRemaining,
        metadata: {
          size: cv.container.size,
          type: cv.container.type,
          state: cv.state,
        },
        createdAt: cv.createdAt,
      });
    }

    return items;
  }

  private async buildYardOperationTasks(
    icdId: string,
    permissions: Set<string>,
    now: Date,
  ): Promise<WorkQueueItem[]> {
    const items: WorkQueueItem[] = [];

    // Pending Yard Movements
    if (permissions.has(PERMISSION_CODES.YARD_MOVE)) {
      const movements = await this.prisma.yardMovement.findMany({
        where: {
          containerVisit: {
            icdId,
          },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          containerVisit: {
            include: {
              container: true,
            },
          },
        },
        take: 30,
      });

      for (const m of movements) {
        const urgencyResult = this.urgencyService.calculateUrgency(
          m.createdAt,
          60,
          WORK_QUEUE_SLA_DEFAULTS.WORK_QUEUE_DUE_SOON_MINUTES,
          now,
        );

        const containerNo = m.containerVisit.container.containerNumber;

        items.push({
          id: `yard_movement_${m.id}`,
          type: WORK_QUEUE_TASK_TYPES.YARD_OPERATIONS,
          title: `Đảo chuyển bãi: ${containerNo}`,
          description: `Đảo chuyển container ${containerNo} - Trạng thái: ${m.status}. Lý do: ${m.reason ?? 'N/A'}.`,
          entityType: 'YARD_MOVEMENT',
          entityId: m.id,
          referenceNo: m.id,
          containerNo,
          urgency: urgencyResult.urgency,
          dueAt: urgencyResult.dueAt,
          minutesRemaining: urgencyResult.minutesRemaining,
          metadata: {
            containerVisitId: m.containerVisitId,
            status: m.status,
            fromSlotId: m.fromSlotId,
            toSlotId: m.toSlotId,
          },
          createdAt: m.createdAt,
        });
      }
    }

    // Pending Inspections
    if (permissions.has(PERMISSION_CODES.YARD_INSPECT)) {
      const inspections = await this.prisma.containerInspection.findMany({
        where: {
          containerVisit: {
            icdId,
          },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          containerVisit: {
            include: {
              container: true,
            },
          },
        },
        take: 30,
      });

      for (const insp of inspections) {
        const urgencyResult = this.urgencyService.calculateUrgency(
          insp.createdAt,
          120,
          WORK_QUEUE_SLA_DEFAULTS.WORK_QUEUE_DUE_SOON_MINUTES,
          now,
        );

        const containerNo = insp.containerVisit.container.containerNumber;

        items.push({
          id: `yard_inspection_${insp.id}`,
          type: WORK_QUEUE_TASK_TYPES.YARD_OPERATIONS,
          title: `Giám định bãi: ${containerNo}`,
          description: `Giám định container ${containerNo} (${insp.inspectionType}) - Trạng thái: ${insp.status}.`,
          entityType: 'CONTAINER_INSPECTION',
          entityId: insp.id,
          referenceNo: insp.id,
          containerNo,
          urgency: urgencyResult.urgency,
          dueAt: urgencyResult.dueAt,
          minutesRemaining: urgencyResult.minutesRemaining,
          metadata: {
            containerVisitId: insp.containerVisitId,
            inspectionType: insp.inspectionType,
            status: insp.status,
          },
          createdAt: insp.createdAt,
        });
      }
    }

    if (permissions.has(PERMISSION_CODES.YARD_BOOKING)) {
      const bookings = await this.prisma.inYardBooking.findMany({
        where: {
          containerVisit: { icdId },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          containerVisit: { include: { container: true } },
        },
        take: 30,
      });

      for (const booking of bookings) {
        const urgencyResult = this.urgencyService.calculateUrgencyFromDueDate(
          booking.scheduledAt,
          WORK_QUEUE_SLA_DEFAULTS.WORK_QUEUE_DUE_SOON_MINUTES,
          now,
        );
        const containerNo = booking.containerVisit.container.containerNumber;

        items.push({
          id: `yard_booking_${booking.id}`,
          type: WORK_QUEUE_TASK_TYPES.YARD_OPERATIONS,
          title: `${BOOKING_TASK_TITLES[booking.bookingType]}: ${containerNo}`,
          description: `Booking ${booking.bookingType} cho container ${containerNo} - Trạng thái: ${booking.status}.`,
          entityType: 'IN_YARD_BOOKING',
          entityId: booking.id,
          referenceNo: booking.id,
          containerNo,
          urgency: urgencyResult.urgency,
          dueAt: urgencyResult.dueAt,
          minutesRemaining: urgencyResult.minutesRemaining,
          metadata: {
            containerVisitId: booking.containerVisitId,
            bookingType: booking.bookingType,
            status: booking.status,
            scheduledAt: booking.scheduledAt,
          },
          createdAt: booking.createdAt,
        });
      }
    }

    return items;
  }

  private async buildBillingTasks(icdId: string, now: Date): Promise<WorkQueueItem[]> {
    const draftOrders = await this.prisma.serviceOrder.findMany({
      where: {
        icdId,
        status: 'DRAFT',
      },
      include: {
        containerVisit: {
          include: {
            container: true,
          },
        },
      },
      take: 30,
    });

    const items: WorkQueueItem[] = [];

    for (const order of draftOrders) {
      const urgencyResult = this.urgencyService.calculateUrgency(
        order.createdAt,
        180,
        WORK_QUEUE_SLA_DEFAULTS.WORK_QUEUE_DUE_SOON_MINUTES,
        now,
      );

      const containerNo = order.containerVisit.container.containerNumber;

      items.push({
        id: `billing_draft_${order.id}`,
        type: WORK_QUEUE_TASK_TYPES.BILLING,
        title: `Xác nhận Service Order ${order.orderNumber}`,
        description: `Service Order ${order.orderNumber} cho container ${containerNo} đang ở trạng thái DRAFT. Cần hoàn tất tính cước.`,
        entityType: 'SERVICE_ORDER',
        entityId: order.id,
        referenceNo: order.orderNumber,
        containerNo,
        urgency: urgencyResult.urgency,
        dueAt: urgencyResult.dueAt,
        minutesRemaining: urgencyResult.minutesRemaining,
        metadata: {
          totalAmount: order.totalAmount,
          currency: order.currency,
        },
        createdAt: order.createdAt,
      });
    }

    return items;
  }

  private async buildGateOutTasks(icdId: string, now: Date): Promise<WorkQueueItem[]> {
    const activeGatePasses = await this.prisma.gatePass.findMany({
      where: {
        status: 'ACTIVE',
        containerVisit: {
          icdId,
        },
      },
      include: {
        containerVisit: {
          include: {
            container: true,
          },
        },
      },
      take: 50,
    });

    const items: WorkQueueItem[] = [];

    for (const gp of activeGatePasses) {
      const urgencyResult = this.urgencyService.calculateUrgencyFromDueDate(
        gp.expiresAt,
        WORK_QUEUE_SLA_DEFAULTS.GATE_OUT_DUE_SOON_MINUTES,
        now,
      );

      const containerNo = gp.containerVisit.container.containerNumber;

      items.push({
        id: `gate_out_${gp.id}`,
        type: WORK_QUEUE_TASK_TYPES.GATE_OUT,
        title: `Xác nhận Gate-out cho container ${containerNo}`,
        description: `Phiếu ra cổng ${gp.code} còn hiệu lực đến ${gp.expiresAt.toISOString()}. Cần scan và xác nhận xe ra cổng.`,
        entityType: 'GATE_PASS',
        entityId: gp.id,
        referenceNo: gp.code,
        containerNo,
        urgency: urgencyResult.urgency,
        dueAt: urgencyResult.dueAt,
        minutesRemaining: urgencyResult.minutesRemaining,
        metadata: {
          receiverName: gp.receiverName,
          vehiclePlate: gp.vehiclePlate,
          expiresAt: gp.expiresAt,
        },
        createdAt: gp.issuedAt,
      });
    }

    return items;
  }
}
