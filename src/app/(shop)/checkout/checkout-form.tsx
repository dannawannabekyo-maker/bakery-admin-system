"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/cart-context";
import { createCustomerOrder } from "./actions";
import { formatCurrency } from "@/lib/format";
import { Card, Field, Input, EmptyState, Alert } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { PickupDatePicker, type PickupLoad } from "./pickup-date-picker";

export function CheckoutForm({
  customer,
  loads,
}: {
  customer: {
    name: string;
    phone: string | null;
    address: string | null;
    email: string | null;
  };
  loads: PickupLoad[];
}) {
  const { items, total, hasPreorder, clear } = useCart();
  const preorderQty = items
    .filter((i) => i.isPreorder)
    .reduce((sum, i) => sum + i.quantity, 0);
  const [state, action] = useActionState(createCustomerOrder, null);
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
        title="Nothing to check out"
        description="Your cart is empty."
        action={
          <Link
            href="/shop"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to shop
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

      <Card className="space-y-1 text-sm">
        <p className="font-semibold">Contact</p>
        <p>{customer.name || "—"}</p>
        <p className="text-foreground/60">{customer.email}</p>
        <p className="text-foreground/60">{customer.phone || "No phone on file"}</p>
        <p className="text-foreground/60">
          {customer.address || "No address on file"}
        </p>
        <Link href="/account" className="text-primary underline">
          Edit details
        </Link>
      </Card>

      <Card className="space-y-2">
        <p className="font-semibold">Order summary</p>
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
            <p className="font-semibold">Pre-order — pickup / delivery date</p>
            <p className="text-sm text-foreground/60">
              Production is limited per night ({preorderQty} pcs needed for
              this cart). Dates that can&apos;t fit your order are greyed out.
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
            <span className="font-semibold">Ready stock</span> — prepared for
            collection today once payment is confirmed. Optionally pick a
            preferred time:
          </p>
          <div className="mt-2">
            <Field label="Preferred pickup time (optional)">
              <Input type="datetime-local" name="pickup_or_delivery_date" />
            </Field>
          </div>
        </Card>
      )}

      <Feedback state={state} />
      {state?.ok && <Alert tone="success">Redirecting to payment…</Alert>}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-2xl">
          <SubmitButton className="w-full" pendingText="Placing order…">
            Place order &amp; continue to payment
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
