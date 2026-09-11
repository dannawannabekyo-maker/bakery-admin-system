import "server-only";

import { getOrder, type OrderWithRelations } from "@/lib/data";
import { getFinanceSettings } from "@/lib/finance";
import { taxBreakdown, type TaxBreakdown } from "@/lib/format";
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
 */
export type ReceiptData = {
  order: OrderWithRelations;
  tax: TaxBreakdown;
  paymentLabel: string;
  statusLabel: string;
};

export async function getReceiptData(
  orderId: string,
): Promise<ReceiptData | null> {
  const [order, { taxRate }] = await Promise.all([
    getOrder(orderId, { admin: true }),
    getFinanceSettings(),
  ]);
  if (!order) return null;

  const tax = taxBreakdown(order.total_amount, taxRate);
  const paymentLabel = order.payment_method
    ? (PAYMENT_METHOD_LABEL[order.payment_method as PaymentMethod] ??
      order.payment_method)
    : "Belum ditentukan";

  return {
    order,
    tax,
    paymentLabel,
    statusLabel: ORDER_STATUS_LABEL[order.status],
  };
}
