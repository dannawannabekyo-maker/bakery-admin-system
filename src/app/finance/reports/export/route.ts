import { NextRequest, NextResponse } from "next/server";

import { assertRole } from "@/lib/auth";
import { getRecap, listFinanceOrderLines } from "@/lib/finance";
import { formatDateTime } from "@/lib/format";
import { FINANCE_PERIODS, type FinancePeriod } from "@/lib/constants";

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  await assertRole(["FINANCE", "ADMIN"]);

  const sp = request.nextUrl.searchParams;
  const periodParam = sp.get("period") ?? "monthly";
  const period: FinancePeriod = FINANCE_PERIODS.includes(periodParam as never)
    ? (periodParam as FinancePeriod)
    : "monthly";
  const dateParam = sp.get("date") ?? undefined;
  const anchor =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;

  const [recap, lines] = await Promise.all([
    getRecap(period, anchor),
    listFinanceOrderLines(period, anchor),
  ]);

  const rows = [
    ["Order", "Recognised at", "Gross (incl. tax)", "Net revenue", "Tax collected"],
    ...lines.map((l) => [
      l.orderNumber,
      formatDateTime(l.recognisedAt),
      String(l.gross),
      String(l.net),
      String(l.tax),
    ]),
    [],
    ["Total", "", String(recap.grossSales), String(recap.netRevenue), String(recap.taxCollected)],
  ];

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const filename = `finance-report-${period}-${recap.startDate}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
