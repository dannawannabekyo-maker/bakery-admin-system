"use client";

import { useActionState } from "react";

import { saveStoreSettings } from "../actions";
import { Card, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import type { StoreSettingsRow } from "@/lib/supabase/database.types";

export function PaymentSettingsForm({
  settings,
}: {
  settings: StoreSettingsRow;
}) {
  const [state, action] = useActionState(saveStoreSettings, null);

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />

      <Card className="space-y-3">
        <h2 className="font-semibold">QRIS</h2>
        {settings.qris_image_url ? (
          <div className="space-y-1">
            <p className="text-xs text-foreground/60">Current QRIS image</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.qris_image_url}
              alt="Current QRIS"
              className="h-40 w-40 rounded-lg border border-border object-contain bg-white"
            />
          </div>
        ) : (
          <p className="text-sm text-foreground/60">No QRIS image uploaded yet.</p>
        )}
        <Field
          label="Upload new QRIS image"
          hint="PNG/JPG, max 5 MB. Leave empty to keep the current one."
        >
          <Input type="file" name="qris_image" accept="image/*" />
        </Field>
        <Field label="Merchant name (as printed on the QRIS)">
          <Input
            name="qris_merchant_name"
            defaultValue={settings.qris_merchant_name ?? ""}
            placeholder="Allins Bakery"
          />
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Bank transfer</h2>
        <Field label="Bank name">
          <Input
            name="bank_name"
            defaultValue={settings.bank_name ?? ""}
            placeholder="BCA"
          />
        </Field>
        <Field label="Account number">
          <Input
            name="bank_account_number"
            defaultValue={settings.bank_account_number ?? ""}
            placeholder="1234567890"
          />
        </Field>
        <Field label="Account holder name">
          <Input
            name="bank_account_holder"
            defaultValue={settings.bank_account_holder ?? ""}
            placeholder="PT Allins Bakery"
          />
        </Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Extra note</h2>
        <Field
          label="Payment instructions (optional)"
          hint="Shown under both payment methods, e.g. 'Konfirmasi ke WA 08xx setelah transfer.'"
        >
          <Textarea
            name="payment_note"
            defaultValue={settings.payment_note ?? ""}
          />
        </Field>
      </Card>

      <SubmitButton pendingText="Saving…">Save payment settings</SubmitButton>
    </form>
  );
}
