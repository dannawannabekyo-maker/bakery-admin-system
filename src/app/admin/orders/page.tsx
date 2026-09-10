import Link from "next/link";

import { listOrders } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/constants";
import { Card, StatusBadge, Badge } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statuses = status && ORDER_STATUSES.includes(status as never)
    ? [status]
    : undefined;
  const orders = await listOrders({ admin: true, statuses, limit: 300 });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order in the system. Click one to force any change."
        action={
          <Link
            href="/admin/orders/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            + Manual order
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1 text-sm">
        <FilterLink label="All" active={!status} href="/admin/orders" />
        {ORDER_STATUSES.map((s) => (
          <FilterLink
            key={s}
            label={s}
            active={status === s}
            href={`/admin/orders?status=${s}`}
          />
        ))}
      </div>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-foreground/60">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Type</th>
              <th className="p-3">Placed</th>
              <th className="p-3">Fulfil</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border hover:bg-foreground/5">
                <td className="p-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium hover:underline"
                  >
                    {o.order_number}
                  </Link>
                  <div className="text-xs text-foreground/50">
                    by {o.creator?.full_name ?? "—"} ({o.creator?.role})
                  </div>
                </td>
                <td className="p-3">
                  {o.customer?.full_name ?? "—"}
                  <div className="text-xs text-foreground/50">
                    {o.customer?.phone_number ?? ""}
                  </div>
                </td>
                <td className="p-3">
                  <Badge className="bg-foreground/10">
                    {o.order_type === "PRE_ORDER" ? "Pre-order" : "Ready"}
                  </Badge>
                </td>
                <td className="p-3">{formatDateTime(o.created_at)}</td>
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
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-foreground/60">
                  No orders match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1 " +
        (active
          ? "bg-primary text-primary-foreground"
          : "bg-foreground/10 hover:bg-foreground/15")
      }
    >
      {label}
    </Link>
  );
}
