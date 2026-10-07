import { WorkQueueService } from './work-queue.service';
import { WorkQueueUrgencyService } from './work-queue-urgency.service';
import type { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.types';

describe('WorkQueueService yard projections', () => {
  const now = new Date();
  const visit = { id: 'visit-1', container: { containerNumber: 'TEST1234567' } };
  function setup(permissions: string[], bookingType = 'STUFFING') {
    const row = {
      id: 'op-1',
      containerVisitId: visit.id,
      containerVisit: visit,
      status: 'PENDING',
      createdAt: now,
      scheduledAt: now,
      bookingType,
    };
    const prisma = {
      yardMovement: { findMany: jest.fn().mockResolvedValue([row]) },
      containerInspection: { findMany: jest.fn().mockResolvedValue([row]) },
      inYardBooking: { findMany: jest.fn().mockResolvedValue([row]) },
    };
    const service = new WorkQueueService(
      prisma as unknown as PrismaService,
      new WorkQueueUrgencyService(),
    );
    const actor = {
      icdId: 'icd-1',
      roleCodes: ['YARD_STAFF'],
      permissionCodes: permissions,
    } as AuthenticatedUser;
    return { prisma, service, actor };
  }
  it.each([
    ['INSPECTION', 'Kiểm tra tại bãi'],
    ['STRIPPING', 'Rút hàng tại bãi'],
    ['STUFFING', 'Đóng hàng tại bãi'],
  ])(
    'projects open %s bookings with the correct task title and visit identifier',
    async (bookingType, title) => {
      const { prisma, service, actor } = setup(['yard.booking'], bookingType);
      const queue = await service.getWorkQueue(actor, {
        type: 'YARD_OPERATIONS',
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
      });
      expect(queue.data).toEqual([
        expect.objectContaining({
          entityType: 'IN_YARD_BOOKING',
          entityId: 'op-1',
          title: `${title}: ${visit.container.containerNumber}`,
          metadata: expect.objectContaining({ containerVisitId: 'visit-1' }),
        }),
      ]);
      expect(prisma.inYardBooking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { containerVisit: { icdId: 'icd-1' }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        }),
      );
      expect(prisma.yardMovement.findMany).not.toHaveBeenCalled();
    },
  );
  it('includes visit metadata for movements and inspections without querying unauthorized bookings', async () => {
    const { prisma, service, actor } = setup(['yard.move', 'yard.inspect']);
    const queue = await service.getWorkQueue(actor, {
      type: 'YARD_OPERATIONS',
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
    expect(queue.data).toHaveLength(2);
    expect(queue.data.every((row) => row.metadata?.containerVisitId === 'visit-1')).toBe(true);
    expect(prisma.inYardBooking.findMany).not.toHaveBeenCalled();
  });

  it.each(['CONSIGNEE', 'AGENT'])(
    'rejects ICD-wide work queue access for an unbound %s with custom yard grants',
    async (role) => {
      const { prisma, service, actor } = setup(['yard.booking']);
      actor.roleCodes = [role];
      await expect(
        service.getWorkQueue(actor, {
          type: 'YARD_OPERATIONS',
          page: 1,
          pageSize: 20,
          sortOrder: 'desc',
        }),
      ).rejects.toMatchObject({
        status: 403,
        response: { code: 'CUSTOMER_SCOPE_NOT_CONFIGURED' },
      });
      expect(prisma.inYardBooking.findMany).not.toHaveBeenCalled();
    },
  );

  it.each(['CONSIGNEE', 'AGENT'])(
    'rejects ICD-wide work queue statistics for an unbound %s',
    async (role) => {
      const { prisma, service, actor } = setup(['yard.booking']);
      actor.roleCodes = [role];
      await expect(service.getStats(actor)).rejects.toMatchObject({
        status: 403,
        response: { code: 'CUSTOMER_SCOPE_NOT_CONFIGURED' },
      });
      expect(prisma.inYardBooking.findMany).not.toHaveBeenCalled();
    },
  );

  it('keeps mixed internal staff accounts permission-controlled', async () => {
    const { service, actor } = setup(['yard.booking']);
    actor.roleCodes = ['AGENT', 'YARD_STAFF'];
    const queue = await service.getWorkQueue(actor, {
      type: 'YARD_OPERATIONS',
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
    expect(queue.data).toHaveLength(1);
  });
});

describe('WorkQueueService gate-in projections', () => {
  const now = new Date();
  function setup(truckStatus: 'ARRIVED' | 'IN_PROGRESS') {
    const makeVisit = (id: string, state: string, reception: { id: string } | null = null) => ({
      id,
      icdId: 'icd-1',
      state,
      reception,
      container: { containerNumber: `TEST-${id}` },
    });
    const truck = {
      id: 'truck-1',
      icdId: 'icd-1',
      status: truckStatus,
      visitCode: 'TRUCK-1',
      vehiclePlate: '51C-12345',
      arrivedAt: now,
      createdAt: now,
      containers: [
        { containerVisit: makeVisit('received-1', 'IN_YARD', { id: 'reception-1' }) },
        { containerVisit: makeVisit('authorized-2', 'AUTHORIZED') },
        { containerVisit: makeVisit('pending-3', 'PENDING') },
        { containerVisit: makeVisit('received-4', 'AUTHORIZED', { id: 'reception-4' }) },
      ],
    };
    const prisma = {
      truckVisit: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          const statuses = typeof where.status === 'string' ? [where.status] : where.status.in;
          return Promise.resolve(
            [truck, { ...truck, id: 'other-truck', icdId: 'icd-2' }].filter(
              (row) => row.icdId === where.icdId && statuses.includes(row.status),
            ),
          );
        }),
      },
    };
    const service = new WorkQueueService(
      prisma as unknown as PrismaService,
      new WorkQueueUrgencyService(),
    );
    const actor = {
      icdId: 'icd-1',
      roleCodes: ['GATE_STAFF'],
      permissionCodes: ['gate_in.create'],
    } as AuthenticatedUser;
    return { prisma, service, actor };
  }

  it.each(['ARRIVED', 'IN_PROGRESS'] as const)(
    'lists only an authorized unreceived container on an %s truck in the actor ICD',
    async (status) => {
      const { prisma, service, actor } = setup(status);
      const queue = await service.getWorkQueue(actor, {
        type: 'GATE_IN',
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
      });
      expect(queue.data).toEqual([
        expect.objectContaining({
          entityType: 'TRUCK_VISIT',
          entityId: 'truck-1',
          metadata: expect.objectContaining({ containerVisitId: 'authorized-2' }),
        }),
      ]);
      expect(prisma.truckVisit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { icdId: actor.icdId, status: { in: ['ARRIVED', 'IN_PROGRESS'] } },
          include: {
            containers: {
              where: { containerVisit: { icdId: actor.icdId } },
              include: { containerVisit: { include: { container: true, reception: true } } },
            },
          },
        }),
      );
    },
  );
});
