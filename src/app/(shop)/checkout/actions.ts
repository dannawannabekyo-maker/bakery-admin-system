"use server";

import { revalidatePath } from "next/cache";

import { assertRole, getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder } from "@/lib/orders-server";
import { fail, ok, type ActionResult } from "@/lib/action-result";

export async function createCustomerOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await assertRole(["CUSTOMER", "ADMIN"]);

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
  return ok("Order created.", `/checkout/payment/${res.orderId}`);
}

/**
 * Simulated payment gateway. On "success" the order is flipped to PAID by the
 * system (service role) — which fires the stock-deduction trigger. On "fail"
 * nothing changes.
 */
export async function simulatePayment(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Please sign in again.");

  const orderId = String(formData.get("order_id") ?? "");
  const outcome = String(formData.get("outcome") ?? "success");
  const method = String(formData.get("method") ?? "SIMULATED_GATEWAY");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, total_amount, customer_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return fail("Order not found.");
  if (order.customer_id !== session.userId && session.profile.role !== "ADMIN") {
    return fail("This is not your order.");
  }
  if (order.status !== "UNPAID") {
    return fail(`This order is already ${order.status.toLowerCase()}.`);
  }

  if (outcome === "fail") {
    return fail(
      "Payment was declined by the gateway (simulated). You have not been charged — try again.",
    );
  }

  // Simulate gateway latency.
  await new Promise((r) => setTimeout(r, 600));

  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update({
      status: "PAID",
      payment_method: method,
      payment_receipt_url: `SIM-${order.order_number}-${Date.now()}`,
    })
    .eq("id", order.id);

  if (error) return fail(error.message);

  revalidatePath("/orders");
  revalidatePath(`/orders/${order.id}`);
  return ok("Payment successful.", `/orders/${order.id}?paid=1`);
}

export async function cancelMyOrder(formData: FormData): Promise<ActionResult> {
  await assertRole(["CUSTOMER", "ADMIN"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "CANCELLED" })
    .eq("id", String(formData.get("id")));
  if (error) return fail(error.message);
  revalidatePath("/orders");
  return ok("Order cancelled.");
}
