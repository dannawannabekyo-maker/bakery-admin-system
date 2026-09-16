"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder } from "@/lib/orders-server";
import { logAudit } from "@/lib/audit";
import { fail, ok, slugify, type ActionResult } from "@/lib/action-result";
import { ORDER_STATUSES, ROLES, STORAGE_BUCKETS } from "@/lib/constants";
import { resolveImageUrl } from "@/lib/images";
import { normalizeHex } from "@/lib/color";
import { normalizePhone } from "@/lib/format";

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
}

/* ============================ PRODUCTS ============================ */

export async function saveProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole("ADMIN");
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "");

  // Image: an uploaded file wins; otherwise the (normalised) URL/path field.
  let imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const file = formData.get("image") as File | null;
  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return fail("Product image must be an image file.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return fail("Product image must be 5 MB or smaller.");
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(STORAGE_BUCKETS.productImages)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return fail(`Upload failed: ${upErr.message}`);
    imageUrl = admin.storage
      .from(STORAGE_BUCKETS.productImages)
      .getPublicUrl(path).data.publicUrl;
  } else if (imageUrl) {
    // Normalise a Google Drive link / bare bucket path to a usable URL.
    imageUrl = resolveImageUrl(imageUrl) || null;
  }

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price: Math.max(0, Math.round(Number(formData.get("price") ?? 0))),
    category_id: String(formData.get("category_id") ?? "") || null,
    image_url: imageUrl,
    is_preorder: formData.get("is_preorder") === "on",
    stock: Math.max(0, Math.round(Number(formData.get("stock") ?? 0))),
    is_active: formData.get("is_active") === "on",
  };

  if (!payload.name) return fail("Product name is required.");

  const res = id
    ? await admin.from("products").update(payload).eq("id", id)
    : await admin.from("products").insert(payload);

  if (res.error) return fail(res.error.message);
  revalidateAdmin();
  revalidatePath("/shop");
  if (id) revalidatePath(`/product/${id}`);
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: id ? "PRODUCT_UPDATE" : "PRODUCT_CREATE",
    entityType: "product",
    entityId: id || undefined,
    summary: `${profile.full_name || "Admin"} ${id ? "updated" : "created"} product "${payload.name}"`,
    metadata: payload,
  });
  return ok(id ? "Product updated." : "Product created.");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const { userId, profile } = await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const { data: deleted } = await admin
    .from("products")
    .delete()
    .eq("id", id)
    .select("name")
    .maybeSingle();
  revalidateAdmin();
  revalidatePath("/shop");
  revalidatePath(`/product/${id}`);
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "PRODUCT_DELETE",
    entityType: "product",
    entityId: id,
    summary: `${profile.full_name || "Admin"} deleted product "${deleted?.name ?? id}"`,
  });
}

/* ============================ CATEGORIES ============================ */

export async function saveCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole("ADMIN");
  const admin = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Category name is required.");
  const slug =
    String(formData.get("slug") ?? "").trim() || slugify(name);

  const res = id
    ? await admin.from("categories").update({ name, slug }).eq("id", id)
    : await admin.from("categories").insert({ name, slug });

  if (res.error) return fail(res.error.message);
  revalidateAdmin();
  revalidatePath("/shop");
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: id ? "CATEGORY_UPDATE" : "CATEGORY_CREATE",
    entityType: "category",
    entityId: id || undefined,
    summary: `${profile.full_name || "Admin"} ${id ? "updated" : "created"} category "${name}"`,
  });
  return ok(id ? "Category updated." : "Category created.");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const { userId, profile } = await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const { data: deleted } = await admin
    .from("categories")
    .delete()
    .eq("id", id)
    .select("name")
    .maybeSingle();
  revalidateAdmin();
  revalidatePath("/shop");
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "CATEGORY_DELETE",
    entityType: "category",
    entityId: id,
    summary: `${profile.full_name || "Admin"} deleted category "${deleted?.name ?? id}"`,
  });
}

