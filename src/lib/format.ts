import { BAKERY_TZ, type FinancePeriod } from "@/lib/constants";

/** Prices are stored as whole-rupiah integers (IDR has no minor unit). */
const CURRENCY = "IDR";
const LOCALE = "id-ID";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
  }).format(d);
}

/**
 * Formats a bare "YYYY-MM-DD" (no time component — a report bucket, say) as
 * a date, anchored at noon so it can't roll to the adjacent day in a viewer
 * whose browser timezone differs from Jakarta (formatDate on a bare date
 * string parses as UTC midnight, which a negative-offset timezone would
 * render as the previous day).
 */
export function formatDateOnly(ymd: string): string {
  return formatDate(`${ymd}T12:00:00`);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { timeStyle: "short" }).format(d);
}

/** yyyy-mm-dd for <input type="date"> min attributes. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatPercent(rate: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(rate ?? 0);
}

/* ------------------------------------------------------- inclusive tax split */

export type TaxBreakdown = {
  gross: number;
  net: number;
  tax: number;
  rate: number;
};

/**
 * Menu prices already INCLUDE tax. Given a gross (paid) amount, split out the
 * net revenue and the embedded tax. Mirrors the SQL `finance_orders` view:
 *   net = round(gross / (1 + rate)),  tax = gross - net
 */
export function taxBreakdown(gross: number, rate: number): TaxBreakdown {
  const g = Math.max(0, Math.round(gross || 0));
  const net = rate > 0 ? Math.round(g / (1 + rate)) : g;
  return { gross: g, net, tax: g - net, rate: rate ?? 0 };
}

/* ------------------------------------------ Jakarta-local date bucketing */

/** Current (or given instant's) calendar date in Asia/Jakarta as YYYY-MM-DD. */
export function jakartaDateString(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: BAKERY_TZ }).format(d);
}

function ymdToUtcNoon(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Add (or subtract) whole days to a YYYY-MM-DD string. */
export function addDaysStr(s: string, n: number): string {
  const base = ymdToUtcNoon(s);
  base.setUTCDate(base.getUTCDate() + n);
  return base.toISOString().slice(0, 10);
}

/** Jakarta-local midnight for a YYYY-MM-DD date, as a UTC-instant ISO string. */
export function jakartaDayStartISO(s: string): string {
  return new Date(`${s}T00:00:00+07:00`).toISOString();
}

export type PeriodRange = {
  period: FinancePeriod;
  /** inclusive YYYY-MM-DD */
  startDate: string;
  /** exclusive YYYY-MM-DD */
  endDate: string;
  /** UTC instants matching the Jakarta-local day boundaries */
  startISO: string;
  endISO: string;
  label: string;
};

/**
 * Resolve a recap window (daily / weekly Mon–Sun / calendar month) around an
 * anchor date (defaults to "today" in Jakarta).
 */
export function periodRange(
  period: FinancePeriod,
  anchor: string = jakartaDateString(),
): PeriodRange {
  let startDate = anchor;
  let endDate = addDaysStr(anchor, 1);

  if (period === "weekly") {
    const dow = ymdToUtcNoon(anchor).getUTCDay(); // 0 Sun … 6 Sat
    const backToMonday = (dow + 6) % 7;
    startDate = addDaysStr(anchor, -backToMonday);
    endDate = addDaysStr(startDate, 7);
  } else if (period === "monthly") {
    const [y, m] = anchor.split("-").map(Number);
    startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    endDate = `${ny}-${String(nm).padStart(2, "0")}-01`;
  } else if (period === "yearly") {
    const [y] = anchor.split("-").map(Number);
    startDate = `${y}-01-01`;
    endDate = `${y + 1}-01-01`;
  }

  return {
    period,
    startDate,
    endDate,
    startISO: jakartaDayStartISO(startDate),
    endISO: jakartaDayStartISO(endDate),
    label: periodLabel(period, startDate, endDate),
  };
}

function periodLabel(
  period: FinancePeriod,
  start: string,
  end: string,
): string {
  if (period === "daily") return formatDate(ymdToUtcNoon(start));
  if (period === "monthly") {
    return new Intl.DateTimeFormat(LOCALE, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(ymdToUtcNoon(start));
  }
  if (period === "yearly") {
    return new Intl.DateTimeFormat(LOCALE, {
      year: "numeric",
      timeZone: "UTC",
    }).format(ymdToUtcNoon(start));
  }
  const lastDay = addDaysStr(end, -1);
  return `${formatDate(ymdToUtcNoon(start))} – ${formatDate(ymdToUtcNoon(lastDay))}`;
}
