import { Prisma } from '../../../generated/prisma/client';

export const TRUCK_VISIT_LIST_INCLUDE = {
  transporter: true,
  containers: {
    include: {
      containerVisit: {
        include: {
          container: true,
        },
      },
    },
    orderBy: {
      sequenceNo: 'asc',
    },
  },
} as const satisfies Prisma.TruckVisitInclude;

export const TRUCK_VISIT_DETAIL_INCLUDE = {
  transporter: true,
  containers: {
    include: {
      containerVisit: {
        include: {
          container: true,
          houseBl: {
            include: {
              masterBl: {
                include: {
                  manifest: true,
                },
              },
              consignee: true,
              clearingAgent: true,
            },
          },
          movementOrders: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      },
    },
    orderBy: {
      sequenceNo: 'asc',
    },
  },
} as const satisfies Prisma.TruckVisitInclude;
