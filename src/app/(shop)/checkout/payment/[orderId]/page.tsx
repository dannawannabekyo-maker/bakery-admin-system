import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrder } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, Alert } from "@/components/ui";
import { PaymentForm } from "./payment-form";

export const metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) notFound();

  if (order.status !== "UNPAID") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Alert tone="info">
          Order <strong>{order.order_number}</strong> is already{" "}
          {order.status.toLowerCase()}.
        </Alert>
        <Link href={`/orders/${order.id}`} className="text-primary underline">
          View order status →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment</h1>
        <p className="text-sm text-foreground/60">
          Simulated gateway — no real card is charged.
        </p>
      </div>

      <Card className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-foreground/60">Order</span>
          <span className="font-medium">{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground/60">Type</span>
          <span>{order.order_type === "PRE_ORDER" ? "Pre-order" : "Ready stock"}</span>
        </div>
        {order.pickup_or_delivery_date && (
          <div className="flex justify-between">
            <span className="text-foreground/60">Pickup / delivery</span>
            <span>{formatDateTime(order.pickup_or_delivery_date)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>Amount due</span>
          <span>{formatCurrency(order.total_amount)}</span>
        </div>
      </Card>

      <PaymentForm orderId={order.id} amount={order.total_amount} />
    </div>
  );
}
