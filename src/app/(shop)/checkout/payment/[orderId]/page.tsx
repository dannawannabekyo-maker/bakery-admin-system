import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrder, getStoreSettings } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, Alert } from "@/components/ui";
import { PaymentForm } from "./payment-form";

export const metadata = { title: "Pembayaran" };
export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const [{ userId }, order, settings] = await Promise.all([
    requireSession(`/checkout/payment/${orderId}`),
    getOrder(orderId),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const backToOrder = (
    <Link href={`/orders/${order.id}`} className="text-primary underline">
      Lihat status order →
    </Link>
  );

  if (order.status !== "UNPAID") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Alert tone="info">
          Order <strong>{order.order_number}</strong> sudah{" "}
          {order.status.toLowerCase()}.
        </Alert>
        {backToOrder}
      </div>
    );
  }

  if (order.payment_submitted_at) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Alert tone="success">
          Bukti pembayaran untuk <strong>{order.order_number}</strong> sudah
          dikirim pada {formatDateTime(order.payment_submitted_at)}. Menunggu
          verifikasi admin.
        </Alert>
        {backToOrder}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pembayaran</h1>
        <p className="text-sm text-foreground/60">
          Bayar lewat QRIS atau transfer bank, lalu unggah bukti pembayaran.
        </p>
      </div>

      <Card className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-foreground/60">Order</span>
          <span className="font-medium">{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground/60">Jenis</span>
          <span>
            {order.order_type === "PRE_ORDER" ? "Pre-order" : "Ready stock"}
          </span>
        </div>
        {order.pickup_or_delivery_date && (
          <div className="flex justify-between">
            <span className="text-foreground/60">Ambil / kirim</span>
            <span>{formatDateTime(order.pickup_or_delivery_date)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
          <span>Total bayar</span>
          <span>{formatCurrency(order.total_amount)}</span>
        </div>
      </Card>

      <PaymentForm
        orderId={order.id}
        amount={order.total_amount}
        settings={{
          qris_image_url: settings.qris_image_url,
          qris_merchant_name: settings.qris_merchant_name,
          bank_name: settings.bank_name,
          bank_account_number: settings.bank_account_number,
          bank_account_holder: settings.bank_account_holder,
          payment_note: settings.payment_note,
        }}
      />
    </div>
  );
}
