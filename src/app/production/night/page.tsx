import Link from "next/link";

import { listNightDates, getNightBoard } from "@/lib/kitchen";
import { getDailyCapacity } from "@/lib/capacity";
import { getStoreSettings } from "@/lib/data";
import { jakartaDateString } from "@/lib/format";
import { Card, Badge, StatusBadge, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import { cn } from "@/lib/cn";
import { PrintLabelsButton } from "./print-labels-button";

export const metadata = { title: "Night Production" };
export const dynamic = "force-dynamic";

const DATE_WINDOW_DAYS = 30;

export default async function NightProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const today = jakartaDateString();
  const { date: rawDate } = await searchParams;

  const [dates, capacity, settings] = await Promise.all([
    listNightDates(today, DATE_WINDOW_DAYS),
    getDailyCapacity(),
    getStoreSettings(),
  ]);

  const selectedDate =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : (dates[0]?.date ?? today);

  const board = await getNightBoard(selectedDate);
  const remaining = Math.max(capacity - board.totalItems, 0);

  const humanDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${selectedDate}T12:00:00+07:00`));

  return (
    <>
      <PageHeader
        title="Night Production Board"
        description="Rekap produksi malam per tanggal ambil/antar — total per produk, lalu rincian per pesanan untuk packing & label."
        action={<PrintLabelsButton />}
      />

      {/* -------------------------------------------------- date picker */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {dates.length === 0 ? (
          <span className="text-sm text-foreground/60">
            Tidak ada pre-order terjadwal dalam {DATE_WINDOW_DAYS} hari ke depan.
          </span>
        ) : (
          dates.map((d) => (
            <Link
              key={d.date}
              href={`/production/night?date=${d.date}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                d.date === selectedDate
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground/10 hover:bg-foreground/15",
              )}
            >
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                timeZone: "Asia/Jakarta",
              }).format(new Date(`${d.date}T12:00:00+07:00`))}
              <span className="ml-1 opacity-70">· {d.totalItems} pcs</span>
            </Link>
          ))
        )}
        <form method="get" className="ml-auto flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={selectedDate}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-foreground/5">
            Lihat
          </button>
        </form>
      </div>

      {/* -------------------------------------------------- on-screen board */}
      <div className="space-y-4 print:hidden">
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{humanDate}</p>
            <p className="text-sm text-foreground/60">
              {board.orderCount} pesanan · {board.totalItems} pcs dari kapasitas{" "}
              {capacity} pcs
            </p>
          </div>
          <Badge
            className={
              remaining <= 0
                ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
                : "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
            }
          >
            Sisa kapasitas: {remaining} pcs
          </Badge>
        </Card>

        {board.products.length === 0 ? (
          <EmptyState
            title="Belum ada item untuk dipanggang"
            description="Tidak ada pre-order berstatus Paid/In Production/Ready untuk tanggal ini."
          />
        ) : (
          board.products.map((p) => (
            <Card key={p.productId} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold">
                  Total {p.productName}: {p.totalQty} pcs
                </h2>
                <span className="text-xs text-foreground/50">
                  {p.lines.length} pesanan
                </span>
              </div>
              <ul className="divide-y divide-border text-sm">
                {p.lines.map((l) => (
                  <li
                    key={l.orderId}
                    className="flex items-center justify-between gap-3 py-1.5"
                  >
                    <span>
                      <span className="font-medium">{l.orderNumber}</span>
                      <span className="text-foreground/60"> — {l.customerName}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={l.status} />
                      <span className="font-semibold">{l.qty} pcs</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))
        )}
      </div>

      {/* -------------------------------------------------- print-only labels */}
      <div className="hidden print:grid print:grid-cols-2 print:gap-3">
        {board.products.flatMap((p) =>
          p.lines.map((l) => (
            <div
              key={`${p.productId}-${l.orderId}`}
              className="break-inside-avoid rounded border border-dashed border-foreground/40 p-3 text-sm"
            >
              <p className="font-bold">🧁 {settings.store_name}</p>
              <p className="mt-1 text-base font-semibold">{p.productName}</p>
              <p className="text-lg font-bold">{l.qty} pcs</p>
              <p className="mt-1 text-foreground/70">{l.orderNumber}</p>
              <p className="text-foreground/70">{l.customerName}</p>
              <p className="text-xs text-foreground/50">{humanDate}</p>
            </div>
          )),
        )}
      </div>
    </>
  );
}
