import {
  getCashPosition,
  listCapitalEntries,
  listExpenses,
} from "@/lib/finance";
import { formatCurrency, formatDate, jakartaDateString } from "@/lib/format";
import { EXPENSE_CATEGORY_LABEL } from "@/lib/constants";
import { Card, EmptyState, StatCard } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import {
  AddCapitalModal,
  AddExpenseForm,
  DeleteCapitalButton,
  DeleteExpenseButton,
} from "./cash-flow-forms";

export const metadata = { title: "Cash Flow" };
export const dynamic = "force-dynamic";

export default async function CashFlowPage() {
  const today = jakartaDateString();
  const [cash, capital, expenses] = await Promise.all([
    getCashPosition(),
    listCapitalEntries(200),
    listExpenses(300),
  ]);

  return (
    <>
      <PageHeader
        title="Cash Flow & Capital"
        description="Track starting capital and operational expenses against sales income."
        action={<AddCapitalModal today={today} />}
      />

      {/* ------------------------------------------------- position summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cash on hand" value={formatCurrency(cash.cashOnHand)} size="lg" />
        <StatCard label="Starting capital" value={formatCurrency(cash.capitalAllTime)} />
        <StatCard label="Gross sales income" value={formatCurrency(cash.grossSalesAllTime)} />
        <StatCard label="Operational expenses" value={formatCurrency(cash.expensesAllTime)} />
      </div>
      <p className="text-xs text-foreground/50">
        Cash on hand = starting capital + gross sales income − operational
        expenses. Of the sales income, {formatCurrency(cash.taxCollectedAllTime)}{" "}
        is tax to be remitted (see Reports).
      </p>

      {/* --------------------------------------------------- capital table */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Starting capital / injections ({capital.length})
        </h2>
        {capital.length === 0 ? (
          <EmptyState
            title="Belum ada modal dicatat"
            description="Gunakan tombol “Input modal awal” di atas."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-border text-left text-foreground/60">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Nominal</th>
                  <th className="p-3">Catatan</th>
                  <th className="p-3">Oleh</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {capital.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="p-3">{formatDate(c.entry_date)}</td>
                    <td className="p-3 font-medium">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="p-3 text-foreground/70">{c.note ?? "—"}</td>
                    <td className="p-3 text-foreground/60">
                      {c.creator?.full_name ?? "—"}
                    </td>
                    <td className="p-3 text-right">
                      <DeleteCapitalButton id={c.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* --------------------------------------------------- expenses */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Operational expenses ({expenses.length})
        </h2>
        <AddExpenseForm today={today} />
        {expenses.length === 0 ? (
          <EmptyState title="Belum ada pengeluaran dicatat" />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-border text-left text-foreground/60">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Nominal</th>
                  <th className="p-3">Catatan</th>
                  <th className="p-3">Oleh</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border">
                    <td className="p-3">{formatDate(e.spent_at)}</td>
                    <td className="p-3">
                      {EXPENSE_CATEGORY_LABEL[e.category] ?? e.category}
                    </td>
                    <td className="p-3 font-medium text-red-600 dark:text-red-400">
                      − {formatCurrency(e.amount)}
                    </td>
                    <td className="p-3 text-foreground/70">{e.note ?? "—"}</td>
                    <td className="p-3 text-foreground/60">
                      {e.creator?.full_name ?? "—"}
                    </td>
                    <td className="p-3 text-right">
                      <DeleteExpenseButton id={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </>
  );
}
