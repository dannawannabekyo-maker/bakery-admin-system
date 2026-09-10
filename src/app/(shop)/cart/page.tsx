"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-context";
import { formatCurrency } from "@/lib/format";
import { productImageSrc } from "@/lib/images";
import { Button, Card, EmptyState, Badge } from "@/components/ui";

export default function CartPage() {
  const { items, total, setQty, remove, hasPreorder } = useCart();

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add something warm from the shop."
        action={
          <Link
            href="/shop"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Browse the shop
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your cart</h1>

      <div className="space-y-3 pb-28 sm:pb-0">
        {items.map((i) => (
          <Card key={i.productId} className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImageSrc(i.imageUrl)}
              alt={i.name}
              className="h-16 w-16 shrink-0 rounded-lg bg-muted object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{i.name}</p>
              <p className="text-sm text-foreground/60">
                {formatCurrency(i.price)} each
              </p>
              {i.isPreorder && (
                <Badge className="mt-1 bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300">
                  Pre-order
                </Badge>
              )}
            </div>
            <button
              onClick={() => remove(i.productId)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(i.productId, i.quantity - 1)}
                  className="h-9 w-9 rounded border border-border"
                >
                  −
                </button>
                <span className="w-8 text-center">{i.quantity}</span>
                <button
                  onClick={() => setQty(i.productId, i.quantity + 1)}
                  className="h-9 w-9 rounded border border-border disabled:opacity-40"
                  disabled={!i.isPreorder && i.quantity >= i.stock}
                >
                  +
                </button>
              </div>
              <div className="w-28 text-right font-semibold">
                {formatCurrency(i.price * i.quantity)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 p-4 backdrop-blur sm:static sm:rounded-xl sm:border sm:p-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-foreground/60">Total</p>
            <p className="text-xl font-bold sm:text-2xl">
              {formatCurrency(total)}
            </p>
            {hasPreorder && (
              <p className="text-xs text-purple-600">
                Contains pre-order items — you&apos;ll pick a date at checkout.
              </p>
            )}
          </div>
          <Link href="/checkout">
            <Button size="md">Proceed to checkout</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
