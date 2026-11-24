import { formatDate, formatTime } from "@/lib/format";
import type { OrderWithRelations } from "@/lib/data";

/**
 * Single source of truth for the global receipt display toggles (Finance ->
 * Receipt Settings). Every surface that renders a receipt — the admin
 * PDF/WhatsApp generator (`@/lib/receipt-client`) and the public/customer
 * nota page (`/receipt/[orderId]`) — reads settings shaped like this so they
 * can never drift apart.
 */
export type ReceiptSettings = {
  storeName: string;
  showTax: boolean;
  showLogo: boolean;
  showPoInstructions: boolean;
  taxRate: number;
  /** Admin-uploaded brand logo (Admin > Appearance). Null -> fall back to /logo.svg. */
  logoUrl: string | null;
};

/**
 * Add-ons (paket / bingkisan) the staff chose to show on the nota. Hidden
 * ones still count in the order total — they are only left off the printout.
 */
export function visibleAddons(order: OrderWithRelations) {
  return (order.addons ?? []).filter((a) => a.show_on_receipt);
}

/** "Isi: 2x Brownies, 1x Cookies" — null when the add-on has no listed contents. */
export function addonContentsText(addon: OrderWithRelations["addons"][number]): string | null {
  const parts = (addon.contents ?? []).map((c) => `${c.quantity}x ${c.name}`);
  return parts.length ? `Isi: ${parts.join(", ")}` : null;
}

/**
 * PO waiting-time instructions, shared verbatim between the PDF, the
 * WhatsApp text, and the on-screen nota. Empty for READY_STOCK orders (no
 * pickup/delivery date).
 */
export function poInstructionLines(order: OrderWithRelations): string[] {
  if (!order.pickup_or_delivery_date) return [];
  const start = new Date(order.pickup_or_delivery_date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return [
    "PO Waiting Time Instructions:",
    `Your order will be ready for pickup on ${formatDate(start)}.`,
    `Please collect it between ${formatTime(start)} and ${formatTime(end)}.`,
  ];
}
