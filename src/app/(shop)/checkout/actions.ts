"use server";

import { revalidatePath } from "next/cache";

import { assertRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/orders-server";
import { logAudit } from "@/lib/audit";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { PAYMENT_METHODS, STORAGE_BUCKETS } from "@/lib/constants";

export async function createCustomerOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["CUSTOMER", "ADMIN"]);

  let items: { productId: string; quantity: number }[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return fail("Could not read your cart.");
  }
  if (items.length === 0) return fail("Your cart is empty.");

  const pickupRaw = String(formData.get("pickup_or_delivery_date") ?? "").trim();

  const res = await createOrder({
    customerId: userId,
    createdBy: userId,
    items,
    pickupDate: pickupRaw ? new Date(pickupRaw).toISOString() : null,
  });
  if (!res.ok) return fail(res.error);

  revalidatePath("/orders");
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_PLACE",
    entityType: "order",
    entityId: res.orderId,
    summary: `${profile.full_name || "Customer"} placed order ${res.orderNumber}`,
  });
  return ok("Order created.", `/checkout/payment/${res.orderId}`);
}

/**
 * Customer records an out-of-band payment: uploads a screenshot/photo of the
 * QRIS or bank-transfer proof. The order stays UNPAID with `payment_submitted_at`
 * set — Sales/Admin verify the proof and flip it to PAID.
 */
export async function submitPaymentProof(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["CUSTOMER", "ADMIN"]);

  const orderId = String(formData.get("order_id") ?? "");
  const method = String(formData.get("method") ?? "");
  const proof = formData.get("proof") as File | null;

  if (!orderId) return fail("Order tidak ditemukan.");
  if (!PAYMENT_METHODS.includes(method as never)) {
    return fail("Pilih metode pembayaran.");
  }
  if (!proof || proof.size === 0) {
    return fail("Unggah bukti pembayaran dulu.");
  }
  if (!proof.type.startsWith("image/")) {
    return fail("Bukti pembayaran harus berupa gambar.");
  }
  if (proof.size > 5 * 1024 * 1024) {
    return fail("Ukuran gambar maksimal 5 MB.");
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, customer_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return fail("Order tidak ditemukan.");
  if (order.customer_id !== userId && profile.role !== "ADMIN") {
    return fail("Ini bukan order Anda.");
  }
  if (order.status !== "UNPAID") {
    return fail("Order ini sudah tidak menunggu pembayaran.");
  }

  const ext = proof.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${orderId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKETS.paymentReceipts)
    .upload(path, proof, { upsert: true, contentType: proof.type });
  if (upErr) return fail(`Gagal mengunggah bukti: ${upErr.message}`);

  const { error } = await supabase
    .from("orders")
    .update({
      payment_method: method,
      payment_receipt_url: path,
      payment_submitted_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return fail(error.message);

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "PAYMENT_PROOF_SUBMIT",
    entityType: "order",
    entityId: orderId,
    summary: `${profile.full_name || "Customer"} submitted a ${method} payment proof for order ${orderId}`,
  });
  return ok(
    "Bukti pembayaran terkirim. Menunggu verifikasi.",
    `/orders/${orderId}?submitted=1`,
  );
}

export async function cancelMyOrder(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["CUSTOMER", "ADMIN"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: "CANCELLED" })
    .eq("id", id)
    .select("order_number")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidatePath("/orders");
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_CANCEL",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Customer"} cancelled order ${updated?.order_number ?? id}`,
  });
  return ok("Order cancelled.");
}
