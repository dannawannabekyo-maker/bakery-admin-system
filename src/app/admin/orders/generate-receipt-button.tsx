"use client";

import { useState, useTransition } from "react";

import { getReceiptToggleSettings } from "@/app/finance/actions";
import { generateAndSendReceipt } from "@/lib/receipt-client";
import type { OrderWithRelations } from "@/lib/data";

/**
 * One-click: fetches the global receipt toggles and immediately generates
 * the PDF (client-side download only, never stored) + opens WhatsApp with
 * the matching text. No per-order preview — see /finance/receipt-settings
 * for the toggles that control this.
 */
export function GenerateReceiptButton({
  order,
  className,
}: {
  order: OrderWithRelations;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    // Pre-open the tab synchronously (still inside the click gesture) so the
    // browser doesn't block it once we redirect it after the awaits below.
    const waWindow = window.open("", "_blank");

    startTransition(async () => {
      try {
        const settings = await getReceiptToggleSettings();
        await generateAndSendReceipt(order, settings, waWindow);
      } catch (err) {
        waWindow?.close();
        setError(err instanceof Error ? err.message : "Failed to generate receipt.");
      }
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "Generating…" : "Generate PDF & Send WA"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
