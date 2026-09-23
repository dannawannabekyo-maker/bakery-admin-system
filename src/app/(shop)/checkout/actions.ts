"use server";

import { revalidatePath } from "next/cache";

import { assertRole, getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder } from "@/lib/orders-server";
import { getStoreSettings } from "@/lib/data";
import { storeClosedMessage } from "@/lib/store-status";
import { logAudit } from "@/lib/audit";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { PAYMENT_METHODS, STORAGE_BUCKETS } from "@/lib/constants";
import { normalizePhone } from "@/lib/format";

export async function createCustomerOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["CUSTOMER", "ADMIN"]);

  const closedMessage = storeClosedMessage(await getStoreSettings());
  if (closedMessage) return fail(closedMessage);

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
 * Guest checkout — no account required. Lands in the same Incoming Orders
 * queue as any other order (staff already see every order regardless of
 * customer_id); the guest's own copy of the order is the unguessable
 * order-id link (nota + payment page), same trust model as `/receipt/[id]`.
 */
export async function createGuestOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const closedMessage = storeClosedMessage(await getStoreSettings());
  if (closedMessage) return fail(closedMessage);

  const name = String(formData.get("guest_name") ?? "").trim();
  if (!name) return fail("Nama wajib diisi.");
  if (name.length > 80) return fail("Nama terlalu panjang.");

  const phone = normalizePhone(formData.get("guest_phone"));
  if (!phone) return fail("Nomor HP tidak valid.");

  let items: { productId: string; quantity: number }[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return fail("Keranjang tidak terbaca.");
  }
  if (items.length === 0) return fail("Keranjang masih kosong.");

  const pickupRaw = String(formData.get("pickup_or_delivery_date") ?? "").trim();

  const res = await createOrder({
    guestName: name,
    guestPhone: phone,
    items,
    pickupDate: pickupRaw ? new Date(pickupRaw).toISOString() : null,
    privileged: true, // no session to bind RLS to — same pattern as Sales' manual orders
  });
  if (!res.ok) return fail(res.error);

  await logAudit({
    actorId: null,
    actorName: name,
    actorRole: null,
    action: "ORDER_PLACE",
    entityType: "order",
    entityId: res.orderId,
    summary: `Guest ${name} placed order ${res.orderNumber}`,
  });
  return ok("Order created.", `/checkout/payment/${res.orderId}`);
}

/**
 * Records an out-of-band payment: uploads a screenshot/photo of the QRIS or
 * bank-transfer proof. The order stays UNPAID with `payment_submitted_at`
 * set — Sales/Admin verify the proof and flip it to PAID.
 *
 * Works for a logged-in customer (must own the order) and for a guest order
 * (no login — the order id itself, from the link they were given, is the
 * capability; same trust model as the public `/receipt/[orderId]` nota).
 * Uses the service-role client throughout since a guest has no RLS access at
 * all — ownership is checked explicitly below before any write.
 */
export async function submitPaymentProof(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();

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

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, status, customer_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return fail("Order tidak ditemukan.");

  const isGuestOrder = order.customer_id === null;
  const isOwner = session && order.customer_id === session.userId;
  const isStaff = session && session.profile.role === "ADMIN";
  if (!isGuestOrder && !isOwner && !isStaff) {
    return fail("Ini bukan order Anda.");
  }
  if (order.status !== "UNPAID") {
    return fail("Order ini sudah tidak menunggu pembayaran.");
  }

  const ext = proof.name.split(".").pop()?.toLowerCase() || "jpg";
  const ownerSegment = session?.userId ?? "guest";
  const path = `${ownerSegment}/${orderId}-${Date.now()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from(STORAGE_BUCKETS.paymentReceipts)
    .upload(path, proof, { upsert: true, contentType: proof.type });
  if (upErr) return fail(`Gagal mengunggah bukti: ${upErr.message}`);

  const { error } = await admin
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
  revalidatePath(`/checkout/payment/${orderId}`);
  const actorName = session?.profile.full_name || (isGuestOrder ? "Guest" : "Customer");
  await logAudit({
    actorId: session?.userId ?? null,
    actorName,
    actorRole: session?.profile.role ?? null,
    action: "PAYMENT_PROOF_SUBMIT",
    entityType: "order",
    entityId: orderId,
    summary: `${actorName} submitted a ${method} payment proof for order ${orderId}`,
  });
  return ok(
    "Bukti pembayaran terkirim. Menunggu verifikasi.",
    session ? `/orders/${orderId}?submitted=1` : `/checkout/payment/${orderId}`,
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
