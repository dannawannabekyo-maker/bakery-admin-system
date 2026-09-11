import Link from "next/link";

import { getAllRecaps, getCashPosition, type FinanceRecap } from "@/lib/finance";
import { formatCurrency, formatPercent, jakartaDateString } from "@/lib/format";
import { Card, StatCard } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";

export const metadata = { title: "Finance Recap" };
export const dynamic = "force-dynamic";

export default async function FinanceRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "")
    ? (date as string)
    : jakartaDateString();

  const [recaps, cash] = await Promise.all([
    getAllRecaps(anchor),
    getCashPosition(),
  ]);

  return (
    <>
      <PageHeader
        title="Financial Recap"
        description="Cash flow & capital — Finance and Owner only. Menu prices are tax-inclusive; tax is separated here for reporting."
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
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              View
            </button>
          </form>
        }
      />

      {/* -------------------------------------------------- cash position */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Cash position (all time)
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Cash on hand" value={formatCurrency(cash.cashOnHand)} size="lg" />
          <StatCard label="Starting capital" value={formatCurrency(cash.capitalAllTime)} />
          <StatCard label="Gross sales" value={formatCurrency(cash.grossSalesAllTime)} />
          <StatCard
            label="Tax collected"
            value={formatCurrency(cash.taxCollectedAllTime)}
            hint="Set aside to remit"
          />
          <StatCard label="Expenses" value={formatCurrency(cash.expensesAllTime)} />
        </div>
        <p className="text-xs text-foreground/50">
          Cash on hand = starting capital + gross sales − operational expenses.
        </p>
      </section>

      {/* -------------------------------------------------- period recaps */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Recap
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {recaps.map((r) => (
            <RecapCard key={r.period} recap={r} />
          ))}
        </div>
      </section>

      <p className="text-sm">
        <Link href="/finance/cash-flow" className="text-primary underline">
          Manage starting capital & expenses →
        </Link>
      </p>
    </>
  );
}

const PERIOD_TITLE: Record<FinanceRecap["period"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function RecapCard({ recap }: { recap: FinanceRecap }) {
  const rows: { label: string; value: string; tone?: "muted" | "pos" | "neg" }[] =
    [
      { label: "Gross sales (incl. tax)", value: formatCurrency(recap.grossSales) },
      {
        label: `Net revenue`,
        value: formatCurrency(recap.netRevenue),
        tone: "pos",
      },
      {
        label: `Tax collected (${formatPercent(recap.taxRate)})`,
        value: formatCurrency(recap.taxCollected),
        tone: "muted",
      },
      {
        label: "Operational expenses",
        value: `− ${formatCurrency(recap.operationalExpenses)}`,
        tone: "neg",
      },
      { label: "Capital injected", value: formatCurrency(recap.capitalIn) },
    ];

  return (
    <Card className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{PERIOD_TITLE[recap.period]}</h3>
          <span className="text-xs text-foreground/50">
            {recap.orderCount} order{recap.orderCount === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-xs text-foreground/60">{recap.label}</p>
      </div>

      <dl className="space-y-1.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-foreground/70">{row.label}</dt>
            <dd
              className={
                row.tone === "pos"
                  ? "font-semibold text-green-700 dark:text-green-400"
                  : row.tone === "neg"
                    ? "text-red-600 dark:text-red-400"
                    : row.tone === "muted"
                      ? "text-foreground/60"
                      : "font-medium"
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-1.5 border-t border-border pt-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-medium">Net cash flow</dt>
          <dd className="text-lg font-bold">
            {formatCurrency(recap.netCashFlow)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-foreground/60">
          <dt>Operating result (excl. tax)</dt>
          <dd>{formatCurrency(recap.operatingResult)}</dd>
        </div>
      </div>
    </Card>
  );
}
