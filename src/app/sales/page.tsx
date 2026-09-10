import Link from "next/link";

import { listOrders } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, StatusBadge, Badge, EmptyState } from "@/components/ui";
import { ConfirmButton, SubmitButton } from "@/components/form";
import { PageHeader } from "@/components/dashboard-shell";
import { asFormAction } from "@/lib/action-result";
import { salesMarkPaid, salesCancelOrder } from "./actions";

export const metadata = { title: "Incoming Orders" };
export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const orders = await listOrders({ limit: 200 });
  const unpaid = orders.filter((o) => o.status === "UNPAID");
  const active = orders.filter((o) =>
    ["PAID", "IN_PRODUCTION", "READY"].includes(o.status),
  );
  const done = orders.filter((o) =>
    ["COMPLETED", "CANCELLED"].includes(o.status),
  );

  return (
    <>
      <PageHeader
        title="Incoming Orders"
        description="Confirm offline payments, cancel abandoned carts, raise manual orders."
        action={
          <Link
            href="/sales/orders/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            + Manual order
          </Link>
        }
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Awaiting payment ({unpaid.length})
        </h2>
        {unpaid.length === 0 ? (
          <EmptyState title="Nothing awaiting payment" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {unpaid.map((o) => (
              <Card key={o.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{o.order_number}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-sm">
                  {o.customer?.full_name} · {o.customer?.phone_number ?? "no phone"}
                </p>
                <p className="text-sm text-foreground/60">
                  {o.items.length} item(s) ·{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(o.total_amount)}
                  </span>{" "}
                  · {formatDateTime(o.created_at)}
                </p>
                {o.order_type === "PRE_ORDER" && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300">
                    Pre-order · {formatDateTime(o.pickup_or_delivery_date)}
                  </Badge>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <form
                    action={asFormAction(salesMarkPaid)}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={o.id} />
                    <input
                      name="payment_method"
                      placeholder="CASH"
                      className="h-8 w-24 rounded border border-border bg-background px-2 text-sm"
                    />
                    <SubmitButton size="sm" pendingText="…">
                      Mark Paid
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
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          In progress ({active.length})
        </h2>
        <OrdersTable rows={active} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Closed ({done.length})
        </h2>
        <OrdersTable rows={done} />
      </section>
    </>
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
    <Card className="p-0">
      <table className="w-full text-sm">
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
  );
}
