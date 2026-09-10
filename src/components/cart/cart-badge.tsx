"use client";

import Link from "next/link";

import { useCart } from "./cart-context";

export function CartBadge() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative rounded-lg px-3 py-2 text-sm font-medium hover:bg-foreground/10"
    >
      Cart
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
