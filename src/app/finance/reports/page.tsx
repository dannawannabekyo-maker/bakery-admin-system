import Link from "next/link";

import { getRecap, listFinanceOrderLines } from "@/lib/finance";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/format";
import { FINANCE_PERIODS, FINANCE_PERIOD_LABEL, type FinancePeriod } from "@/lib/constants";
import { Card, EmptyState, StatCard } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import { cn } from "@/lib/cn";

export const metadata = { title: "Financial Reports" };
export const dynamic = "force-dynamic";

export default async function FinanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const period: FinancePeriod = FINANCE_PERIODS.includes(sp.period as never)
    ? (sp.period as FinancePeriod)
    : "monthly";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date : undefined;

  const [recap, lines] = await Promise.all([
    getRecap(period, anchor),
    listFinanceOrderLines(period, anchor),
  ]);

  const exportHref = `/finance/reports/export?period=${period}${anchor ? `&date=${anchor}` : ""}`;

  return (
    <>
      <PageHeader
        title="Financial Reports"
        description="Inclusive-tax breakdown — menu prices already include tax; this separates it out per order."
        action={
          <a
            href={exportHref}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
          >
            Export CSV
          </a>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FINANCE_PERIODS.map((p) => (
          <Link
            key={p}
            href={`/finance/reports?period=${p}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              p === period
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/10 hover:bg-foreground/15",
            )}
          >
            {FINANCE_PERIOD_LABEL[p]}
          </Link>
        ))}
        <span className="text-sm text-foreground/60">{recap.label}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders" value={String(recap.orderCount)} />
        <StatCard label="Gross sales (incl. tax)" value={formatCurrency(recap.grossSales)} />
        <StatCard
          label="Net revenue"
          value={formatCurrency(recap.netRevenue)}
          tone="pos"
        />
        <StatCard
          label={`Tax collected (${formatPercent(recap.taxRate)})`}
          value={formatCurrency(recap.taxCollected)}
          tone="muted"
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Per-order breakdown
        </h2>
        {lines.length === 0 ? (
          <EmptyState title="No revenue-recognised orders in this period" />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-border text-left text-foreground/60">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Recognised</th>
                  <th className="p-3 text-right">Gross</th>
                  <th className="p-3 text-right">Net revenue</th>
                  <th className="p-3 text-right">Tax</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-border">
                    <td className="p-3 font-medium">{l.orderNumber}</td>
                    <td className="p-3 text-foreground/60">
                      {formatDateTime(l.recognisedAt)}
                    </td>
                    <td className="p-3 text-right">{formatCurrency(l.gross)}</td>
                    <td className="p-3 text-right text-green-700 dark:text-green-400">
                      {formatCurrency(l.net)}
                    </td>
                    <td className="p-3 text-right text-foreground/60">
                      {formatCurrency(l.tax)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="p-3" colSpan={2}>
                    Total
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(recap.grossSales)}
                  </td>
                  <td className="p-3 text-right text-green-700 dark:text-green-400">
                    {formatCurrency(recap.netRevenue)}
                  </td>
                  <td className="p-3 text-right text-foreground/60">
                    {formatCurrency(recap.taxCollected)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}
      </section>
    </>
  );
}
