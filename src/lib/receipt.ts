import "server-only";

import { getOrder, getStoreSettings, type OrderWithRelations } from "@/lib/data";
import { taxBreakdown, type TaxBreakdown } from "@/lib/format";
import { poInstructionLines, type ReceiptSettings } from "@/lib/receipt-shared";
import {
  PAYMENT_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  type PaymentMethod,
} from "@/lib/constants";

/**
 * One shared receipt model. Used by:
 *   - the public/print "nota" page (`/receipt/[orderId]`)
 *   - the WhatsApp receipt message (same content, sent as a link + summary)
 * so the in-store printed nota and the WhatsApp nota never drift apart.
 *
 * `settings` mirrors the same global toggles the admin PDF/WhatsApp generator
 * reads (`@/lib/receipt-client`'s `ReceiptSettings`) so every receipt surface
 * shows or hides tax/logo/PO instructions identically.
 */
export type ReceiptData = {
  order: OrderWithRelations;
  tax: TaxBreakdown;
  paymentLabel: string;
  statusLabel: string;
  settings: ReceiptSettings;
  poLines: string[];
};

export async function getReceiptData(
  orderId: string,
): Promise<ReceiptData | null> {
  const [order, storeSettings] = await Promise.all([
    getOrder(orderId, { admin: true }),
    getStoreSettings(),
  ]);
  if (!order) return null;

  const settings: ReceiptSettings = {
    showTax: storeSettings.show_tax_on_receipt,
    showLogo: storeSettings.show_logo_on_receipt,
    showPoInstructions: storeSettings.show_po_instructions,
    taxRate: storeSettings.tax_rate,
    logoUrl: storeSettings.receipt_logo_url,
  };

  const tax = taxBreakdown(order.total_amount, settings.taxRate);
  const paymentLabel = order.payment_method
    ? (PAYMENT_METHOD_LABEL[order.payment_method as PaymentMethod] ??
      order.payment_method)
    : "Belum ditentukan";
  const poLines = settings.showPoInstructions ? poInstructionLines(order) : [];

  return {
    order,
    tax,
    paymentLabel,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    settings,
    poLines,
  };
}
