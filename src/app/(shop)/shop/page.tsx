import Link from "next/link";

import { getPublicCatalog } from "@/lib/data";
import { EmptyState } from "@/components/ui";
import { ProductCard } from "@/components/product-card";

export const metadata = { title: "Shop" };
// No explicit `dynamic` export needed: reading `searchParams` already forces
// per-request rendering. Using the cookie-free public catalog read still
// avoids an unnecessary SSR auth-cookie round trip on every page view.

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; type?: string }>;
}) {
  const { category, type } = await searchParams;
  const { categories, products } = await getPublicCatalog();

  let visible = products;
  if (category) visible = visible.filter((p) => p.category?.slug === category);
  if (type === "preorder") visible = visible.filter((p) => p.is_preorder);
  if (type === "ready") visible = visible.filter((p) => !p.is_preorder);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Fresh from the oven</h1>
        <p className="text-foreground/60">
          Ready-stock items ship today. Pre-order items let you choose a pickup or
          delivery date at checkout.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Chip href="/shop" label="All" active={!category && !type} />
        <Chip href="/shop?type=ready" label="Ready stock" active={type === "ready"} />
        <Chip
          href="/shop?type=preorder"
          label="Pre-order"
          active={type === "preorder"}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            href={`/shop?category=${c.slug}`}
            label={c.name}
            active={category === c.slug}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Try another filter, or check back soon."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1.5 font-medium " +
        (active
          ? "bg-primary text-primary-foreground"
          : "border border-border hover:bg-foreground/5")
      }
    >
      {label}
    </Link>
  );
}
