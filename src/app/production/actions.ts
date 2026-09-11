"use server";

import { revalidatePath } from "next/cache";

import { assertRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { PRODUCTION_ALLOWED_TARGETS } from "@/lib/constants";

/**
 * Kitchen status move. RLS + the enforce_order_transition trigger guarantee
 * PRODUCTION can only walk PAID -> IN_PRODUCTION -> READY; this is the
 * app-level guard on top.
 */
export async function advanceProduction(
  formData: FormData,
): Promise<ActionResult> {
  const { userId, profile } = await assertRole(["PRODUCTION", "ADMIN"]);

  const id = String(formData.get("id"));
  const target = String(formData.get("target"));
  if (!PRODUCTION_ALLOWED_TARGETS.includes(target as never)) {
    return fail("Production may only set IN_PRODUCTION or READY.");
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: target as never })
    .eq("id", id)
    .select("order_number")
    .maybeSingle();

  if (error) return fail(error.message);
  revalidatePath("/production");
  await logAudit({
    actorId: userId,
    actorName: profile.full_name,
    actorRole: profile.role,
    action: "ORDER_STATUS_CHANGE",
    entityType: "order",
    entityId: id,
    summary: `${profile.full_name || "Kitchen"} moved order ${updated?.order_number ?? id} to ${target}`,
  });
  return ok(`Moved to ${target}.`);
}
