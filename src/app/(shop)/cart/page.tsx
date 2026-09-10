"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-context";
import { formatCurrency } from "@/lib/format";
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

      <div className="space-y-3">
        {items.map((i) => (
          <Card key={i.productId} className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={i.imageUrl || "/placeholder-product.svg"}
              alt={i.name}
              className="h-16 w-16 rounded-lg object-cover"
            />
            <div className="flex-1">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(i.productId, i.quantity - 1)}
                className="h-8 w-8 rounded border border-border"
              >
                −
              </button>
              <span className="w-8 text-center">{i.quantity}</span>
              <button
                onClick={() => setQty(i.productId, i.quantity + 1)}
                className="h-8 w-8 rounded border border-border disabled:opacity-40"
                disabled={!i.isPreorder && i.quantity >= i.stock}
              >
                +
              </button>
            </div>
            <div className="w-24 text-right font-semibold">
              {formatCurrency(i.price * i.quantity)}
            </div>
            <button
              onClick={() => remove(i.productId)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </Card>
        ))}
      </div>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground/60">Total</p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
          {hasPreorder && (
            <p className="text-xs text-purple-600">
              Contains pre-order items — you&apos;ll pick a date at checkout.
            </p>
          )}
        </div>
        <Link href="/checkout">
          <Button size="md">Proceed to checkout</Button>
        </Link>
      </Card>
    </div>
  );
}
