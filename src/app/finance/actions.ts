"use server";

import { revalidatePath } from "next/cache";

import { assertRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { formatCurrency } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { getStoreSettings } from "@/lib/data";
import type { ReceiptSettings } from "@/lib/receipt-shared";

function revalidateFinance() {
  revalidatePath("/finance", "layout");
}

/** "Rp 1.500.000" / "1500000" / "1,500,000" -> 1500000 */
function parseRupiah(raw: unknown): number {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** Accepts a YYYY-MM-DD string; returns it or null (let the DB default apply). */
function cleanDate(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/* ============================ STARTING CAPITAL ============================ */

export async function addCapital(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["FINANCE", "ADMIN"]);
  const supabase = await createClient();

  const amount = parseRupiah(formData.get("amount"));
  if (amount <= 0) return fail("Masukkan nominal modal yang valid.");

  const entry_date = cleanDate(formData.get("entry_date"));
  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await supabase.from("capital_entries").insert({
    amount,
    note,
    created_by: userId,
    ...(entry_date ? { entry_date } : {}),
  });
  if (error) return fail(error.message);

  revalidateFinance();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "CAPITAL_ADD",
    entityType: "capital_entry",
    summary: `${profile.full_name || "Finance"} recorded starting capital of ${formatCurrency(amount)}`,
  });
  return ok("Modal awal dicatat.");
}

export async function deleteCapital(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["FINANCE", "ADMIN"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: deleted, error } = await supabase
    .from("capital_entries")
    .delete()
    .eq("id", id)
    .select("amount")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidateFinance();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "CAPITAL_DELETE",
    entityType: "capital_entry",
    entityId: id,
    summary: `${profile.full_name || "Finance"} deleted a capital entry of ${formatCurrency(deleted?.amount ?? 0)}`,
  });
  return ok("Entri modal dihapus.");
}

/* ========================== OPERATIONAL EXPENSES ========================== */

export async function addExpense(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["FINANCE", "ADMIN"]);
  const supabase = await createClient();

  const amount = parseRupiah(formData.get("amount"));
  if (amount <= 0) return fail("Masukkan nominal pengeluaran yang valid.");

  const rawCategory = String(formData.get("category") ?? "OPERATIONAL").trim();
  const category = EXPENSE_CATEGORIES.includes(rawCategory as never)
    ? rawCategory
    : "OTHER";
  const spent_at = cleanDate(formData.get("spent_at"));
  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await supabase.from("expenses").insert({
    amount,
    category,
    note,
    created_by: userId,
    ...(spent_at ? { spent_at } : {}),
  });
  if (error) return fail(error.message);

  revalidateFinance();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "EXPENSE_ADD",
    entityType: "expense",
    summary: `${profile.full_name || "Finance"} recorded a ${category} expense of ${formatCurrency(amount)}`,
  });
  return ok("Pengeluaran dicatat.");
}

export async function deleteExpense(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["FINANCE", "ADMIN"]);
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: deleted, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .select("amount")
    .maybeSingle();
  if (error) return fail(error.message);
  revalidateFinance();
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "EXPENSE_DELETE",
    entityType: "expense",
    entityId: id,
    summary: `${profile.full_name || "Finance"} deleted an expense of ${formatCurrency(deleted?.amount ?? 0)}`,
  });
  return ok("Pengeluaran dihapus.");
}

/* ============================ RECEIPT SETTINGS ============================ */
/**
 * Global on/off toggles for the client-generated PDF/WhatsApp nota. These
 * are the only thing persisted here — the receipt itself is never saved to
 * the database or storage, only produced on-device at click time.
 */

/** Read by the one-click "Generate PDF & Send WA" button right before it renders the receipt. */
export async function getReceiptToggleSettings(): Promise<ReceiptSettings> {
  await assertRole(["FINANCE", "ADMIN"]);
  const settings = await getStoreSettings();
  return {
    storeName: settings.store_name,
    showTax: settings.show_tax_on_receipt,
    showLogo: settings.show_logo_on_receipt,
    showPoInstructions: settings.show_po_instructions,
    taxRate: settings.tax_rate,
    logoUrl: settings.brand_logo_url,
  };
}

export async function saveReceiptSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["FINANCE", "ADMIN"]);
  const admin = createAdminClient();

  const patch: Record<string, boolean> = {
    show_tax_on_receipt: formData.get("show_tax_on_receipt") === "on",
    show_logo_on_receipt: formData.get("show_logo_on_receipt") === "on",
    show_po_instructions: formData.get("show_po_instructions") === "on",
  };

  const { error } = await admin
    .from("store_settings")
    .update(patch as never)
    .eq("id", 1);
  if (error) return fail(error.message);

  revalidateFinance();
  revalidatePath("/admin", "layout");
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "RECEIPT_SETTINGS_UPDATE",
    entityType: "store_settings",
    summary: `${profile.full_name || "Finance"} updated the receipt display settings`,
  });
  return ok("Receipt settings saved.");
}
