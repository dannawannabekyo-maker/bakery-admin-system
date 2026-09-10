import { STORAGE_BUCKETS } from "@/lib/constants";

const PLACEHOLDER = "/placeholder-product.svg";

/** Pull the file id out of the common Google Drive link shapes. */
function googleDriveId(v: string): string | null {
  const m = v.match(
    /drive\.google\.com\/(?:file\/d\/|.*[?&]id=|open\?id=|uc\?id=)([\w-]{20,})/,
  );
  return m ? m[1] : null;
}

/**
 * Normalise a stored image value to something usable, or "" if there is
 * nothing. Handles:
 *   - Google Drive share links → embeddable lh3.googleusercontent.com URL
 *     (the file must be shared "Anyone with the link")
 *   - full URLs / root-relative / data: URIs → unchanged
 *   - a bare product-images bucket path → the bucket's public URL
 */
export function resolveImageUrl(url: string | null | undefined): string {
  const v = (url ?? "").trim();
  if (!v) return "";

  const driveId = googleDriveId(v);
  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}=w1200`;

  if (/^(https?:)?\/\//i.test(v) || v.startsWith("/") || v.startsWith("data:")) {
    return v;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  const path = v
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${STORAGE_BUCKETS.productImages}/`), "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS.productImages}/${path}`;
}

/** Same as resolveImageUrl but falls back to the local placeholder for <img src>. */
export function productImageSrc(url: string | null | undefined): string {
  return resolveImageUrl(url) || PLACEHOLDER;
}
