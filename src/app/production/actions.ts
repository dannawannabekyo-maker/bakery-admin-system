"use server";

import { revalidatePath } from "next/cache";

import { assertRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
  await assertRole(["PRODUCTION", "ADMIN"]);

  const id = String(formData.get("id"));
  const target = String(formData.get("target"));
  if (!PRODUCTION_ALLOWED_TARGETS.includes(target as never)) {
    return fail("Production may only set IN_PRODUCTION or READY.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: target as never })
    .eq("id", id);

  if (error) return fail(error.message);
  revalidatePath("/production");
  return ok(`Moved to ${target}.`);
}
