/**
 * Shared domain constants — kept in sync with the Postgres ENUMs created in
 * STEP 2.
 */

export const ROLES = [
  "ADMIN",
  "SALES",
  "PRODUCTION",
  "FINANCE",
  "CUSTOMER",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  SALES: "Sales",
  PRODUCTION: "Production / Kitchen",
  FINANCE: "Finance",
  CUSTOMER: "Customer",
};

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

/* ------------------------------------------------------------------ finance */

/**
 * Fallbacks only — the live values are `store_settings.tax_rate` and
 * `store_settings.daily_po_item_capacity`. Used when the settings row is
 * unreachable (e.g. before the first migration/seed).
 */
export const DEFAULT_TAX_RATE = 0.11; // inclusive: menu prices already include this
export const DEFAULT_DAILY_PO_ITEM_CAPACITY = 200;

/** Suggested (non-enforced) expense buckets for the cash-flow form. */
export const EXPENSE_CATEGORIES = [
  "OPERATIONAL",
  "INGREDIENTS",
  "PACKAGING",
  "UTILITIES",
  "SALARY",
  "RENT",
  "EQUIPMENT",
  "MARKETING",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  OPERATIONAL: "Operasional",
  INGREDIENTS: "Bahan baku",
  PACKAGING: "Kemasan",
  UTILITIES: "Listrik / air / gas",
  SALARY: "Gaji",
  RENT: "Sewa",
  EQUIPMENT: "Peralatan",
  MARKETING: "Marketing",
  OTHER: "Lainnya",
};

/** Recap windows offered by the Finance dashboard. */
export const FINANCE_PERIODS = ["daily", "weekly", "monthly"] as const;
export type FinancePeriod = (typeof FINANCE_PERIODS)[number];

export const FINANCE_PERIOD_LABEL: Record<FinancePeriod, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

/** All money math / date bucketing for the bakery happens in this zone. */
export const BAKERY_TZ = "Asia/Jakarta";
