import { requireRole } from "@/lib/auth";
import { getSalesRecap } from "@/lib/sales";
import { jakartaDateString } from "@/lib/format";
import { FINANCE_PERIODS, FINANCE_PERIOD_LABEL, type FinancePeriod } from "@/lib/constants";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import { cn } from "@/lib/cn";

export const metadata = { title: "Recap" };
export const dynamic = "force-dynamic";

export default async function SalesRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string }>;
}) {
  // Each Sales rep only recaps orders they personally took (orders.created_by)
  // — customer self-checkout orders aren't "theirs" and are excluded, same as
  // any other rep's manual orders. Admin sees the whole store instead.
  const { userId, profile } = await requireRole(["SALES", "ADMIN"], "/sales");
  const { date, period: rawPeriod } = await searchParams;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? (date as string) : jakartaDateString();
  const period: FinancePeriod = (FINANCE_PERIODS as readonly string[]).includes(rawPeriod ?? "")
    ? (rawPeriod as FinancePeriod)
    : "daily";

  const scopedToSelf = profile.role === "SALES";
  const recap = await getSalesRecap(period, anchor, scopedToSelf ? userId : undefined);

  return (
    <>
      <PageHeader
        title="Recap"
        description={
          scopedToSelf
            ? "Orders you personally took and items you sold — counts only, not revenue. Customer self-checkout orders and other reps' orders aren't included."
            : "Store-wide orders taken and items sold — counts only. For revenue and financial totals, see Finance."
        }
        action={
          <form method="get" className="flex items-end gap-2">
            <label className="text-xs text-foreground/60">
              <span className="mb-1 block">Anchor date</span>
              <input
                type="date"
                name="date"
                defaultValue={anchor}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <input type="hidden" name="period" value={period} />
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              View
            </button>
          </form>
        }
      />

      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 text-sm">
        {FINANCE_PERIODS.map((p) => (
          <a
            key={p}
            href={`?date=${anchor}&period=${p}`}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center font-medium",
              p === period
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-foreground/10",
            )}
          >
            {FINANCE_PERIOD_LABEL[p]}
          </a>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3">
          <div>
            <h3 className="font-semibold">Orders</h3>
            <p className="text-xs text-foreground/60">{recap.label}</p>
          </div>
          <p className="text-3xl font-bold">{recap.orderCount}</p>
          <dl className="space-y-1 text-sm">
            {recap.byStatus.length === 0 && (
              <p className="text-foreground/50">No orders in this period.</p>
            )}
            {recap.byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <dt className="text-foreground/70">{s.label}</dt>
                <dd className="font-medium">{s.count}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold">By payment method</h3>
          <dl className="space-y-1 text-sm">
            {recap.byPaymentMethod.length === 0 && (
              <p className="text-foreground/50">No orders in this period.</p>
            )}
            {recap.byPaymentMethod.map((m) => (
              <div key={m.method} className="flex items-center justify-between">
                <dt className="text-foreground/70">{m.label}</dt>
                <dd className="font-medium">{m.count}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="space-y-3 lg:col-span-1">
          <h3 className="font-semibold">Items sold</h3>
          <dl className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {recap.itemsSold.length === 0 && (
              <p className="text-foreground/50">No items in this period.</p>
            )}
            {recap.itemsSold.map((it) => (
              <div key={it.productName} className="flex items-center justify-between gap-3">
                <dt className="text-foreground/70">{it.productName}</dt>
                <dd className="font-medium">{it.quantity}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
