import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui";
import { AddToCart } from "@/components/cart/add-to-cart";
import type { ProductWithCategory } from "@/lib/data";

export function ProductCard({ product }: { product: ProductWithCategory }) {
  const soldOut = !product.is_preorder && product.stock <= 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background">
      <Link href={`/product/${product.id}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url || "/placeholder-product.svg"}
          alt={product.name}
          className="aspect-[4/3] w-full object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/product/${product.id}`}
            className="font-semibold hover:underline"
          >
            {product.name}
          </Link>
          <span className="whitespace-nowrap font-bold">
            {formatCurrency(product.price)}
          </span>
        </div>
        {product.description && (
          <p className="line-clamp-2 text-sm text-foreground/60">
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-2">
          {product.is_preorder ? (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300">
              Pre-order
            </Badge>
          ) : soldOut ? (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300">
              Sold out
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300">
              {product.stock} in stock
            </Badge>
          )}
          {product.category && (
            <span className="text-xs text-foreground/50">
              {product.category.name}
            </span>
          )}
        </div>
        <div className="mt-auto pt-2">
          <AddToCart
            product={{
              productId: product.id,
              name: product.name,
              price: product.price,
              isPreorder: product.is_preorder,
              imageUrl: product.image_url,
              stock: product.stock,
            }}
          />
        </div>
      </div>
    </div>
  );
}