/* ============================ ORDERS (God Mode) ============================ */

export async function adminSetOrderStatus(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!ORDER_STATUSES.includes(status as never)) return fail("Unknown status.");

  const { data: updated, error } = await admin
    .from("orders")
    .update({ status: status as never })
    .eq("id", id)
    .select("order_number")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidateAdmin();
  revalidatePath(`/admin/orders/${id}`);
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_STATUS_CHANGE",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Admin"} force-set order ${updated?.order_number ?? id} to ${status}`,
  });
  return ok(`Status set to ${status}.`);
}

export async function adminUpdateOrderMeta(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));

  const rawDate = String(formData.get("pickup_or_delivery_date") ?? "").trim();
  const patch = {
    admin_notes: String(formData.get("admin_notes") ?? "").trim() || null,
    payment_method: String(formData.get("payment_method") ?? "").trim() || null,
    pickup_or_delivery_date: rawDate ? new Date(rawDate).toISOString() : null,
  };

  const { data: updated, error } = await admin
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("order_number")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidateAdmin();
  revalidatePath(`/admin/orders/${id}`);
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_META_UPDATE",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Admin"} updated details for order ${updated?.order_number ?? id}`,
    metadata: patch,
  });
  return ok("Order updated.");
}

export async function adminDeleteOrder(formData: FormData): Promise<void> {
  const { userId, profile } = await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const { data: deleted } = await admin
    .from("orders")
    .delete()
    .eq("id", id)
    .select("order_number")
    .maybeSingle();
  revalidateAdmin();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_DELETE",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Admin"} deleted order ${deleted?.order_number ?? id}`,
  });
  redirect("/admin/orders");
}

export async function adminCreateManualOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole("ADMIN");

  const customerId = String(formData.get("customer_id") ?? "");
  if (!customerId) return fail("Choose a customer.");

  let items: { productId: string; quantity: number }[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return fail("Malformed items payload.");
  }

  const pickupRaw = String(formData.get("pickup_or_delivery_date") ?? "").trim();
  const res = await createOrder({
    customerId,
    createdBy: userId,
    items,
    pickupDate: pickupRaw ? new Date(pickupRaw).toISOString() : null,
    adminNotes: String(formData.get("admin_notes") ?? "").trim() || null,
    privileged: true,
    bypassCapacity: formData.get("bypass_capacity") === "on",
  });

  if (!res.ok) return fail(res.error);

  // Optionally mark as paid straight away (offline payment).
  if (formData.get("mark_paid") === "on") {
    const admin = createAdminClient();
    await admin
      .from("orders")
      .update({
        status: "PAID",
        payment_method: String(formData.get("payment_method") ?? "OFFLINE"),
        payment_receipt_url: `MANUAL-${res.orderNumber}`,
      })
      .eq("id", res.orderId);
  }

  revalidateAdmin();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_MANUAL_CREATE",
    entityType: "order",
    entityId: res.orderId,
    summary: `${profile.full_name || "Admin"} created manual order ${res.orderNumber}${formData.get("mark_paid") === "on" ? " (marked paid)" : ""}`,
  });
  return ok(`Order ${res.orderNumber} created.`, `/admin/orders/${res.orderId}`);
}

/* ============================ USERS (Admin API) ============================ */

export async function createUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile: actor } = await assertRole("ADMIN");
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone_number") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const role = String(formData.get("role") ?? "CUSTOMER");

  if (!email || !password) return fail("Email and password are required.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  if (!ROLES.includes(role as never)) return fail("Invalid role.");

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone_number: phone, role, address },
  });
  if (error) return fail(error.message);

  // handle_new_user() inserts the profile; enforce the chosen values.
  const { error: pErr } = await admin
    .from("profiles")
    .update({
      role: role as never,
      full_name: fullName,
      phone_number: phone || null,
      address: address || null,
    })
    .eq("id", data.user.id);
  if (pErr) return fail(`User created, but profile update failed: ${pErr.message}`);

  revalidateAdmin();
  await logAudit({
    actorId: userId,
    actorName: actor.full_name,
    actorRole: actor.role,
    action: "USER_CREATE",
    entityType: "profile",
    entityId: data.user.id,
    summary: `${actor.full_name || "Admin"} created user ${email} as ${role}`,
  });
  return ok(`${email} created as ${role}.`);
}

export async function updateUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile: actor } = await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const role = String(formData.get("role") ?? "CUSTOMER");
  if (!ROLES.includes(role as never)) return fail("Invalid role.");

  const { data: before } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", id)
    .maybeSingle();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const { error } = await admin
    .from("profiles")
    .update({
      role: role as never,
      full_name: fullName,
      phone_number: String(formData.get("phone_number") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return fail(error.message);

  const newPassword = String(formData.get("password") ?? "");
  let passwordReset = false;
  if (newPassword) {
    if (newPassword.length < 8) return fail("Password must be at least 8 characters.");
    const { error: aErr } = await admin.auth.admin.updateUserById(id, {
      password: newPassword,
    });
    if (aErr) return fail(aErr.message);
    passwordReset = true;
  }

  revalidateAdmin();
  const roleChanged = before && before.role !== role;
  await logAudit({
    actorId: userId,
    actorName: actor.full_name,
    actorRole: actor.role,
    action: roleChanged ? "USER_ROLE_CHANGE" : "USER_UPDATE",
    entityType: "profile",
    entityId: id,
    summary: roleChanged
      ? `${actor.full_name || "Admin"} changed ${before?.full_name || fullName}'s role from ${before?.role} to ${role}`
      : `${actor.full_name || "Admin"} updated ${fullName || id}${passwordReset ? " (password reset)" : ""}`,
  });
  return ok("User updated.");
}

