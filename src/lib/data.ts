import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CategoryRow,
  OrderItemRow,
  OrderRow,
  OrderStatusEnum,
  ProductRow,
  ProfileRow,
  StoreSettingsRow,
} from "@/lib/supabase/database.types";
import {
  STORAGE_BUCKETS,
  DEFAULT_TAX_RATE,
  DEFAULT_DAILY_PO_ITEM_CAPACITY,
  DEFAULT_STORE_NAME,
  DEFAULT_PRIMARY_COLOR,
} from "@/lib/constants";

export type ProductWithCategory = ProductRow & {
  category: Pick<CategoryRow, "id" | "name" | "slug"> | null;
};

export type OrderWithRelations = OrderRow & {
  customer: Pick<ProfileRow, "id" | "full_name" | "phone_number" | "address"> | null;
  creator: Pick<ProfileRow, "id" | "full_name" | "role"> | null;
  items: (OrderItemRow & {
    product: Pick<ProductRow, "id" | "name" | "is_preorder"> | null;
  })[];
};

/** True for a login-free guest checkout order (no linked customer account). */
export function isGuestOrder(order: Pick<OrderWithRelations, "customer_id">): boolean {
  return order.customer_id === null;
}

/* ------------------------------------------------------------------ catalog */

export async function getActiveCatalog() {
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("products")
      .select("*, category:categories(id,name,slug)")
      .eq("is_active", true)
      .order("name"),
  ]);
  return {
    categories: (categories ?? []) as CategoryRow[],
    products: (products ?? []) as ProductWithCategory[],
  };
}

export async function getProductById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, category:categories(id,name,slug)")
    .eq("id", id)
    .maybeSingle();
  return data as ProductWithCategory | null;
}

/**
 * PUBLIC, cookie-free catalog reads for the customer-facing shop pages only.
 * `getActiveCatalog`/`getProductById` above go through the RLS (cookie) client,
 * which makes Next.js treat the page as dynamic on every request even though
 * the result never depends on who's asking. These use the service-role client
 * but are hand-restricted to `is_active = true` — the exact same rows an
 * anonymous visitor could already see — so the calling page can be cached
 * (ISR) instead of forced dynamic. Never use these outside the public shop.
 */
export async function getPublicCatalog() {
  const admin = createAdminClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    admin.from("categories").select("*").order("name"),
    admin
      .from("products")
      .select("*, category:categories(id,name,slug)")
      .eq("is_active", true)
      .order("name"),
  ]);
  return {
    categories: (categories ?? []) as CategoryRow[],
    products: (products ?? []) as ProductWithCategory[],
  };
}

export async function getPublicProductById(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select("*, category:categories(id,name,slug)")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  return data as ProductWithCategory | null;
}

/* ----------------------------------------------------------------- products */
/** Admin view — every product incl. inactive. Uses service role (God Mode). */
export async function getAllProductsAdmin() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select("*, category:categories(id,name,slug)")
    .order("created_at", { ascending: false });
  return (data ?? []) as ProductWithCategory[];
}

export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("name");
  return (data ?? []) as CategoryRow[];
}

/* ------------------------------------------------------------------- orders */

const ORDER_SELECT =
  "*, customer:profiles!orders_customer_id_fkey(id,full_name,phone_number,address), creator:profiles!orders_created_by_fkey(id,full_name,role), items:order_items(*, product:products(id,name,is_preorder))";

export async function getOrder(id: string, opts?: { admin?: boolean }) {
  const supabase = opts?.admin ? createAdminClient() : await createClient();
  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  return (data as OrderWithRelations | null) ?? null;
}

export async function listOrders(opts?: {
  admin?: boolean;
  statuses?: string[];
  customerId?: string;
  /** Who took/placed the order (orders.created_by) — a Sales rep's own manual orders, say. */
  createdBy?: string;
  /** Fetch exactly these order ids (e.g. a set resolved from the finance_orders view). */
  ids?: string[];
  limit?: number;
  /** created_at range, ISO instants — inclusive start, exclusive end. */
  from?: string;
  to?: string;
}) {
  const supabase = opts?.admin ? createAdminClient() : await createClient();
  let q = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (opts?.statuses?.length)
    q = q.in("status", opts.statuses as OrderStatusEnum[]);
  if (opts?.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts?.createdBy) q = q.eq("created_by", opts.createdBy);
  if (opts?.ids) q = q.in("id", opts.ids);
  if (opts?.from) q = q.gte("created_at", opts.from);
  if (opts?.to) q = q.lt("created_at", opts.to);

  const { data } = await q;
  return (data ?? []) as OrderWithRelations[];
}

/* ------------------------------------------------------------------- people */

export async function listCustomers() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .eq("role", "CUSTOMER")
    .order("full_name");
  return (data ?? []) as ProfileRow[];
}

export async function listAllProfiles() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as ProfileRow[];
}

/* --------------------------------------------------------- settings & payment */

/**
 * The single store_settings row (QRIS + bank details + branding). Readable
 * by everyone. `cache()`-wrapped because the root layout, every dashboard
 * shell, and the shop/auth headers all read it once per request to render
 * the site name/logo/theme color — this dedupes those into one DB round trip.
 */
export const getStoreSettings = cache(async (): Promise<StoreSettingsRow> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (
    (data as StoreSettingsRow | null) ?? {
      id: 1,
      qris_image_url: null,
      qris_merchant_name: null,
      bank_name: null,
      bank_account_number: null,
      bank_account_holder: null,
      payment_note: null,
      tax_rate: DEFAULT_TAX_RATE,
      daily_po_item_capacity: DEFAULT_DAILY_PO_ITEM_CAPACITY,
      show_tax_on_receipt: true,
      show_logo_on_receipt: true,
      show_po_instructions: true,
      brand_logo_url: null,
      store_name: DEFAULT_STORE_NAME,
      theme_primary_color: DEFAULT_PRIMARY_COLOR,
      sales_whatsapp_number: null,
      sales_whatsapp_label: null,
      updated_at: new Date(0).toISOString(),
    }
  );
});

/**
 * Signed URL for a payment-receipt object. Returns null for legacy reference
 * strings (e.g. "SIM-…", "OFFLINE-…") that are not real storage paths.
 */
export async function getReceiptSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path || !path.includes("/")) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(STORAGE_BUCKETS.paymentReceipts)
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
