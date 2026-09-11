"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/**
 * Best-effort live refresh for order-driven dashboards (Sales, Production).
 * Subscribes to Postgres changes on `orders` (still filtered by that user's
 * existing RLS SELECT policies — nobody sees more than they already could
 * query) and re-fetches the current server-rendered page instead of making
 * staff hit reload. If Realtime can't connect for any reason this silently
 * does nothing — the page still works exactly as before, just without the
 * live refresh.
 */
export function RealtimeOrdersRefresh() {
  const router = useRouter();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => router.refresh(), 400);
    };

    try {
      const supabase = createClient();
      channel = supabase
        .channel("orders-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          scheduleRefresh,
        )
        .subscribe();
    } catch {
      // Realtime unavailable — dashboards remain fully usable without it.
    }

    return () => {
      if (debounce) clearTimeout(debounce);
      channel?.unsubscribe().catch(() => {});
    };
  }, [router]);

  return null;
}
