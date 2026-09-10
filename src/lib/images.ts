import { STORAGE_BUCKETS } from "@/lib/constants";

const PLACEHOLDER = "/placeholder-product.svg";

/**
 * Resolve a product `image_url` value to something an <img src> can actually
 * load. Accepts:
 *   - a full URL            → used as-is
 *   - a root-relative path  → used as-is
 *   - a data: URI           → used as-is
 *   - a bare storage path   → expanded to the product-images public URL
 *     ("croissant.jpg", "products/x.jpg", "product-images/products/x.jpg")
 */
export function productImageSrc(url: string | null | undefined): string {
  const v = (url ?? "").trim();
  if (!v) return PLACEHOLDER;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") || v.startsWith("data:")) {
    return v;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return PLACEHOLDER;
  const path = v
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${STORAGE_BUCKETS.productImages}/`), "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS.productImages}/${path}`;
}
