import {
  apiClient,
} from '../../../services/api/api-client';

import type {
  BillableService,
  BillingInvoice,
  BillingLine,
  BillingSnapshot,
  CreatePaymentInput,
  InvoicePayment,
  ServiceOrder,
} from '../billing.types';

type UnknownRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function asRecord(
  value: unknown,
): UnknownRecord {
  return isRecord(value)
    ? value
    : {};
}

function unwrapData(
  value: unknown,
): unknown {
  if (
    isRecord(value) &&
    'data' in value
  ) {
    return value.data;
  }

  return value;
}

function readString(
  source: UnknownRecord,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      return value;
    }
  }

  return undefined;
}

function readNumber(
  source: UnknownRecord,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      const parsed =
        Number(value);

      if (
        Number.isFinite(parsed)
      ) {
        return parsed;
      }
    }
  }

  return fallback;
}

function readBoolean(
  source: UnknownRecord,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const value =
      source[key];

    if (
      typeof value === 'boolean'
    ) {
      return value;
    }
  }

  return undefined;
}

function readArray(
  source: UnknownRecord,
  keys: string[],
): unknown[] {
  for (const key of keys) {
    const value =
      source[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeLine(
  raw: unknown,
  index = 0,
): BillingLine | null {
  if (!isRecord(raw)) {
    return null;
  }

  const service =
    asRecord(
      raw.service ??
        raw.serviceType,
    );

  const serviceCode =
    readString(
      raw,
      [
        'serviceCode',
        'code',
        'type',
        'serviceType',
      ],
    ) ??
    readString(
      service,
      [
        'code',
        'serviceCode',
      ],
    );

  if (!serviceCode) {
    return null;
  }

  const quantity =
    readNumber(
      raw,
      [
        'quantity',
        'qty',
        'billableQuantity',
      ],
    );

  const unitPrice =
    readNumber(
      raw,
      [
        'unitPrice',
        'price',
        'rate',
      ],
    );

  const amount =
    readNumber(
      raw,
      [
        'amount',
        'lineAmount',
        'totalAmount',
        'total',
      ],
      quantity * unitPrice,
    );

  return {
    id:
      readString(
        raw,
        ['id'],
      ) ??
      `line-${index}`,

    serviceCode,

    description:
      readString(
        raw,
        [
          'description',
          'name',
          'serviceName',
        ],
      ) ??
      readString(
        service,
        ['name'],
      ) ??
      null,

    quantity,

    unitPrice,

    amount,

    unit:
      readString(
        raw,
        [
          'unit',
          'unitName',
        ],
      ) ??
      null,
  };
}

function normalizeBillableService(
  raw: unknown,
): BillableService | null {
  if (!isRecord(raw)) {
    return null;
  }

  const serviceCode =
    readString(
      raw,
      [
        'serviceCode',
        'code',
        'type',
        'serviceType',
      ],
    );

  if (!serviceCode) {
    return null;
  }

  const cumulativeQuantity =
    readNumber(
      raw,
      [
        'cumulativeQuantity',
        'completedQuantity',
        'totalQuantity',
        'quantity',
      ],
    );

  const billedQuantity =
    readNumber(
      raw,
      [
        'billedQuantity',
        'previouslyBilledQuantity',
      ],
    );

  const unbilledQuantity =
    readNumber(
      raw,
      [
        'unbilledQuantity',
        'remainingQuantity',
        'billableQuantity',
      ],
      Math.max(
        0,
        cumulativeQuantity -
          billedQuantity,
      ),
    );

  const unitPrice =
    readNumber(
      raw,
      [
        'unitPrice',
        'price',
        'rate',
      ],
      -1,
    );

  const estimatedAmount =
    readNumber(
      raw,
      [
        'estimatedAmount',
        'amount',
        'unbilledAmount',
      ],
      unitPrice >= 0
        ? unbilledQuantity *
            unitPrice
        : -1,
    );

  return {
    serviceCode,

    description:
      readString(
        raw,
        [
          'description',
          'name',
          'serviceName',
        ],
      ) ??
      null,

    cumulativeQuantity,

    billedQuantity,

    unbilledQuantity,

    unitPrice:
      unitPrice >= 0
        ? unitPrice
        : null,

    estimatedAmount:
      estimatedAmount >= 0
        ? estimatedAmount
        : null,

    unit:
      readString(
        raw,
        ['unit'],
      ) ??
      null,
  };
}

function normalizeServiceOrder(
  raw: unknown,
): ServiceOrder | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id =
    readString(
      raw,
      [
        'id',
        'orderId',
        'serviceOrderId',
      ],
    );

  if (!id) {
    return null;
  }

  const lines =
    readArray(
      raw,
      [
        'lines',
        'items',
        'serviceOrderItems',
        'services',
      ],
    )
      .map(
        normalizeLine,
      )
      .filter(
        (
          item,
        ): item is BillingLine =>
          item !== null,
      );

  const invoice =
    asRecord(
      raw.invoice,
    );

  return {
    id,

    orderNumber:
      readString(
        raw,
        [
          'orderNumber',
          'serviceOrderNumber',
          'number',
          'code',
        ],
      ) ??
      null,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      'DRAFT',

    lines,

    totalAmount:
      readNumber(
        raw,
        [
          'totalAmount',
          'amount',
          'total',
        ],
        lines.reduce(
          (
            total,
            line,
          ) =>
            total +
            line.amount,
          0,
        ),
      ),

    createdAt:
      readString(
        raw,
        ['createdAt'],
      ) ??
      null,

    confirmedAt:
      readString(
        raw,
        ['confirmedAt'],
      ) ??
      null,

    invoiceId:
      readString(
        raw,
        ['invoiceId'],
      ) ??
      readString(
        invoice,
        ['id'],
      ) ??
      null,

    invoiceNumber:
      readString(
        raw,
        ['invoiceNumber'],
      ) ??
      readString(
        invoice,
        [
          'invoiceNumber',
          'number',
          'code',
        ],
      ) ??
      null,

    isSupplemental:
      readBoolean(
        raw,
        [
          'isSupplemental',
          'supplemental',
        ],
      ),
  };
}

function normalizePayment(
  raw: unknown,
  index = 0,
): InvoicePayment | null {
  if (!isRecord(raw)) {
    return null;
  }

  const actor =
    asRecord(
      raw.createdBy ??
        raw.user ??
        raw.actor,
    );

  return {
    id:
      readString(
        raw,
        [
          'id',
          'paymentId',
          'allocationId',
        ],
      ) ??
      `payment-${index}`,

    amount:
      readNumber(
        raw,
        [
          'amount',
          'allocatedAmount',
          'paymentAmount',
        ],
      ),

    method:
      readString(
        raw,
        [
          'method',
          'paymentMethod',
        ],
      ) ??
      null,

    paidAt:
      readString(
        raw,
        [
          'paidAt',
          'paymentDate',
          'createdAt',
        ],
      ) ??
      null,

    notes:
      readString(
        raw,
        [
          'notes',
          'note',
          'description',
        ],
      ) ??
      null,

    reference:
      readString(
        raw,
        [
          'reference',
          'referenceNumber',
          'transactionReference',
        ],
      ) ??
      null,

    createdByName:
      readString(
        raw,
        [
          'createdByName',
          'actorName',
        ],
      ) ??
      readString(
        actor,
        [
          'name',
          'email',
        ],
      ) ??
      null,
  };
}

function normalizeInvoice(
  raw: unknown,
): BillingInvoice | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id =
    readString(
      raw,
      [
        'id',
        'invoiceId',
      ],
    );

  if (!id) {
    return null;
  }

  const lines =
    readArray(
      raw,
      [
        'lines',
        'items',
        'invoiceItems',
        'services',
      ],
    )
      .map(
        normalizeLine,
      )
      .filter(
        (
          item,
        ): item is BillingLine =>
          item !== null,
      );

  const payments =
    readArray(
      raw,
      [
        'payments',
        'paymentAllocations',
        'allocations',
      ],
    )
      .map(
        normalizePayment,
      )
      .filter(
        (
          item,
        ): item is InvoicePayment =>
          item !== null,
      );

  const totalAmount =
    readNumber(
      raw,
      [
        'totalAmount',
        'amount',
        'total',
      ],
      lines.reduce(
        (
          total,
          line,
        ) =>
          total +
          line.amount,
        0,
      ),
    );

  const paidAmount =
    readNumber(
      raw,
      [
        'paidAmount',
        'amountPaid',
      ],
      payments.reduce(
        (
          total,
          payment,
        ) =>
          total +
          payment.amount,
        0,
      ),
    );

  return {
    id,

    invoiceNumber:
      readString(
        raw,
        [
          'invoiceNumber',
          'number',
          'code',
        ],
      ) ??
      null,

    status:
      readString(
        raw,
        ['status'],
      ) ??
      (
        paidAmount >=
        totalAmount &&
        totalAmount > 0
          ? 'PAID'
          : paidAmount > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID'
      ),

    serviceOrderId:
      readString(
        raw,
        [
          'serviceOrderId',
          'orderId',
        ],
      ) ??
      null,

    lines,

    totalAmount,

    paidAmount,

    balanceAmount:
      readNumber(
        raw,
        [
          'balanceAmount',
          'remainingAmount',
          'outstandingAmount',
        ],
        Math.max(
          0,
          totalAmount -
            paidAmount,
        ),
      ),

    issuedAt:
      readString(
        raw,
        [
          'issuedAt',
          'createdAt',
        ],
      ) ??
      null,

    dueDate:
      readString(
        raw,
        [
          'dueDate',
          'dueAt',
        ],
      ) ??
      null,

    payments,
  };
}

function normalizeSnapshot(
  response: unknown,
  visitId: string,
): BillingSnapshot {
  const root =
    asRecord(
      unwrapData(response),
    );

  const container =
    asRecord(
      root.container,
    );

  const consignee =
    asRecord(
      root.consignee,
    );

  const totals =
    asRecord(
      root.summary ??
        root.totals,
    );

  const serviceOrders =
    readArray(
      root,
      [
        'serviceOrders',
        'orders',
      ],
    )
      .map(
        normalizeServiceOrder,
      )
      .filter(
        (
          item,
        ): item is ServiceOrder =>
          item !== null,
      );

  const invoices =
    readArray(
      root,
      ['invoices'],
    )
      .map(
        normalizeInvoice,
      )
      .filter(
        (
          item,
        ): item is BillingInvoice =>
          item !== null,
      );

  const billableServices =
    readArray(
      root,
      [
        'billableServices',
        'unbilledServices',
        'billableQuantities',
      ],
    )
      .map(
        normalizeBillableService,
      )
      .filter(
        (
          item,
        ): item is BillableService =>
          item !== null,
      );

  const invoiceTotal =
    invoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        invoice.totalAmount,
      0,
    );

  const paidTotal =
    invoices.reduce(
      (
        total,
        invoice,
      ) =>
        total +
        invoice.paidAmount,
      0,
    );

  const unbilledAmount =
    billableServices.reduce(
      (
        total,
        service,
      ) =>
        total +
        (
          service.estimatedAmount ??
          0
        ),
      0,
    );

  return {
    visitId:
      readString(
        root,
        [
          'visitId',
          'containerVisitId',
        ],
      ) ??
      visitId,

    containerNumber:
      readString(
        root,
        [
          'containerNumber',
          'containerNo',
        ],
      ) ??
      readString(
        container,
        [
          'containerNumber',
          'containerNo',
          'number',
        ],
      ) ??
      null,

    consigneeName:
      readString(
        root,
        [
          'consigneeName',
        ],
      ) ??
      readString(
        consignee,
        [
          'name',
          'companyName',
        ],
      ) ??
      null,

    gateInAt:
      readString(
        root,
        ['gateInAt'],
      ) ??
      null,

    billableServices,

    serviceOrders,

    invoices,

    totalCharges:
      readNumber(
        totals,
        [
          'totalCharges',
          'totalAmount',
          'total',
        ],
        invoiceTotal,
      ),

    totalPaid:
      readNumber(
        totals,
        [
          'totalPaid',
          'paidAmount',
        ],
        paidTotal,
      ),

    outstandingAmount:
      readNumber(
        totals,
        [
          'outstandingAmount',
          'balanceAmount',
        ],
        Math.max(
          0,
          invoiceTotal -
            paidTotal,
        ),
      ),

    unbilledAmount:
      readNumber(
        totals,
        [
          'unbilledAmount',
        ],
        unbilledAmount,
      ),

    hasUnbilledServices:
      (
        readBoolean(
          root,
          [
            'hasUnbilledServices',
          ],
        ) ??
        billableServices.some(
          (item) =>
            item.unbilledQuantity >
            0,
        )
      ),
  };
}

