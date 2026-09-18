import { Prisma } from '../../../generated/prisma/client';

export const CONTAINER_RECEPTION_DETAIL_INCLUDE = {
  containerVisit: {
    include: {
      container: true,
      houseBl: {
        include: {
          masterBl: {
            include: {
              manifest: {
                select: {
                  id: true,
                  manifestNo: true,
                  status: true,
                },
              },
            },
          },
          consignee: true,
        },
      },
    },
  },
  truckVisit: {
    include: {
      transporter: true,
    },
  },
  receivedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.ContainerReceptionInclude;

export type ContainerReceptionDetailRecord =
  Prisma.ContainerReceptionGetPayload<{
    include: typeof CONTAINER_RECEPTION_DETAIL_INCLUDE;
  }>;

export function mapContainerReception(
  reception: ContainerReceptionDetailRecord,
) {
  return {
    ...reception,
    actualWeight: reception.actualWeight?.toString() ?? null,
    containerVisit: {
      ...reception.containerVisit,
      grossWeight:
        reception.containerVisit.grossWeight?.toString() ?? null,
    },
  };
}
