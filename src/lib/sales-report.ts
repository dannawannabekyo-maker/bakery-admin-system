import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listOrders } from "@/lib/data";
import { periodRange, jakartaDateString } from "@/lib/format";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type FinancePeriod,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/constants";

export type SalesReportDatePoint = {
  date: string;
  orderCount: number;
  grossSales: number;
};
export type SalesReportStatusRow = { status: OrderStatus; label: string; count: number };
export type SalesReportPaymentRow = {
  method: string;
  label: string;
  count: number;
  grossSales: number;
};
export type SalesReportProductRow = {
  productName: string;
  quantity: number;
  grossSales: number;
};

export type SalesReport = {
  period: FinancePeriod;
  label: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  totalOrders: number;
  grossSales: number;
  averageOrderValue: number;
  byDate: SalesReportDatePoint[];
  byStatus: SalesReportStatusRow[];
  byPaymentMethod: SalesReportPaymentRow[];
  topProducts: SalesReportProductRow[];
};

/**
 * "Recognised" sales for the period — the exact same revenue rule Finance
 * uses (`finance_orders` view: status in PAID/IN_PRODUCTION/READY/COMPLETED,
 * dated by recognised_at = coalesce(paid_at, updated_at, created_at)) — so
 * this report's "Total Sales" always matches Finance's "Gross sales" for the
 * same window. Unlike Finance's recap, this never touches net revenue, tax,
 * expenses, or cash position — that stays Finance-only.
 */
export async function getSalesReport(
  period: FinancePeriod,
  anchor?: string,
): Promise<SalesReport> {
  const range = periodRange(period, anchor);
  const supabase = await createClient();

  const { data } = await supabase
    .from("finance_orders")
    .select("id, gross_amount, recognised_at")
    .gte("recognised_at", range.startISO)
    .lt("recognised_at", range.endISO);

  const recognised = data ?? [];
  const grossById = new Map(recognised.map((r) => [r.id as string, (r.gross_amount as number) ?? 0]));
  const ids = recognised.map((r) => r.id as string);

  const orders = ids.length ? await listOrders({ ids, limit: 5000 }) : [];

  const byDateMap = new Map<string, { orderCount: number; grossSales: number }>();
  for (const r of recognised) {
    const date = jakartaDateString(new Date(r.recognised_at as string));
    const cur = byDateMap.get(date) ?? { orderCount: 0, grossSales: 0 };
    cur.orderCount += 1;
    cur.grossSales += (r.gross_amount as number) ?? 0;
    byDateMap.set(date, cur);
  }
  const byDate = [...byDateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));

  const statusCounts = new Map<OrderStatus, number>();
  const methodAgg = new Map<string, { count: number; grossSales: number }>();
  const productAgg = new Map<string, { quantity: number; grossSales: number }>();
  let grossSales = 0;

  for (const o of orders) {
    const gross = grossById.get(o.id) ?? o.total_amount;
    grossSales += gross;

    const status = o.status as OrderStatus;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    const method = o.payment_method ?? "—";
    const mCur = methodAgg.get(method) ?? { count: 0, grossSales: 0 };
    mCur.count += 1;
    mCur.grossSales += gross;
    methodAgg.set(method, mCur);

    for (const it of o.items) {
      const name = it.product?.name ?? "Produk";
      const pCur = productAgg.get(name) ?? { quantity: 0, grossSales: 0 };
      pCur.quantity += it.quantity;
      pCur.grossSales += it.subtotal;
      productAgg.set(name, pCur);
    }
  }

  return {
    period,
    label: range.label,
    startDate: range.startDate,
    endDate: range.endDate,
    generatedAt: new Date().toISOString(),
    totalOrders: orders.length,
    grossSales,
    averageOrderValue: orders.length ? Math.round(grossSales / orders.length) : 0,
    byDate,
    byStatus: ORDER_STATUSES.filter((s) => statusCounts.has(s)).map((status) => ({
      status,
      label: ORDER_STATUS_LABEL[status],
      count: statusCounts.get(status)!,
    })),
    byPaymentMethod: [...methodAgg.entries()]
      .sort((a, b) => b[1].grossSales - a[1].grossSales)
      .map(([method, v]) => ({
        method,
        label:
          method === "—" ? "—" : (PAYMENT_METHOD_LABEL[method as PaymentMethod] ?? method),
        ...v,
      })),
    topProducts: [...productAgg.entries()]
      .sort((a, b) => b[1].grossSales - a[1].grossSales)
      .map(([productName, v]) => ({ productName, ...v })),
  };
}
