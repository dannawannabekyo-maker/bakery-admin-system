import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysStr, jakartaDateString, jakartaDayStartISO } from "@/lib/format";
import { orderContactName } from "@/lib/order-contact";
import type { OrderStatus } from "@/lib/constants";

/** Orders in these statuses are actually going to be baked — matches the kanban. */
const PRODUCTION_STATUSES: OrderStatus[] = ["PAID", "IN_PRODUCTION", "READY"];

type RawNightOrder = {
  id: string;
  order_number: string;
  status: OrderStatus;
  pickup_or_delivery_date: string;
  customer: { full_name: string } | null;
  guest_name: string | null;
  items: { quantity: number; product: { id: string; name: string } | null }[] | null;
};

async function fetchNightOrders(
  startDate: string,
  days: number,
): Promise<RawNightOrder[]> {
  const admin = createAdminClient();
  const startISO = jakartaDayStartISO(startDate);
  const endISO = jakartaDayStartISO(addDaysStr(startDate, days));

  const { data } = await admin
    .from("orders")
    .select(
      "id, order_number, status, pickup_or_delivery_date, guest_name, customer:profiles!orders_customer_id_fkey(full_name), items:order_items(quantity, product:products(id,name))",
    )
    .eq("order_type", "PRE_ORDER")
    .in("status", PRODUCTION_STATUSES)
    .gte("pickup_or_delivery_date", startISO)
    .lt("pickup_or_delivery_date", endISO)
    .order("order_number");

  return (data ?? []) as unknown as RawNightOrder[];
}

/* --------------------------------------------------------- date selector */

export type NightDateSummary = {
  date: string;
  orderCount: number;
  totalItems: number;
};

/** Which of the next `days` Jakarta dates actually have pre-orders to bake. */
export async function listNightDates(
  startDate: string,
  days: number,
): Promise<NightDateSummary[]> {
  const rows = await fetchNightOrders(startDate, days);
  const byDate = new Map<string, NightDateSummary>();

  for (const o of rows) {
    const date = jakartaDateString(new Date(o.pickup_or_delivery_date));
    const entry = byDate.get(date) ?? { date, orderCount: 0, totalItems: 0 };
    entry.orderCount += 1;
    entry.totalItems += (o.items ?? []).reduce((s, it) => s + it.quantity, 0);
    byDate.set(date, entry);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------------------------------------------------------------- board */

export type NightOrderLine = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  qty: number;
  status: OrderStatus;
};

export type NightProductLine = {
  productId: string;
  productName: string;
  totalQty: number;
  lines: NightOrderLine[];
};

export type NightBoard = {
  date: string;
  totalItems: number;
  orderCount: number;
  products: NightProductLine[];
};

/**
 * Option B "split recap" for one Jakarta pickup date:
 *   - aggregate total per product ("Total Sourdough: 50 pcs")
 *   - breakdown per order right underneath, for packing/labelling.
 */
export async function getNightBoard(date: string): Promise<NightBoard> {
  const rows = await fetchNightOrders(date, 1);

  const byProduct = new Map<string, NightProductLine>();
  const orderIds = new Set<string>();
  let totalItems = 0;

  for (const o of rows) {
    orderIds.add(o.id);
    for (const it of o.items ?? []) {
      if (!it.product) continue;
      let line = byProduct.get(it.product.id);
      if (!line) {
        line = {
          productId: it.product.id,
          productName: it.product.name,
          totalQty: 0,
          lines: [],
        };
        byProduct.set(it.product.id, line);
      }
      line.totalQty += it.quantity;
      line.lines.push({
        orderId: o.id,
        orderNumber: o.order_number,
        customerName: orderContactName(o),
        qty: it.quantity,
        status: o.status,
      });
      totalItems += it.quantity;
    }
  }

  for (const line of byProduct.values()) {
    line.lines.sort((a, b) => b.qty - a.qty);
  }

  return {
    date,
    totalItems,
    orderCount: orderIds.size,
    products: [...byProduct.values()].sort((a, b) => b.totalQty - a.totalQty),
  };
}
