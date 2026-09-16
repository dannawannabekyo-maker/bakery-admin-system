"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/cart-context";
import { createGuestOrder } from "../actions";
import { formatCurrency } from "@/lib/format";
import { Card, Field, Input, EmptyState, Alert } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { PickupDatePicker, type PickupLoad } from "../pickup-date-picker";

export function GuestCheckoutForm({ loads }: { loads: PickupLoad[] }) {
  const { items, total, hasPreorder, clear } = useCart();
  const preorderQty = items
    .filter((i) => i.isPreorder)
    .reduce((sum, i) => sum + i.quantity, 0);
  const [state, action] = useActionState(createGuestOrder, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok && state.redirectTo) {
      clear();
      router.push(state.redirectTo);
    }
  }, [state, clear, router]);

  if (items.length === 0 && !state?.ok) {
    return (
      <EmptyState
        title="Keranjang masih kosong"
        description="Pilih dulu produk yang mau dipesan."
        action={
          <Link
            href="/shop"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ke toko
          </Link>
        }
      />
    );
  }

  return (
    <form action={action} className="space-y-5 pb-24 sm:pb-0">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        )}
      />

      <Card className="space-y-3">
        <p className="font-semibold">Kontak</p>
        <Field label="Nama">
          <Input name="guest_name" required maxLength={80} placeholder="Nama Anda" />
        </Field>
        <Field label="Nomor HP / WhatsApp" hint="Sales akan menghubungi nomor ini untuk konfirmasi.">
          <Input
            name="guest_phone"
            type="tel"
            required
            placeholder="08xxxxxxxxxx"
            inputMode="tel"
          />
        </Field>
      </Card>

      <Card className="space-y-2">
        <p className="font-semibold">Ringkasan pesanan</p>
        {items.map((i) => (
          <div key={i.productId} className="flex justify-between text-sm">
            <span>
              {i.name} × {i.quantity}
              {i.isPreorder && (
                <span className="ml-1 text-xs text-purple-600">PO</span>
              )}
            </span>
            <span>{formatCurrency(i.price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </Card>

      {hasPreorder ? (
        <Card className="space-y-3">
          <div>
            <p className="font-semibold">Pre-order — tanggal ambil / antar</p>
            <p className="text-sm text-foreground/60">
              Produksi dibatasi per malam ({preorderQty} pcs untuk keranjang ini).
              Tanggal yang penuh akan tampak abu-abu.
            </p>
          </div>
          <PickupDatePicker
            loads={loads}
            cartQty={preorderQty}
            name="pickup_or_delivery_date"
          />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-foreground/70">
            <span className="font-semibold">Ready stock</span> — disiapkan
            setelah pembayaran dikonfirmasi. Opsional, pilih waktu yang
            diinginkan:
          </p>
          <div className="mt-2">
            <Field label="Waktu pengambilan (opsional)">
              <Input type="datetime-local" name="pickup_or_delivery_date" />
            </Field>
          </div>
        </Card>
      )}

      <Feedback state={state} />
      {state?.ok && <Alert tone="success">Mengalihkan ke pembayaran…</Alert>}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-2xl">
          <SubmitButton className="w-full" pendingText="Membuat pesanan…">
            Pesan &amp; lanjut ke pembayaran
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
