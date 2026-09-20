export type BillingServiceCode =
  | 'RECEPTION'
  | 'STORAGE'
  | 'STRIPPING'
  | 'INSPECTION'
  | 'MOVEMENT'
  | string;

export type ServiceOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'INVOICED'
  | 'CANCELLED'
  | string;

export type InvoiceStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID'
  | string;

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'OTHER';

export type BillingLine = {
  id?: string;

  serviceCode: BillingServiceCode;

  description?: string | null;

  quantity: number;

  unitPrice: number;

  amount: number;

  unit?: string | null;
};

export type BillableService = {
  serviceCode: BillingServiceCode;

  description?: string | null;

  cumulativeQuantity: number;

  billedQuantity: number;

  unbilledQuantity: number;

  unitPrice?: number | null;

  estimatedAmount?: number | null;

  unit?: string | null;
};

export type ServiceOrder = {
  id: string;

  orderNumber?: string | null;

  status: ServiceOrderStatus;

  lines: BillingLine[];

  totalAmount: number;

  createdAt?: string | null;

  confirmedAt?: string | null;

  invoiceId?: string | null;

  invoiceNumber?: string | null;

  isSupplemental?: boolean;
};

export type InvoicePayment = {
  id: string;

  amount: number;

  method?: PaymentMethod | string | null;

  paidAt?: string | null;

  notes?: string | null;

  reference?: string | null;

  createdByName?: string | null;
};

export type BillingInvoice = {
  id: string;

  invoiceNumber?: string | null;

  status: InvoiceStatus;

  serviceOrderId?: string | null;

  lines: BillingLine[];

  totalAmount: number;

  paidAmount: number;

  balanceAmount: number;

  issuedAt?: string | null;

  dueDate?: string | null;

  payments: InvoicePayment[];
};

export type BillingSnapshot = {
  visitId: string;

  containerNumber?: string | null;

  consigneeName?: string | null;

  gateInAt?: string | null;

  billableServices: BillableService[];

  serviceOrders: ServiceOrder[];

  invoices: BillingInvoice[];

  totalCharges: number;

  totalPaid: number;

  outstandingAmount: number;

  unbilledAmount: number;

  hasUnbilledServices: boolean;
};

export type CreatePaymentInput = {
  amount: number;

  method: PaymentMethod;

  paidAt?: string;

  notes?: string;
};
