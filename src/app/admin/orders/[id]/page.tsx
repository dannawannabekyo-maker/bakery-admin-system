import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrder } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, StatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { PageHeader } from "@/components/dashboard-shell";
import { OrderTimeline } from "@/components/order-timeline";
import { adminDeleteOrder } from "../../actions";
import { OrderAdminPanel } from "./order-admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id, { admin: true });
  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={`Order ${order.order_number}`}
        description={`Placed ${formatDateTime(order.created_at)} · ${order.order_type}`}
        action={
          <Link href="/admin/orders" className="text-sm text-primary underline">
            ← All orders
          </Link>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={order.status} />
        <span className="text-sm text-foreground/60">
          Last updated {formatDateTime(order.updated_at)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-semibold">Items</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-foreground/60">
              <tr>
                <th className="py-1">Product</th>
                <th className="py-1">Qty</th>
                <th className="py-1">Price</th>
                <th className="py-1 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="py-2">
                    {it.product?.name ?? "—"}
                    {it.product?.is_preorder && (
                      <span className="ml-1 text-xs text-purple-600">PO</span>
                    )}
                  </td>
                  <td className="py-2">{it.quantity}</td>
                  <td className="py-2">{formatCurrency(it.price_at_time)}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(it.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="py-2" colSpan={3}>
                  Total
                </td>
                <td className="py-2 text-right">
                  {formatCurrency(order.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <Card className="space-y-2 text-sm">
          <h2 className="font-semibold">Customer</h2>
          <p>{order.customer?.full_name ?? "—"}</p>
          <p className="text-foreground/60">{order.customer?.phone_number ?? "—"}</p>
          <p className="text-foreground/60">{order.customer?.address ?? "No address"}</p>
          <hr className="border-border" />
          <p>
            <span className="text-foreground/60">Created by:</span>{" "}
            {order.creator?.full_name} ({order.creator?.role})
          </p>
          <p>
            <span className="text-foreground/60">Payment:</span>{" "}
            {order.payment_method ?? "—"}
          </p>
          <p>
            <span className="text-foreground/60">Receipt ref:</span>{" "}
            {order.payment_receipt_url ?? "—"}
          </p>
        </Card>
      </div>

      <OrderTimeline status={order.status} />

      <OrderAdminPanel order={order} />

      <Card className="flex items-center justify-between border-red-200 bg-red-50/40 dark:border-red-500/30 dark:bg-red-500/5">
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300">
            Danger zone
          </p>
          <p className="text-sm text-foreground/60">
            Permanently delete this order and its items.
          </p>
        </div>
        <form action={adminDeleteOrder}>
          <input type="hidden" name="id" value={order.id} />
          <ConfirmButton message={`Delete order ${order.order_number}? This cannot be undone.`}>
            Delete order
          </ConfirmButton>
        </form>
      </Card>
    </>
  );
}
