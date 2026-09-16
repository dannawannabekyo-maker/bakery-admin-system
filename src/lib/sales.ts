import "server-only";

import { listOrders } from "@/lib/data";
import { periodRange } from "@/lib/format";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  PAYMENT_METHOD_LABEL,
  type FinancePeriod,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/constants";

/**
 * Sales-facing recap: order counts and item quantities only. Deliberately
 * never reads `total_amount` — revenue/financial totals are Finance/Admin
 * territory (`@/lib/finance`'s `getRecap`), Sales only needs to know what
 * was taken and what to hand over to the kitchen.
 */
export type SalesRecap = {
  period: FinancePeriod;
  label: string;
  startDate: string;
  endDate: string;
  orderCount: number;
  byStatus: { status: OrderStatus; label: string; count: number }[];
  byPaymentMethod: { method: string; label: string; count: number }[];
  itemsSold: { productName: string; quantity: number }[];
};

export async function getSalesRecap(
  period: FinancePeriod,
  anchor?: string,
): Promise<SalesRecap> {
  const range = periodRange(period, anchor);
  const orders = await listOrders({
    from: range.startISO,
    to: range.endISO,
    limit: 1000,
  });

  const statusCounts = new Map<OrderStatus, number>();
  const methodCounts = new Map<string, number>();
  const itemCounts = new Map<string, number>();

  for (const o of orders) {
    const status = o.status as OrderStatus;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    const method = o.payment_method ?? "—";
    methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);

    for (const it of o.items) {
      const name = it.product?.name ?? "Produk";
      itemCounts.set(name, (itemCounts.get(name) ?? 0) + it.quantity);
    }
  }

  return {
    period,
    label: range.label,
    startDate: range.startDate,
    endDate: range.endDate,
    orderCount: orders.length,
    byStatus: ORDER_STATUSES.filter((s) => statusCounts.has(s)).map((status) => ({
      status,
      label: ORDER_STATUS_LABEL[status],
      count: statusCounts.get(status)!,
    })),
    byPaymentMethod: [...methodCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([method, count]) => ({
        method,
        label:
          method === "—" ? "—" : (PAYMENT_METHOD_LABEL[method as PaymentMethod] ?? method),
        count,
      })),
    itemsSold: [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([productName, quantity]) => ({ productName, quantity })),
  };
}
