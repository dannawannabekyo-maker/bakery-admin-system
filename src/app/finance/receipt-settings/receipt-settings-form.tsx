"use client";

import { useActionState } from "react";

import { saveReceiptSettings } from "../actions";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import type { ReceiptSettings } from "@/lib/receipt-shared";

export function ReceiptSettingsForm({
  settings,
}: {
  settings: ReceiptSettings;
}) {
  const [state, action] = useActionState(saveReceiptSettings, null);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />

      <Card className="space-y-3">
        <h2 className="font-semibold">Receipt logo</h2>
        {settings.logoUrl ? (
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">Current uploaded logo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logoUrl}
              alt="Current receipt logo"
              className="h-24 w-24 rounded-lg border border-border object-contain bg-white"
            />
          </div>
        ) : (
          <p className="text-sm text-foreground/60">
            No logo uploaded yet — using the default placeholder (/logo.svg).
          </p>
        )}
        <Field
          label="Upload new logo"
          hint="PNG/JPG, max 5 MB. Leave empty to keep the current one."
        >
          <Input type="file" name="receipt_logo" accept="image/*" />
        </Field>
        {settings.logoUrl && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="remove_receipt_logo" />
            Remove uploaded logo (revert to the default placeholder)
          </label>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">PDF &amp; WhatsApp receipt content</h2>
        <p className="text-sm text-foreground/60">
          Applied to every receipt in the system: the &ldquo;Generate PDF &amp; Send
          WA&rdquo; button, and the customer-facing nota page (also used for
          in-store/offline printing) — no per-order preview.
        </p>

        <Toggle
          name="show_tax_on_receipt"
          defaultChecked={settings.showTax}
          label="Show tax breakdown"
          hint="When off, the tax row is hidden and the total shown is the full amount paid (no separate tax line)."
        />
        <Toggle
          name="show_logo_on_receipt"
          defaultChecked={settings.showLogo}
          label="Show bakery logo"
          hint="Logo loaded from /public/logo.svg."
        />
        <Toggle
          name="show_po_instructions"
          defaultChecked={settings.showPoInstructions}
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