export async function deleteUser(formData: FormData): Promise<void> {
  const { userId, profile: actor } = await assertRole("ADMIN");
  const id = String(formData.get("id"));
  if (id === userId) return; // never delete yourself
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", id)
    .maybeSingle();

  await admin.auth.admin.deleteUser(id);
  revalidateAdmin();
  await logAudit({
    actorId: userId,
    actorName: actor.full_name,
    actorRole: actor.role,
    action: "USER_DELETE",
    entityType: "profile",
    entityId: id,
    summary: `${actor.full_name || "Admin"} deleted user ${target?.full_name ?? id} (${target?.role ?? "?"})`,
  });
}

/* ============================ PAYMENT SETTINGS ============================ */

export async function saveStoreSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile: actor } = await assertRole("ADMIN");
  const admin = createAdminClient();

  const taxRatePercent = Number(formData.get("tax_rate_percent") ?? NaN);
  if (!Number.isFinite(taxRatePercent) || taxRatePercent < 0 || taxRatePercent >= 100) {
    return fail("Tax rate must be between 0 and 99.99%.");
  }
  const capacity = Math.round(Number(formData.get("daily_po_item_capacity") ?? NaN));
  if (!Number.isFinite(capacity) || capacity < 0) {
    return fail("Nightly capacity must be a non-negative number.");
  }

  const patch: Record<string, string | number | null> = {
    qris_merchant_name:
      String(formData.get("qris_merchant_name") ?? "").trim() || null,
    bank_name: String(formData.get("bank_name") ?? "").trim() || null,
    bank_account_number:
      String(formData.get("bank_account_number") ?? "").trim() || null,
    bank_account_holder:
      String(formData.get("bank_account_holder") ?? "").trim() || null,
    payment_note: String(formData.get("payment_note") ?? "").trim() || null,
    // store_settings.tax_rate is numeric(5,4) — keep 4 decimal places.
    tax_rate: Math.round((taxRatePercent / 100) * 10000) / 10000,
    daily_po_item_capacity: capacity,
  };

  const file = formData.get("qris_image") as File | null;
  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return fail("QRIS file must be an image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return fail("QRIS image must be 5 MB or smaller.");
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `settings/qris-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(STORAGE_BUCKETS.productImages)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return fail(`Upload failed: ${upErr.message}`);
    const { data: pub } = admin.storage
      .from(STORAGE_BUCKETS.productImages)
      .getPublicUrl(path);
    patch.qris_image_url = pub.publicUrl;
  }

  const { error } = await admin
    .from("store_settings")
    .update(patch as never)
    .eq("id", 1);
  if (error) return fail(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/checkout/payment", "layout");
  await logAudit({
    actorId: userId,
    actorName: actor.full_name,
    actorRole: actor.role,
    action: "SETTINGS_UPDATE",
    entityType: "store_settings",
    entityId: "1",
    summary: `${actor.full_name || "Admin"} updated payment/tax/capacity settings`,
    metadata: {
      tax_rate: patch.tax_rate,
      daily_po_item_capacity: patch.daily_po_item_capacity,
    },
  });
  return ok("Payment settings saved.");
}

/* ============================ APPEARANCE ============================ */
/**
 * Site-wide branding: store name, brand color, brand logo. Applied
 * everywhere via CSS variables the root layout injects from this row (see
 * `@/lib/color`) — the same logo also feeds the printed/WhatsApp nota
 * (`@/lib/receipt-shared`), gated there by the separate `show_logo_on_receipt`
 * toggle on the Receipt Settings page.
 */
export async function saveAppearanceSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile: actor } = await assertRole("ADMIN");
  const admin = createAdminClient();

  const storeName = String(formData.get("store_name") ?? "").trim();
  if (!storeName) return fail("Store name can't be empty.");

  const rawColor = String(formData.get("theme_primary_color") ?? "").trim();
  const primaryColor = normalizeHex(rawColor);
  if (!primaryColor) return fail("Brand color must be a valid hex code, e.g. #a8547f.");

  const rawWhatsapp = String(formData.get("sales_whatsapp_number") ?? "").trim();
  const whatsappNumber = rawWhatsapp ? normalizePhone(rawWhatsapp) : null;
  if (rawWhatsapp && !whatsappNumber) {
    return fail("Sales WhatsApp number doesn't look valid.");
  }
  const whatsappLabel = String(formData.get("sales_whatsapp_label") ?? "").trim() || null;

  const patch: Record<string, string | null> = {
    store_name: storeName,
    theme_primary_color: primaryColor,
    sales_whatsapp_number: whatsappNumber,
    sales_whatsapp_label: whatsappNumber ? whatsappLabel : null,
  };

  const file = formData.get("brand_logo") as File | null;
  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return fail("Logo file must be an image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return fail("Logo image must be 5 MB or smaller.");
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `settings/brand-logo-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(STORAGE_BUCKETS.productImages)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return fail(`Upload failed: ${upErr.message}`);
    const { data: pub } = admin.storage
      .from(STORAGE_BUCKETS.productImages)
      .getPublicUrl(path);
    patch.brand_logo_url = pub.publicUrl;
  } else if (formData.get("remove_brand_logo") === "on") {
    patch.brand_logo_url = null;
  }

  const { error } = await admin
    .from("store_settings")
    .update(patch as never)
    .eq("id", 1);
  if (error) return fail(error.message);

  // Everything reads store_settings through the request-scoped `cache()` in
  // @/lib/data, but that cache doesn't span requests — revalidatePath is what
  // actually busts Next's page/layout cache so the new branding shows up.
  revalidatePath("/", "layout");
  await logAudit({
    actorId: userId,
    actorName: actor.full_name,
    actorRole: actor.role,
    action: "SETTINGS_UPDATE",
    entityType: "store_settings",
    entityId: "1",
    summary: `${actor.full_name || "Admin"} updated appearance settings (name/color/logo)`,
  });
  return ok("Appearance settings saved.");
}
