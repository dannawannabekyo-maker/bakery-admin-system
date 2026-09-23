import { BAKERY_TZ } from "@/lib/constants";
import type { StoreSettingsRow } from "@/lib/supabase/database.types";

const DEFAULT_CLOSED_MESSAGE =
  "Toko sedang tutup sementara dan belum menerima pesanan baru.";

/** Customer-facing "store closed" copy, or null when the store is open. */
export function storeClosedMessage(
  settings: Pick<
    StoreSettingsRow,
    "store_closed" | "store_closed_message" | "store_closed_until"
  >,
): string | null {
  if (!settings.store_closed) return null;

  const base = settings.store_closed_message?.trim() || DEFAULT_CLOSED_MESSAGE;
  if (!settings.store_closed_until) return base;

  const human = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeZone: BAKERY_TZ,
  }).format(new Date(settings.store_closed_until));

  return `${base} Buka kembali ${human}.`;
}
