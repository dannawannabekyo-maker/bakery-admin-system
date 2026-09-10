import Link from "next/link";

import { listOrders, getReceiptSignedUrl } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, StatusBadge, Badge, EmptyState } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/form";
import { PageHeader } from "@/components/dashboard-shell";
import { asFormAction } from "@/lib/action-result";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/constants";
import { salesMarkPaid, salesCancelOrder, salesRejectPayment } from "./actions";
import type { OrderWithRelations } from "@/lib/data";

export const metadata = { title: "Incoming Orders" };
export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const orders = await listOrders({ limit: 200 });
  const unpaid = orders.filter((o) => o.status === "UNPAID");
  const needsVerification = unpaid.filter((o) => o.payment_submitted_at);
  const awaitingPayment = unpaid.filter((o) => !o.payment_submitted_at);
  const active = orders.filter((o) =>
    ["PAID", "IN_PRODUCTION", "READY"].includes(o.status),
  );
  const done = orders.filter((o) =>
    ["COMPLETED", "CANCELLED"].includes(o.status),
  );

  const receiptUrls = Object.fromEntries(
    await Promise.all(
      needsVerification.map(
        async (o) =>
          [o.id, await getReceiptSignedUrl(o.payment_receipt_url)] as const,
      ),
    ),
  );

  return (
    <>
      <PageHeader
        title="Incoming Orders"
        description="Verify payment proofs, confirm offline payments, cancel abandoned carts."
        action={
          <Link
            href="/sales/orders/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            + Manual order
          </Link>
        }
      />

      <Section title={`Perlu verifikasi (${needsVerification.length})`}>
        {needsVerification.length === 0 ? (
          <EmptyState title="Tidak ada bukti yang menunggu verifikasi" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {needsVerification.map((o) => (
              <Card key={o.id} className="space-y-2">
                <OrderHead o={o} />
                <p className="text-sm text-foreground/60">
                  {o.customer?.full_name} ·{" "}
                  {o.customer?.phone_number ?? "no phone"}
                </p>
                <p className="text-sm">
                  Metode:{" "}
                  <strong>
                    {PAYMENT_METHOD_LABEL[o.payment_method as PaymentMethod] ??
                      o.payment_method ??
                      "—"}
                  </strong>{" "}
                  · dikirim{" "}
                  {o.payment_submitted_at
                    ? formatDateTime(o.payment_submitted_at)
                    : "—"}
                </p>
                {receiptUrls[o.id] ? (
                  <a
                    href={receiptUrls[o.id]!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm font-medium text-primary underline"
                  >
                    Lihat bukti pembayaran →
                  </a>
                ) : (
                  <p className="text-sm text-foreground/50">
                    Bukti tidak tersedia
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <form action={asFormAction(salesMarkPaid)}>
                    <input type="hidden" name="id" value={o.id} />
                    <SubmitButton size="sm" pendingText="…">
                      Konfirmasi Lunas
                    </SubmitButton>
                  </form>
                  <form action={asFormAction(salesRejectPayment)}>
                    <input type="hidden" name="id" value={o.id} />
                    <ConfirmButton
                      message={`Tolak bukti pembayaran untuk ${o.order_number}?`}
                      variant="outline"
                    >
                      Tolak bukti
                    </ConfirmButton>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Belum bayar (${awaitingPayment.length})`}>
        {awaitingPayment.length === 0 ? (
          <EmptyState title="Nothing awaiting payment" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {awaitingPayment.map((o) => (
              <Card key={o.id} className="space-y-2">
                <OrderHead o={o} />
                <p className="text-sm">
                  {o.customer?.full_name} ·{" "}
                  {o.customer?.phone_number ?? "no phone"}
                </p>
                <p className="text-sm text-foreground/60">
                  {o.items.length} item(s) · {formatDateTime(o.created_at)}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <form
                    action={asFormAction(salesMarkPaid)}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={o.id} />
                    <input
                      name="payment_method"
                      placeholder="TUNAI"
                      className="h-9 w-28 rounded border border-border bg-background px-2 text-sm"
                    />
                    <SubmitButton size="sm" pendingText="…">
                      Tandai Lunas
                    </SubmitButton>
                  </form>
                  <form action={asFormAction(salesCancelOrder)}>
                    <input type="hidden" name="id" value={o.id} />
                    <ConfirmButton message={`Cancel ${o.order_number}?`}>
                      Cancel
                    </ConfirmButton>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title={`In progress (${active.length})`}>
        <OrdersTable rows={active} />
      </Section>

      <Section title={`Closed (${done.length})`}>
        <OrdersTable rows={done} />
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
        {title}
      </h2>
      {children}
    </section>
  );
}

function OrderHead({ o }: { o: OrderWithRelations }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold">{o.order_number}</span>
      <div className="flex items-center gap-2">
        {o.order_type === "PRE_ORDER" && (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300">
            Pre-order
          </Badge>
        )}
        <StatusBadge status={o.status} />
      </div>
    </div>
  );
}

function OrdersTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listOrders>>;
}) {
  if (rows.length === 0)
    return <p className="text-sm text-foreground/50">Nothing here yet.</p>;

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((o) => (
          <Card key={o.id} className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{o.order_number}</span>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-foreground/60">{o.customer?.full_name ?? "—"}</p>
            <div className="flex items-center justify-between">
              <span className="text-foreground/60">
                {o.pickup_or_delivery_date
                  ? formatDateTime(o.pickup_or_delivery_date)
                  : "—"}
              </span>
              <span className="font-semibold">
                {formatCurrency(o.total_amount)}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop: table */}
      <Card className="hidden overflow-x-auto p-0 md:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-border text-left text-foreground/60">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Fulfil</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-border">
                <td className="p-3 font-medium">{o.order_number}</td>
                <td className="p-3">{o.customer?.full_name ?? "—"}</td>
                <td className="p-3">
                  {o.pickup_or_delivery_date
                    ? formatDateTime(o.pickup_or_delivery_date)
                    : "—"}
                </td>
                <td className="p-3">{formatCurrency(o.total_amount)}</td>
                <td className="p-3">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
