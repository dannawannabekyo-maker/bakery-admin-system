/**
 * Shared domain constants — kept in sync with the Postgres ENUMs created in
 * STEP 2.
 */

export const ROLES = ["ADMIN", "SALES", "PRODUCTION", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_TYPES = ["READY_STOCK", "PRE_ORDER"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  "UNPAID",
  "PAID",
  "IN_PRODUCTION",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Forward status flow used by the Production kanban. */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  UNPAID: "PAID",
  PAID: "IN_PRODUCTION",
  IN_PRODUCTION: "READY",
  READY: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
};

/** Statuses the Production (kitchen) role is allowed to move an order to. */
export const PRODUCTION_ALLOWED_TARGETS: OrderStatus[] = [
  "IN_PRODUCTION",
  "READY",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  IN_PRODUCTION: "In Production",
  READY: "Ready for Delivery/Pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const STORAGE_BUCKETS = {
  productImages: "product-images",
  paymentReceipts: "payment-receipts",
} as const;

/** Manual payment channels the customer can use at checkout. */
export const PAYMENT_METHODS = ["QRIS", "BANK_TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  QRIS: "QRIS",
  BANK_TRANSFER: "Transfer Bank",
};
