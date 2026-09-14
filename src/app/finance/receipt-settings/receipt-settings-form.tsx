"use client";

import { useActionState } from "react";

import { saveReceiptSettings } from "../actions";
import { Card } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import type { StoreSettingsRow } from "@/lib/supabase/database.types";

export function ReceiptSettingsForm({
  settings,
}: {
  settings: StoreSettingsRow;
}) {
  const [state, action] = useActionState(saveReceiptSettings, null);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />

      <Card className="space-y-3">
        <h2 className="font-semibold">PDF &amp; WhatsApp receipt content</h2>
        <p className="text-sm text-foreground/60">
          Applied everywhere the &ldquo;Generate PDF &amp; Send WA&rdquo; button is used —
          the order list generates the receipt with these settings, no per-order preview.
        </p>

        <Toggle
          name="show_tax_on_receipt"
          defaultChecked={settings.show_tax_on_receipt}
          label="Show tax breakdown"
          hint="When off, the tax row is hidden and the total shown is the full amount paid (no separate tax line)."
        />
        <Toggle
          name="show_logo_on_receipt"
          defaultChecked={settings.show_logo_on_receipt}
          label="Show bakery logo"
          hint="Logo loaded from /public/logo.svg."
        />
        <Toggle
          name="show_po_instructions"
          defaultChecked={settings.show_po_instructions}
          label="Show PO pickup instructions"
          hint="Footer note with the pickup date/time window, for pre-order items only."
        />
      </Card>

      <SubmitButton pendingText="Saving…">Save receipt settings</SubmitButton>
    </form>
  );
}

function Toggle({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-foreground/60">{hint}</span>
      </span>
    </label>
  );
}
