/**
 * Order contact display helpers — no "server-only" (unlike @/lib/data),
 * since these are needed from the client-side PDF/WA generator
 * (@/lib/receipt-client) as well as ordinary server components. A guest
 * checkout order has no linked profile, so these fall back to the
 * guest_name/guest_phone captured at checkout.
 */

type OrderContact = {
  customer: { full_name: string } | null;
  guest_name: string | null;
};

type OrderContactPhone = {
  customer: { phone_number: string | null } | null;
  guest_phone: string | null;
};

export function orderContactName(order: OrderContact): string {
  return order.customer?.full_name || order.guest_name || "—";
}

export function orderContactPhone(order: OrderContactPhone): string | null {
  return order.customer?.phone_number || order.guest_phone || null;
}
