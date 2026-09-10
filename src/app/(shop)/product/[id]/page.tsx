import Link from "next/link";
import { notFound } from "next/navigation";

import { getProductById } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { productImageSrc } from "@/lib/images";
import { Badge } from "@/components/ui";
import { AddToCart } from "@/components/cart/add-to-cart";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product || !product.is_active) notFound();

  const soldOut = !product.is_preorder && product.stock <= 0;

  return (
    <div className="space-y-6">
      <Link href="/shop" className="text-sm text-primary underline">
        ← Back to shop
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={productImageSrc(product.image_url)}
          alt={product.name}
          className="aspect-[4/3] w-full rounded-xl border border-border bg-muted object-cover"
        />

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.category && (
              <p className="text-sm text-foreground/50">
                {product.category.name}
              </p>
            )}
          </div>

          <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>

          <div>
            {product.is_preorder ? (
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300">
                Pre-order — pick a date at checkout
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
          </div>

          {product.description && (
            <p className="text-foreground/70">{product.description}</p>
          )}

          <div className="max-w-xs">
            <AddToCart
              product={{
                productId: product.id,
                name: product.name,
                price: product.price,
                isPreorder: product.is_preorder,
                imageUrl: productImageSrc(product.image_url),
                stock: product.stock,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
