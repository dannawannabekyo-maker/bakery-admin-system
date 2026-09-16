import { requireRole } from "@/lib/auth";
import { getSalesReport } from "@/lib/sales-report";
import { getStoreSettings } from "@/lib/data";
import { formatCurrency, jakartaDateString, formatDateOnly } from "@/lib/format";
import { FINANCE_PERIODS, FINANCE_PERIOD_LABEL, type FinancePeriod } from "@/lib/constants";
import { Card, StatCard } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import { cn } from "@/lib/cn";
import { ExportButtons } from "./export-buttons";

export const metadata = { title: "Sales Report" };
export const dynamic = "force-dynamic";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string }>;
}) {
  // Sales Manager territory — store-wide, with money, exportable. Kept off
  // plain Sales (self-scoped, counts-only /sales/recap instead) and off
  // Finance's own routes (/finance/*), by design.
  await requireRole(["SALES_MANAGER", "ADMIN"], "/sales");

  const { date, period: rawPeriod } = await searchParams;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? (date as string) : jakartaDateString();
  const period: FinancePeriod = (FINANCE_PERIODS as readonly string[]).includes(rawPeriod ?? "")
    ? (rawPeriod as FinancePeriod)
    : "monthly";

  const [report, settings] = await Promise.all([
    getSalesReport(period, anchor),
    getStoreSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Sales Report"
        description="Store-wide sales, every account included. Figures match Finance's revenue recognition rules, but this never shows expenses, capital, or cash position — that stays in Finance."
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

      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <ExportButtons report={report} storeName={settings.store_name} logoUrl={settings.brand_logo_url} brandColor={settings.theme_primary_color} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total sales" value={formatCurrency(report.grossSales)} size="lg" />
        <StatCard label="Orders" value={String(report.totalOrders)} />
        <StatCard label="Average order value" value={formatCurrency(report.averageOrderValue)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-semibold">By date</h3>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-left text-foreground/60">
                <tr>
                  <th className="pb-1 font-normal">Date</th>
                  <th className="pb-1 text-right font-normal">Orders</th>
                  <th className="pb-1 text-right font-normal">Sales</th>
                </tr>
              </thead>
              <tbody>
                {report.byDate.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-foreground/50">
                      No sales in this period.
                    </td>
                  </tr>
                )}
                {report.byDate.map((d) => (
                  <tr key={d.date} className="border-t border-border">
                    <td className="py-1.5">{formatDateOnly(d.date)}</td>
                    <td className="py-1.5 text-right">{d.orderCount}</td>
                    <td className="py-1.5 text-right font-medium">
                      {formatCurrency(d.grossSales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold">Fulfilment status</h3>
          <dl className="space-y-1 text-sm">
            {report.byStatus.length === 0 && (
              <p className="text-foreground/50">No sales in this period.</p>
            )}
            {report.byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <dt className="text-foreground/70">{s.label}</dt>
                <dd className="font-medium">{s.count}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold">By payment method</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-foreground/60">
              <tr>
                <th className="pb-1 font-normal">Method</th>
                <th className="pb-1 text-right font-normal">Orders</th>
                <th className="pb-1 text-right font-normal">Sales</th>
              </tr>
            </thead>
            <tbody>
              {report.byPaymentMethod.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-foreground/50">
                    No sales in this period.
                  </td>
                </tr>
              )}
              {report.byPaymentMethod.map((m) => (
                <tr key={m.method} className="border-t border-border">
                  <td className="py-1.5">{m.label}</td>
                  <td className="py-1.5 text-right">{m.count}</td>
                  <td className="py-1.5 text-right font-medium">
                    {formatCurrency(m.grossSales)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold">Top products</h3>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-left text-foreground/60">
                <tr>
                  <th className="pb-1 font-normal">Product</th>
                  <th className="pb-1 text-right font-normal">Qty</th>
                  <th className="pb-1 text-right font-normal">Sales</th>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-foreground/50">
                      No sales in this period.
                    </td>
                  </tr>
                )}
                {report.topProducts.map((p) => (
                  <tr key={p.productName} className="border-t border-border">
                    <td className="py-1.5">{p.productName}</td>
                    <td className="py-1.5 text-right">{p.quantity}</td>
                    <td className="py-1.5 text-right font-medium">
                      {formatCurrency(p.grossSales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
