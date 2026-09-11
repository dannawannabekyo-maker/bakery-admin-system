import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_DAILY_PO_ITEM_CAPACITY,
  BAKERY_TZ,
} from "@/lib/constants";
import {
  addDaysStr,
  jakartaDateString,
  jakartaDayStartISO,
} from "@/lib/format";

/**
 * Night-shift production capacity.
 *
 * Production happens overnight, so the ceiling is the TOTAL QUANTITY of
 * pre-order items due for pickup/delivery on a given calendar date (Jakarta),
 * NOT the number of orders. Ready-stock items are sold from existing stock and
 * do not consume nightly capacity.
 */

export type DateLoad = {
  /** YYYY-MM-DD in Asia/Jakarta */
  date: string;
  capacity: number;
  committed: number;
  remaining: number;
  /** true when nothing more can be added that night */
  full: boolean;
};

/** Live nightly item ceiling from store_settings (falls back to the default). */
export async function getDailyCapacity(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_settings")
    .select("daily_po_item_capacity")
    .eq("id", 1)
    .maybeSingle();
  return data?.daily_po_item_capacity ?? DEFAULT_DAILY_PO_ITEM_CAPACITY;
}

/**
 * Committed pre-order item quantity per Jakarta pickup date, for `days` days
 * starting at `startDate` (YYYY-MM-DD). One query, aggregated in JS.
 */
export async function getDateLoads(
  startDate: string,
  days: number,
): Promise<DateLoad[]> {
  const admin = createAdminClient();
  const capacity = await getDailyCapacity();

  const startISO = jakartaDayStartISO(startDate);
  const endISO = jakartaDayStartISO(addDaysStr(startDate, days));

  const { data } = await admin
    .from("orders")
    .select("pickup_or_delivery_date, order_items(quantity)")
    .eq("order_type", "PRE_ORDER")
    .neq("status", "CANCELLED")
    .not("pickup_or_delivery_date", "is", null)
    .gte("pickup_or_delivery_date", startISO)
    .lt("pickup_or_delivery_date", endISO);

  const committedByDate = new Map<string, number>();
  for (const o of data ?? []) {
    const date = jakartaDateString(
      new Date(o.pickup_or_delivery_date as string),
    );
    const qty = ((o.order_items as { quantity: number }[] | null) ?? []).reduce(
      (sum, it) => sum + (it.quantity ?? 0),
      0,
    );
    committedByDate.set(date, (committedByDate.get(date) ?? 0) + qty);
  }

  const out: DateLoad[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysStr(startDate, i);
    const committed = committedByDate.get(date) ?? 0;
    const remaining = Math.max(capacity - committed, 0);
    out.push({ date, capacity, committed, remaining, full: remaining <= 0 });
  }
  return out;
}

/** Load for a single Jakarta date. */
export async function getDateLoad(date: string): Promise<DateLoad> {
  const [load] = await getDateLoads(date, 1);
  return load;
}

export type CapacityCheck =
  | { ok: true; load: DateLoad }
  | { ok: false; error: string; load: DateLoad };

/**
 * Server-side guard: can `addQty` pre-order items still be booked for the
 * Jakarta pickup date implied by `pickupISO`?
 */
export async function checkCapacity(
  pickupISO: string,
  addQty: number,
): Promise<CapacityCheck> {
  const date = jakartaDateString(new Date(pickupISO));
  const load = await getDateLoad(date);

  if (addQty <= load.remaining) return { ok: true, load };

  const human = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: BAKERY_TZ,
  }).format(new Date(pickupISO));

  return {
    ok: false,
    load,
    error:
      load.remaining <= 0
        ? `Kuota pre-order untuk ${human} sudah penuh (maks ${load.capacity} pcs/malam).`
        : `Sisa kuota pre-order ${human} tinggal ${load.remaining} pcs, sedangkan pesanan ini butuh ${addQty} pcs.`,
  };
}
