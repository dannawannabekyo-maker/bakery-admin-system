import Link from "next/link";

import { requireSession } from "@/lib/auth";
import { listOrders } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, StatusBadge, EmptyState } from "@/components/ui";

export const metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const { userId } = await requireSession("/orders");
  const orders = await listOrders({ customerId: userId, limit: 100 });

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="When you place an order it'll show up here with live status."
        action={
          <Link
            href="/shop"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Start shopping
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Orders</h1>
      <div className="space-y-3">
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="block">
            <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-primary">
              <div>
                <p className="font-semibold">{o.order_number}</p>
                <p className="text-sm text-foreground/60">
                  {formatDateTime(o.created_at)} · {o.items.length} item(s)
                  {o.order_type === "PRE_ORDER" &&
                    o.pickup_or_delivery_date &&
                    ` · for ${formatDateTime(o.pickup_or_delivery_date)}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold">
                  {formatCurrency(o.total_amount)}
                </span>
                <StatusBadge status={o.status} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
