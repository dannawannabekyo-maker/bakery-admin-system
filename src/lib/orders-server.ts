import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCapacity } from "@/lib/capacity";
import type { Database } from "@/lib/supabase/database.types";
import type { OrderType } from "@/lib/constants";

export type NewOrderItem = { productId: string; quantity: number };

export type CreateOrderInput = {
  /** Either customerId, or both guestName + guestPhone — never neither. */
  customerId?: string;
  createdBy?: string;
  /** Login-free guest checkout — set together, only when customerId is omitted. */
  guestName?: string;
  guestPhone?: string;
  items: NewOrderItem[];
  pickupDate?: string | null;
  adminNotes?: string | null;
  /** Use the service-role client (Admin / Sales server flows, and guest checkout — no session to bind RLS to). */
  privileged?: boolean;
  /** ADMIN-only escape hatch to force a booking past the nightly capacity. */
  bypassCapacity?: boolean;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string; total: number; orderType: OrderType }
  | { ok: false; error: string };

type DB = SupabaseClient<Database>;

/**
 * Validates stock/pricing, decides READY_STOCK vs PRE_ORDER, and writes the
 * order + items in the UNPAID state. Stock is only deducted later, by the
 * DB trigger, when the order becomes PAID.
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const supabase: DB = input.privileged
    ? (createAdminClient() as unknown as DB)
    : ((await createClient()) as unknown as DB);

  if (!input.customerId && !(input.guestName && input.guestPhone)) {
    return { ok: false, error: "Missing customer — need an account or a guest name + phone." };
  }

  const cleanItems = input.items
    .map((i) => ({ productId: i.productId, quantity: Math.floor(i.quantity) }))
    .filter((i) => i.productId && i.quantity > 0);

  if (cleanItems.length === 0) return { ok: false, error: "Your cart is empty." };

  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("id,name,price,stock,is_preorder,is_active")
    .in(
      "id",
      cleanItems.map((i) => i.productId),
    );

  if (pErr) return { ok: false, error: pErr.message };
  if (!products || products.length !== cleanItems.length) {
    return { ok: false, error: "One or more products are no longer available." };
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  let hasPreorder = false;
  let total = 0;
  let poQty = 0;
  const itemRows: {
    product_id: string;
    quantity: number;
    price_at_time: number;
    subtotal: number;
  }[] = [];

  for (const item of cleanItems) {
    const p = byId.get(item.productId)!;
    if (!p.is_active) {
      return { ok: false, error: `"${p.name}" is not available.` };
    }
    if (p.is_preorder) {
      hasPreorder = true;
      poQty += item.quantity;
    } else if (p.stock < item.quantity) {
      return {
        ok: false,
        error: `Not enough stock for "${p.name}" (only ${p.stock} left).`,
      };
    }
    const subtotal = p.price * item.quantity;
    total += subtotal;
    itemRows.push({
      product_id: p.id,
      quantity: item.quantity,
      price_at_time: p.price,
      subtotal,
    });
  }

  const orderType: OrderType = hasPreorder ? "PRE_ORDER" : "READY_STOCK";

  if (orderType === "PRE_ORDER") {
    if (!input.pickupDate) {
      return { ok: false, error: "Pick a pickup / delivery date for pre-order items." };
    }
    if (new Date(input.pickupDate).getTime() < Date.now()) {
      return { ok: false, error: "The pickup / delivery date must be in the future." };
    }

    // Nightly production ceiling — total pre-order ITEM quantity per pickup
    // date, not order count. ADMIN can force a booking past capacity.
    if (!input.bypassCapacity) {
      const capacity = await checkCapacity(input.pickupDate, poQty);
      if (!capacity.ok) return { ok: false, error: capacity.error };
    }
  }

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      customer_id: input.customerId ?? null,
      created_by: input.createdBy ?? null,
      guest_name: input.guestName ?? null,
      guest_phone: input.guestPhone ?? null,
      order_type: orderType,
      status: "UNPAID",
      pickup_or_delivery_date: input.pickupDate ?? null,
      total_amount: total,
      admin_notes: input.adminNotes ?? null,
    })
    .select("id, order_number")
    .single();

  if (oErr || !order) {
    return { ok: false, error: oErr?.message ?? "Could not create the order." };
  }

  const { error: iErr } = await supabase.from("order_items").insert(
    itemRows.map((r) => ({ ...r, order_id: order.id })),
  );

  if (iErr) {
    // best-effort rollback of the header
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: iErr.message };
  }

  await supabase.rpc("recalc_order_total", { p_order_id: order.id });

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number,
    total,
    orderType,
  };
}
