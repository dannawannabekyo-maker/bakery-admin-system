"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrder } from "@/lib/orders-server";
import { fail, ok, slugify, type ActionResult } from "@/lib/action-result";
import { ORDER_STATUSES, ROLES, STORAGE_BUCKETS } from "@/lib/constants";

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
}

/* ============================ PRODUCTS ============================ */

export async function saveProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertRole("ADMIN");
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
  } else if (imageUrl && !/^(https?:)?\/\//i.test(imageUrl) && !imageUrl.startsWith("/")) {
    // A bare bucket path like "products/x.jpg" → store the full public URL.
    imageUrl = admin.storage
      .from(STORAGE_BUCKETS.productImages)
      .getPublicUrl(imageUrl.replace(new RegExp(`^${STORAGE_BUCKETS.productImages}/`), ""))
      .data.publicUrl;
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
  return ok(id ? "Product updated." : "Product created.");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await assertRole("ADMIN");
  const admin = createAdminClient();
  await admin.from("products").delete().eq("id", String(formData.get("id")));
  revalidateAdmin();
  revalidatePath("/shop");
}

/* ============================ CATEGORIES ============================ */

export async function saveCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertRole("ADMIN");
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
  return ok(id ? "Category updated." : "Category created.");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await assertRole("ADMIN");
  const admin = createAdminClient();
  await admin.from("categories").delete().eq("id", String(formData.get("id")));
  revalidateAdmin();
  revalidatePath("/shop");
}

/* ============================ ORDERS (God Mode) ============================ */

export async function adminSetOrderStatus(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!ORDER_STATUSES.includes(status as never)) return fail("Unknown status.");

  const { error } = await admin
    .from("orders")
    .update({ status: status as never })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidateAdmin();
  revalidatePath(`/admin/orders/${id}`);
  return ok(`Status set to ${status}.`);
}

export async function adminUpdateOrderMeta(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));

  const rawDate = String(formData.get("pickup_or_delivery_date") ?? "").trim();
  const patch = {
    admin_notes: String(formData.get("admin_notes") ?? "").trim() || null,
    payment_method: String(formData.get("payment_method") ?? "").trim() || null,
    pickup_or_delivery_date: rawDate ? new Date(rawDate).toISOString() : null,
  };

  const { error } = await admin.from("orders").update(patch).eq("id", id);
  if (error) return fail(error.message);
  revalidateAdmin();
  revalidatePath(`/admin/orders/${id}`);
  return ok("Order updated.");
}

export async function adminDeleteOrder(formData: FormData): Promise<void> {
  await assertRole("ADMIN");
  const admin = createAdminClient();
  await admin.from("orders").delete().eq("id", String(formData.get("id")));
  revalidateAdmin();
  redirect("/admin/orders");
}

export async function adminCreateManualOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await assertRole("ADMIN");

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
  return ok(`Order ${res.orderNumber} created.`, `/admin/orders/${res.orderId}`);
}

/* ============================ USERS (Admin API) ============================ */

export async function createUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertRole("ADMIN");
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
  return ok(`${email} created as ${role}.`);
}

export async function updateUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertRole("ADMIN");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const role = String(formData.get("role") ?? "CUSTOMER");
  if (!ROLES.includes(role as never)) return fail("Invalid role.");

  const { error } = await admin
    .from("profiles")
    .update({
      role: role as never,
      full_name: String(formData.get("full_name") ?? "").trim(),
      phone_number: String(formData.get("phone_number") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return fail(error.message);

  const newPassword = String(formData.get("password") ?? "");
  if (newPassword) {
    if (newPassword.length < 8) return fail("Password must be at least 8 characters.");
    const { error: aErr } = await admin.auth.admin.updateUserById(id, {
      password: newPassword,
    });
    if (aErr) return fail(aErr.message);
  }

  revalidateAdmin();
  return ok("User updated.");
}

export async function deleteUser(formData: FormData): Promise<void> {
  const { userId } = await assertRole("ADMIN");
  const id = String(formData.get("id"));
  if (id === userId) return; // never delete yourself
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
  revalidateAdmin();
}

/* ============================ PAYMENT SETTINGS ============================ */

export async function saveStoreSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await assertRole("ADMIN");
  const admin = createAdminClient();

  const patch: Record<string, string | null> = {
    qris_merchant_name:
      String(formData.get("qris_merchant_name") ?? "").trim() || null,
    bank_name: String(formData.get("bank_name") ?? "").trim() || null,
    bank_account_number:
      String(formData.get("bank_account_number") ?? "").trim() || null,
    bank_account_holder:
      String(formData.get("bank_account_holder") ?? "").trim() || null,
    payment_note: String(formData.get("payment_note") ?? "").trim() || null,
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
  return ok("Payment settings saved.");
}
