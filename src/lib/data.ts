import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CategoryRow,
  OrderItemRow,
  OrderRow,
  OrderStatusEnum,
  ProductRow,
  ProfileRow,
} from "@/lib/supabase/database.types";

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
  limit?: number;
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
