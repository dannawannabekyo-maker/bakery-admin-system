"use client";

import { useActionState, useMemo, useState } from "react";

import { saveAppearanceSettings } from "../actions";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { deriveTheme, normalizeHex, contrastRatio } from "@/lib/color";
import type { StoreSettingsRow } from "@/lib/supabase/database.types";

export function AppearanceForm({ settings }: { settings: StoreSettingsRow }) {
  const [state, action] = useActionState(saveAppearanceSettings, null);
  const [colorInput, setColorInput] = useState(settings.theme_primary_color);

  const theme = useMemo(() => {
    const hex = normalizeHex(colorInput);
    return hex ? deriveTheme(hex) : null;
  }, [colorInput]);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />

      <Card className="space-y-3">
        <h2 className="font-semibold">Store name</h2>
        <Field
          label="Name"
          hint="Shown in every header, the browser tab title, and on receipts."
        >
          <Input
            name="store_name"
            defaultValue={settings.store_name}
            required
            maxLength={80}
          />
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Brand logo</h2>
        {settings.brand_logo_url ? (
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">Current logo</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.brand_logo_url}
              alt={settings.store_name}
              className="h-24 w-24 rounded-lg border border-border object-contain bg-white"
            />
          </div>
        ) : (
          <p className="text-sm text-foreground/60">
            No logo uploaded yet — using the 🧁 emoji / default placeholder.
          </p>
        )}
        <Field
          label="Upload new logo"
          hint="PNG/JPG, max 5 MB. Square works best — it's used small, in nav bars."
        >
          <Input type="file" name="brand_logo" accept="image/*" />
        </Field>
        {settings.brand_logo_url && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="remove_brand_logo" />
            Remove uploaded logo (revert to the default)
          </label>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Brand color</h2>
        <p className="text-sm text-foreground/60">
          Pick one color — the dark-mode shade and readable text color on top
          of it are derived automatically.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={normalizeHex(colorInput) ?? "#a8547f"}
            onChange={(e) => setColorInput(e.target.value)}
            className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
            aria-label="Brand color picker"
          />
          <Input
            name="theme_primary_color"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            placeholder="#a8547f"
            className="max-w-40 font-mono"
          />
        </div>

        {theme ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ThemePreview
              label="Light mode"
              background="#fff7fb"
              swatch={theme.primary}
              foreground={theme.primaryForeground}
              ratio={contrastRatio(theme.primary, theme.primaryForeground)}
            />
            <ThemePreview
              label="Dark mode (auto)"
              background="#221a20"
              swatch={theme.primaryDark}
              foreground={theme.primaryForegroundDark}
              ratio={contrastRatio(theme.primaryDark, theme.primaryForegroundDark)}
            />
          </div>
        ) : (
          <p className="text-sm text-red-600">
            Not a valid hex color — use e.g. #a8547f.
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Sales contact (WhatsApp)</h2>
        <p className="text-sm text-foreground/60">
          Shown as a &ldquo;Contact Sales&rdquo; button on the shop front page,
          for guest customers who need help. Leave the number empty to hide
          the button.
        </p>
        <Field label="WhatsApp number" hint="e.g. 08123456789 — any format works.">
          <Input
            name="sales_whatsapp_number"
            type="tel"
            defaultValue={settings.sales_whatsapp_number ?? ""}
            placeholder="08123456789"
          />
        </Field>
        <Field label="Display label (optional)" hint="Shown on the button, e.g. 'Sales Allins Bakery'.">
          <Input
            name="sales_whatsapp_label"
            defaultValue={settings.sales_whatsapp_label ?? ""}
            placeholder="Sales"
          />
        </Field>
      </Card>

      <SubmitButton pendingText="Saving…">Save appearance settings</SubmitButton>
    </form>
  );
}

function ThemePreview({
  label,
  background,
  swatch,
  foreground,
  ratio,
}: {
  label: string;
  background: string;
  swatch: string;
  foreground: string;
  ratio: number;
}) {
  const passesAA = ratio >= 4.5;
  const passesLarge = ratio >= 3;
  return (
    <div
      className="space-y-2 rounded-lg border border-border p-3"
      style={{ background }}
    >
      <p className="text-xs font-medium" style={{ color: foreground === "#ffffff" ? "#fff7fb" : "#4a3b47" }}>
        {label}
      </p>
      <button
        type="button"
        disabled
        className="w-full rounded-lg px-3 py-2 text-sm font-medium"
        style={{ background: swatch, color: foreground }}
      >
        Sample button
      </button>
      <p
        className="text-xs"
        style={{ color: foreground === "#ffffff" ? "#fff7fb" : "#4a3b47", opacity: 0.7 }}
      >
        Contrast {ratio.toFixed(1)}:1 —{" "}
        {passesAA ? "AA ✓" : passesLarge ? "AA (large text/UI) ✓" : "Low contrast ⚠"}
      </p>
    </div>
  );
}
