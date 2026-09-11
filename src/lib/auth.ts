import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/database.types";
import type { Role } from "@/lib/constants";

export type SessionContext = {
  userId: string;
  email: string | null;
  profile: ProfileRow;
};

/** Landing route for each role after login. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  SALES: "/sales",
  PRODUCTION: "/production",
  FINANCE: "/finance",
  CUSTOMER: "/shop",
};

/** Returns the signed-in user + profile, or null. Never throws. */
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { userId: user.id, email: user.email ?? null, profile };
}

/** Require a signed-in user; redirect to /login otherwise. */
export async function requireSession(
  nextPath = "/",
): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}

/** Require one of `roles`; redirect home (or /login) otherwise. */
export async function requireRole(
  roles: Role | Role[],
  nextPath = "/",
): Promise<SessionContext> {
  const session = await requireSession(nextPath);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.profile.role)) {
    redirect(ROLE_HOME[session.profile.role] ?? "/");
  }
  return session;
}

/** Throwing guard for server actions / route handlers (no redirect). */
export async function assertRole(roles: Role | Role[]): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.profile.role)) {
    throw new Error("Forbidden: insufficient role");
  }
  return session;
}
