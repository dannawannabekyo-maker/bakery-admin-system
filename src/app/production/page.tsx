import { listOrders, type OrderWithRelations } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { PageHeader } from "@/components/dashboard-shell";
import { asFormAction } from "@/lib/action-result";
import { advanceProduction } from "./actions";

export const metadata = { title: "Production Board" };
export const dynamic = "force-dynamic";

const COLUMNS = [
  { status: "PAID", title: "Paid — to start", next: "IN_PRODUCTION", cta: "Start baking" },
  { status: "IN_PRODUCTION", title: "In production", next: "READY", cta: "Mark ready" },
  { status: "READY", title: "Ready for delivery/pickup", next: null, cta: null },
] as const;

export default async function ProductionBoard() {
  const orders = await listOrders({
    statuses: ["PAID", "IN_PRODUCTION", "READY"],
    limit: 300,
  });

  const grouped: Record<string, OrderWithRelations[]> = {
    PAID: [],
    IN_PRODUCTION: [],
    READY: [],
  };
  for (const o of orders) grouped[o.status]?.push(o);

  return (
    <>
      <PageHeader
        title="Production Board"
        description="Kanban of paid orders. You can only move a ticket forward."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{col.title}</h2>
              <Badge className="bg-foreground/10">
                {grouped[col.status].length}
              </Badge>
            </div>

            {grouped[col.status].length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-foreground/50">
                Empty
              </p>
            )}

            {grouped[col.status].map((o) => (
              <Card key={o.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{o.order_number}</span>
                  <Badge
                    className={
                      o.order_type === "PRE_ORDER"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300"
                        : "bg-foreground/10"
                    }
                  >
                    {o.order_type === "PRE_ORDER" ? "Pre-order" : "Ready"}
                  </Badge>
                </div>

                <ul className="text-sm">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>{it.product?.name ?? "—"}</span>
                      <span className="font-medium">× {it.quantity}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-xs text-foreground/60">
                  {o.customer?.full_name} · {o.customer?.phone_number ?? "—"}
                </div>
                {o.pickup_or_delivery_date && (
                  <div className="text-xs font-medium text-primary">
                    Due {formatDateTime(o.pickup_or_delivery_date)}
                  </div>
                )}
                {o.admin_notes && (
                  <p className="rounded bg-muted/60 p-2 text-xs">{o.admin_notes}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-foreground/50">
                    {formatCurrency(o.total_amount)}
                  </span>
                  {col.next && (
                    <form action={asFormAction(advanceProduction)}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="target" value={col.next} />
                      <SubmitButton size="sm" pendingText="…">
                        {col.cta}
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
