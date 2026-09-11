import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/constants";
import type { AuditLogRow, Json } from "@/lib/supabase/database.types";

export type AuditInput = {
  actorId: string | null;
  actorName?: string | null;
  actorRole?: Role | null;
  /** Short, UPPER_SNAKE verb, e.g. "ORDER_STATUS_CHANGE", "PRODUCT_UPDATE". */
  action: string;
  /** What kind of thing this is about, e.g. "order", "product", "auth". */
  entityType: string;
  entityId?: string | null;
  /** One human-readable line — this is what the Admin activity log shows. */
  summary: string;
  metadata?: Record<string, unknown> | null;
};

/**
 * Records one row in the append-only `audit_log` table so Admin can see what
 * every other account did (logins, order changes, product/user edits,
 * finance entries, WhatsApp sends, ...).
 *
 * Deliberately fire-and-forget: a logging failure must never break the real
 * action it's describing, so this always resolves and only logs to the
 * server console on error.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_id: input.actorId,
      actor_name: input.actorName ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      summary: input.summary,
      metadata: (input.metadata ?? null) as Json | null,
    });
    if (error) console.error("[audit] insert failed:", error.message);
  } catch (err) {
    console.error("[audit] unexpected failure:", err);
  }
}

/** Known entity types, for the Admin activity log filter UI. */
export const AUDIT_ENTITY_TYPES = [
  "order",
  "product",
  "category",
  "profile",
  "capital_entry",
  "expense",
  "store_settings",
  "auth",
] as const;

export async function listAuditLog(opts?: {
  limit?: number;
  entityType?: string;
}): Promise<AuditLogRow[]> {
  const admin = createAdminClient();
  let q = admin
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 300);
  if (opts?.entityType) q = q.eq("entity_type", opts.entityType);
  const { data } = await q;
  return (data ?? []) as AuditLogRow[];
}
