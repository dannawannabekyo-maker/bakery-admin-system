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

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** yyyy-mm-dd for <input type="date"> min attributes. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
