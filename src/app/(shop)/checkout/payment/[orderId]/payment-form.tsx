"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { submitPaymentProof } from "../../actions";
import { formatCurrency } from "@/lib/format";
import { Card, Field, Input, Alert } from "@/components/ui";
import { Feedback } from "@/components/form";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import type { PaymentMethod } from "@/lib/constants";

type PaymentSettings = {
  qris_image_url: string | null;
  qris_merchant_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  payment_note: string | null;
};

export function PaymentForm({
  orderId,
  amount,
  settings,
}: {
  orderId: string;
  amount: number;
  settings: PaymentSettings;
}) {
  const [state, action] = useActionState(submitPaymentProof, null);
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("QRIS");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const copyAccount = async () => {
    if (!settings.bank_account_number) return;
    try {
      await navigator.clipboard.writeText(settings.bank_account_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="method" value={method} />

      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={
              "rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors " +
              (method === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-foreground/5")
            }
          >
            {PAYMENT_METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      {method === "QRIS" ? (
        <Card className="space-y-3 text-center">
          {settings.qris_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.qris_image_url}
                alt="QRIS"
                className="mx-auto w-full max-w-xs rounded-lg border border-border bg-white object-contain"
              />
              {settings.qris_merchant_name && (
                <p className="font-medium">{settings.qris_merchant_name}</p>
              )}
              <p className="text-sm text-foreground/70">
                Scan dengan GoPay / OVO / DANA / m-banking. Bayar tepat{" "}
                <strong>{formatCurrency(amount)}</strong>.
              </p>
            </>
          ) : (
            <p className="py-6 text-sm text-foreground/60">
              Metode QRIS belum tersedia. Silakan pakai Transfer Bank.
            </p>
          )}
        </Card>
      ) : (
        <Card className="space-y-2 text-sm">
          {settings.bank_account_number ? (
            <>
              <Row label="Bank" value={settings.bank_name ?? "—"} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground/60">No. rekening</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-base font-semibold">
                    {settings.bank_account_number}
                  </span>
                  <button
                    type="button"
                    onClick={copyAccount}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-foreground/5"
                  >
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </span>
              </div>
              <Row
                label="Atas nama"
                value={settings.bank_account_holder ?? "—"}
              />
              <p className="border-t border-border pt-2 text-foreground/70">
                Transfer tepat <strong>{formatCurrency(amount)}</strong>.
              </p>
            </>
          ) : (
            <p className="py-6 text-center text-foreground/60">
              Rekening bank belum tersedia. Silakan pakai QRIS.
            </p>
          )}
        </Card>
      )}

      {settings.payment_note && (
        <Alert tone="info">{settings.payment_note}</Alert>
      )}

      <Card className="space-y-3">
        <Field
          label="Unggah bukti pembayaran (screenshot / foto)"
          hint="Gambar JPG/PNG, maks 5 MB."
        >
          <Input type="file" name="proof" accept="image/*" required />
        </Field>
      </Card>

      <Feedback state={state} />

      <SubmitBar amount={amount} done={!!state?.ok} />
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-foreground/60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SubmitBar({ amount, done }: { amount: number; done: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
      <button
        type="submit"
        disabled={pending || done}
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {done
          ? "Terkirim…"
          : pending
            ? "Mengirim bukti…"
            : `Saya sudah bayar ${formatCurrency(amount)} — kirim bukti`}
      </button>
    </div>
  );
}
