export const MOVEMENT_ORDER_LIST_INCLUDE = {
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
          consignee: {
            select: {
              id: true,
              name: true,
              taxCode: true,
            },
          },
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  authorizedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export const MOVEMENT_ORDER_DETAIL_INCLUDE = {
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
          consignee: {
            select: {
              id: true,
              name: true,
              taxCode: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          clearingAgent: {
            select: {
              id: true,
              name: true,
              licenseNo: true,
            },
          },
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  authorizedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;
