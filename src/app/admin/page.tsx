import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { listOrders } from "@/lib/data";
import { orderContactName } from "@/lib/order-contact";
import { getFinanceSettings } from "@/lib/finance";
import { formatCurrency, formatDateTime, taxBreakdown } from "@/lib/format";
import { ORDER_STATUSES } from "@/lib/constants";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const admin = createAdminClient();

  const [{ data: orders }, { data: products }, { count: userCount }, { taxRate }] =
    await Promise.all([
      admin.from("orders").select("status,total_amount,created_at"),
      admin.from("products").select("id,name,stock,is_preorder,is_active"),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      getFinanceSettings(),
    ]);

  const byStatus = Object.fromEntries(
    ORDER_STATUSES.map((s) => [s, 0]),
  ) as Record<string, number>;
  let revenue = 0;
  for (const o of orders ?? []) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (["PAID", "IN_PRODUCTION", "READY", "COMPLETED"].includes(o.status)) {
      revenue += o.total_amount;
    }
  }

  const lowStock = (products ?? [])
    .filter((p) => !p.is_preorder && p.is_active && p.stock <= 5)
    .sort((a, b) => a.stock - b.stock);

  const recent = await listOrders({ admin: true, limit: 8 });
  const { net: netRevenue, tax: taxCollected } = taxBreakdown(revenue, taxRate);

  const stats = [
    { label: "Total orders", value: (orders ?? []).length },
    { label: "Gross revenue (incl. tax)", value: formatCurrency(revenue) },
    { label: "Net revenue", value: formatCurrency(netRevenue) },
    { label: "Tax collected", value: formatCurrency(taxCollected) },
    { label: "Unpaid", value: byStatus.UNPAID },
    { label: "In production", value: byStatus.IN_PRODUCTION },
    { label: "Ready", value: byStatus.READY },
    { label: "Users", value: userCount ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="Everything at a glance. You bypass all RLS here."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs uppercase tracking-wide text-foreground/60">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-primary underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border text-sm">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-medium hover:underline"
                >
                  {o.order_number}
                </Link>
                <span className="text-foreground/60">
                  {orderContactName(o)}
                </span>
                <span>{formatCurrency(o.total_amount)}</span>
                <StatusBadge status={o.status} />
              </li>
            ))}
            {recent.length === 0 && (
              <li className="py-3 text-foreground/60">No orders yet.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Low stock (≤ 5)</h2>
          <ul className="divide-y divide-border text-sm">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span>{p.name}</span>
                <span
                  className={
                    p.stock === 0 ? "font-semibold text-red-600" : "text-amber-600"
                  }
                >
                  {p.stock} left
                </span>
              </li>
            ))}
            {lowStock.length === 0 && (
              <li className="py-3 text-foreground/60">
                All ready-stock products are well stocked.
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-foreground/50">
            Snapshot generated {formatDateTime(new Date())}
          </p>
        </Card>
      </div>
    </>
  );
}
