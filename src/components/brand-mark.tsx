import Link from "next/link";

import { getStoreSettings } from "@/lib/data";
import { cn } from "@/lib/cn";

/**
 * The store name + logo (Admin > Appearance), used everywhere a "🧁 Allins
 * Bakery" header used to be hardcoded: every dashboard shell, the shop
 * header, and the auth screen. `getStoreSettings` is `cache()`-wrapped, so
 * rendering this in several places in one request costs one DB round trip.
 */
export async function BrandMark({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  const settings = await getStoreSettings();
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      {settings.brand_logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={settings.brand_logo_url}
          alt={settings.store_name}
          className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span aria-hidden>🧁</span>
      )}
      <span className="truncate">{settings.store_name}</span>
    </Link>
  );
}
