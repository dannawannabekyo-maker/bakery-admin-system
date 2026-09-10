"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/cart/cart-context";
import { createCustomerOrder } from "./actions";
import { formatCurrency } from "@/lib/format";
import { Card, Field, Input, EmptyState, Alert } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";

export function CheckoutForm({
  customer,
}: {
  customer: {
    name: string;
    phone: string | null;
    address: string | null;
    email: string | null;
  };
}) {
  const { items, total, hasPreorder, clear } = useCart();
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

  const minDate = new Date(Date.now() + 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <form action={action} className="space-y-5">
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
        <Card className="space-y-2">
          <p className="font-semibold">Pre-order — pickup / delivery date</p>
          <p className="text-sm text-foreground/60">
            Your cart contains made-to-order items. Choose when you&apos;d like
            them (at least 24 hours out).
          </p>
          <Field label="Date &amp; time">
            <Input
              type="datetime-local"
              name="pickup_or_delivery_date"
              min={minDate}
              required
            />
          </Field>
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

      <SubmitButton className="w-full" pendingText="Placing order…">
        Place order &amp; continue to payment
      </SubmitButton>
    </form>
  );
}
