"use server";

import { revalidatePath } from "next/cache";

import { assertRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/orders-server";
import { logAudit } from "@/lib/audit";
import { fail, ok, type ActionResult } from "@/lib/action-result";

function revalidateSales() {
  revalidatePath("/sales", "layout");
}

export async function salesCreateManualOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["SALES", "SALES_MANAGER", "ADMIN"]);

  const customerId = String(formData.get("customer_id") ?? "");
  if (!customerId) return fail("Choose a customer.");

  let items: { productId: string; quantity: number }[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return fail("Malformed items payload.");
  }

  const pickupRaw = String(formData.get("pickup_or_delivery_date") ?? "").trim();
  const res = await createOrder({
    customerId,
    createdBy: userId,
    items,
    pickupDate: pickupRaw ? new Date(pickupRaw).toISOString() : null,
    adminNotes: String(formData.get("admin_notes") ?? "").trim() || null,
    privileged: false, // RLS lets SALES insert their own orders
  });
  if (!res.ok) return fail(res.error);

  if (formData.get("mark_paid") === "on") {
    const supabase = await createClient();
    const { error } = await supabase
      .from("orders")
      .update({
        status: "PAID",
        payment_method: String(formData.get("payment_method") ?? "OFFLINE"),
        payment_receipt_url: `MANUAL-${res.orderNumber}`,
      })
      .eq("id", res.orderId);
    if (error) return fail(`Order created but marking paid failed: ${error.message}`);
  }

  revalidateSales();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_MANUAL_CREATE",
    entityType: "order",
    entityId: res.orderId,
    summary: `${profile.full_name || "Sales"} created manual order ${res.orderNumber}`,
  });
  return ok(`Order ${res.orderNumber} created.`, `/sales`);
}

export async function salesMarkPaid(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["SALES", "SALES_MANAGER", "ADMIN"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));

  // Optional — only supplied from the "no proof yet" manual card.
  const method = String(formData.get("payment_method") ?? "").trim();
  const patch: { status: "PAID"; payment_method?: string } = { status: "PAID" };
  if (method) patch.payment_method = method;

  const { data: updated, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("order_number")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidateSales();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_MARK_PAID",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Sales"} marked order ${updated?.order_number ?? id} as PAID`,
  });
  return ok("Order ditandai lunas.");
}

/** Reject a submitted proof: order returns to "awaiting payment" (still UNPAID). */
export async function salesRejectPayment(
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["SALES", "SALES_MANAGER", "ADMIN"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      payment_submitted_at: null,
      payment_receipt_url: null,
      payment_method: null,
    })
    .eq("id", id)
    .select("order_number")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidateSales();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "PAYMENT_PROOF_REJECT",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Sales"} rejected payment proof for order ${updated?.order_number ?? id}`,
  });
  return ok("Bukti pembayaran ditolak.");
}

export async function salesCancelOrder(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["SALES", "SALES_MANAGER", "ADMIN"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: "CANCELLED" })
    .eq("id", id)
    .select("order_number")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidateSales();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_CANCEL",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Sales"} cancelled order ${updated?.order_number ?? id}`,
  });
  return ok("Order cancelled.");
}