export const billingApi = {
  async getBilling(
    visitId: string,
  ): Promise<BillingSnapshot> {
    const response =
      await apiClient.get<unknown>(
        `/containers/${encodeURIComponent(
          visitId,
        )}/billing`,
      );

    return normalizeSnapshot(
      response,
      visitId,
    );
  },

  async createServiceOrder(
    visitId: string,
  ): Promise<void> {
    /*
     * Backend Billing owner tự:
     * - đọc operational events
     * - tính cumulative quantity
     * - trừ previously billed
     * - resolve active tariff
     * - chống duplicate billing
     *
     * Frontend không gửi unitPrice
     * hoặc quantity tự tính.
     */
    await apiClient.post<unknown>(
      `/containers/${encodeURIComponent(
        visitId,
      )}/service-orders`,
      {},
    );
  },

  async confirmServiceOrder(
    orderId: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/service-orders/${encodeURIComponent(
        orderId,
      )}/confirm`,
      {},
    );
  },

  async createInvoice(
    orderId: string,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/service-orders/${encodeURIComponent(
        orderId,
      )}/invoice`,
      {},
    );
  },

  async recordPayment(
    invoiceId: string,
    input: CreatePaymentInput,
  ): Promise<void> {
    await apiClient.post<unknown>(
      `/invoices/${encodeURIComponent(
        invoiceId,
      )}/payments`,
      {
        amount:
          input.amount,

        method:
          input.method,

        ...(input.paidAt
          ? {
              paidAt:
                input.paidAt,
            }
          : {}),

        ...(input.notes?.trim()
          ? {
              notes:
                input.notes.trim(),
            }
          : {}),
      },
    );
  },
};
