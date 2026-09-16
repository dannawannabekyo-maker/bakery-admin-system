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
