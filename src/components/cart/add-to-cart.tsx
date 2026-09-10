"use client";

import { useState } from "react";

import { useCart, type CartItem } from "./cart-context";
import { Button } from "@/components/ui";

export function AddToCart({
  product,
  compact = false,
}: {
  product: Omit<CartItem, "quantity">;
  compact?: boolean;
}) {
  const { add, items } = useCart();
  const [added, setAdded] = useState(false);

  const inCart = items.find((i) => i.productId === product.productId);
  const soldOut = !product.isPreorder && product.stock <= 0;
  const maxed =
    !product.isPreorder && inCart && inCart.quantity >= product.stock;

  return (
    <Button
      size={compact ? "sm" : "md"}
      variant={soldOut ? "secondary" : "primary"}
      disabled={soldOut || maxed}
      onClick={() => {
        add(product, 1);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className={compact ? "" : "w-full"}
    >
      {soldOut
        ? "Sold out"
        : maxed
          ? "Max stock in cart"
          : added
            ? "Added ✓"
            : product.isPreorder
              ? "Pre-order"
              : "Add to cart"}
    </Button>
  );
}
