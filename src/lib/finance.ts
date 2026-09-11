import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_TAX_RATE,
  DEFAULT_DAILY_PO_ITEM_CAPACITY,
  type FinancePeriod,
} from "@/lib/constants";
import { periodRange, taxBreakdown } from "@/lib/format";
import type {
  CapitalEntryRow,
  ExpenseRow,
  ProfileRow,
} from "@/lib/supabase/database.types";

/* ----------------------------------------------------------------- settings */

export type FinanceSettings = {
  taxRate: number;
  dailyPoItemCapacity: number;
};

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_settings")
    .select("tax_rate, daily_po_item_capacity")
    .eq("id", 1)
    .maybeSingle();
  return {
    taxRate: data?.tax_rate != null ? Number(data.tax_rate) : DEFAULT_TAX_RATE,
    dailyPoItemCapacity:
      data?.daily_po_item_capacity ?? DEFAULT_DAILY_PO_ITEM_CAPACITY,
  };
}

/* ------------------------------------------------------------------- recaps */

export type FinanceRecap = {
  period: FinancePeriod;
  label: string;
  startDate: string;
  endDate: string;
  taxRate: number;
  orderCount: number;
  /** total the customers actually paid (tax-inclusive) */
  grossSales: number;
  /** grossSales minus the embedded tax */
  netRevenue: number;
  /** embedded tax to remit */
  taxCollected: number;
  operationalExpenses: number;
  capitalIn: number;
  /** cash basis: capital injected + cash from sales − expenses */
  netCashFlow: number;
  /** accrual basis: net revenue − expenses (tax is a pass-through) */
  operatingResult: number;
};

async function sumWindow(startISO: string, endISO: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("finance_orders")
    .select("gross_amount, net_amount, tax_amount")
    .gte("recognised_at", startISO)
    .lt("recognised_at", endISO);

  let grossSales = 0;
  let netRevenue = 0;
  let taxCollected = 0;
  for (const r of data ?? []) {
    grossSales += r.gross_amount ?? 0;
    netRevenue += r.net_amount ?? 0;
    taxCollected += r.tax_amount ?? 0;
  }
  return { orderCount: (data ?? []).length, grossSales, netRevenue, taxCollected };
}

export async function getRecap(
  period: FinancePeriod,
  anchor?: string,
): Promise<FinanceRecap> {
  const admin = createAdminClient();
  const { taxRate } = await getFinanceSettings();
  const range = periodRange(period, anchor);

  const [sales, expRes, capRes] = await Promise.all([
    sumWindow(range.startISO, range.endISO),
    admin
      .from("expenses")
      .select("amount")
      .gte("spent_at", range.startDate)
      .lt("spent_at", range.endDate),
    admin
      .from("capital_entries")
      .select("amount")
      .gte("entry_date", range.startDate)
      .lt("entry_date", range.endDate),
  ]);

  const operationalExpenses = (expRes.data ?? []).reduce(
    (s, e) => s + (e.amount ?? 0),
    0,
  );
  const capitalIn = (capRes.data ?? []).reduce(
    (s, c) => s + (c.amount ?? 0),
    0,
  );

  return {
    period,
    label: range.label,
    startDate: range.startDate,
    endDate: range.endDate,
    taxRate,
    orderCount: sales.orderCount,
    grossSales: sales.grossSales,
    netRevenue: sales.netRevenue,
    taxCollected: sales.taxCollected,
    operationalExpenses,
    capitalIn,
    netCashFlow: capitalIn + sales.grossSales - operationalExpenses,
    operatingResult: sales.netRevenue - operationalExpenses,
  };
}

/** All three windows at once (daily / weekly / monthly) around the same anchor. */
export async function getAllRecaps(anchor?: string): Promise<FinanceRecap[]> {
  return Promise.all([
    getRecap("daily", anchor),
    getRecap("weekly", anchor),
    getRecap("monthly", anchor),
  ]);
}

/* ------------------------------------------------------------ cash position */

export type CashPosition = {
  capitalAllTime: number;
  grossSalesAllTime: number;
  netRevenueAllTime: number;
  taxCollectedAllTime: number;
  expensesAllTime: number;
  /** capital + gross sales − expenses (money that should be in the drawer/bank) */
  cashOnHand: number;
};

export async function getCashPosition(): Promise<CashPosition> {
  const admin = createAdminClient();
  const [financeOrders, expRes, capRes] = await Promise.all([
    admin.from("finance_orders").select("gross_amount, net_amount, tax_amount"),
    admin.from("expenses").select("amount"),
    admin.from("capital_entries").select("amount"),
  ]);

  let grossSalesAllTime = 0;
  let netRevenueAllTime = 0;
  let taxCollectedAllTime = 0;
  for (const r of financeOrders.data ?? []) {
    grossSalesAllTime += r.gross_amount ?? 0;
    netRevenueAllTime += r.net_amount ?? 0;
    taxCollectedAllTime += r.tax_amount ?? 0;
  }
  const expensesAllTime = (expRes.data ?? []).reduce(
    (s, e) => s + (e.amount ?? 0),
    0,
  );
  const capitalAllTime = (capRes.data ?? []).reduce(
    (s, c) => s + (c.amount ?? 0),
    0,
  );

  return {
    capitalAllTime,
    grossSalesAllTime,
    netRevenueAllTime,
    taxCollectedAllTime,
    expensesAllTime,
    cashOnHand: capitalAllTime + grossSalesAllTime - expensesAllTime,
  };
}

/* ---------------------------------------------------------------- list rows */

export type CapitalEntryWithCreator = CapitalEntryRow & {
  creator: Pick<ProfileRow, "full_name"> | null;
};
export type ExpenseWithCreator = ExpenseRow & {
  creator: Pick<ProfileRow, "full_name"> | null;
};

export async function listCapitalEntries(
  limit = 100,
): Promise<CapitalEntryWithCreator[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("capital_entries")
    .select(
      "*, creator:profiles!capital_entries_created_by_fkey(full_name)",
    )
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CapitalEntryWithCreator[];
}

export async function listExpenses(limit = 200): Promise<ExpenseWithCreator[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("expenses")
    .select("*, creator:profiles!expenses_created_by_fkey(full_name)")
    .order("spent_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ExpenseWithCreator[];
}

/**
 * Per-order revenue split for a period — powers the "Financial Reporting"
 * detail table (inclusive-tax breakdown, Option A).
 */
export type FinanceOrderLine = {
  id: string;
  orderNumber: string;
  recognisedAt: string;
  gross: number;
  net: number;
  tax: number;
};

export async function listFinanceOrderLines(
  period: FinancePeriod,
  anchor?: string,
  limit = 500,
): Promise<FinanceOrderLine[]> {
  const admin = createAdminClient();
  const range = periodRange(period, anchor);
  const { data } = await admin
    .from("finance_orders")
    .select("id, order_number, recognised_at, gross_amount, net_amount, tax_amount")
    .gte("recognised_at", range.startISO)
    .lt("recognised_at", range.endISO)
    .order("recognised_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id,
    orderNumber: r.order_number,
    recognisedAt: r.recognised_at,
    gross: r.gross_amount ?? 0,
    net: r.net_amount ?? 0,
    tax: r.tax_amount ?? 0,
  }));
}

/** Re-export for convenience where only the pure math is needed. */
export { taxBreakdown };
