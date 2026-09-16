import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Route-prefix -> roles allowed to enter it. */
const PROTECTED: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/sales", roles: ["ADMIN", "SALES", "SALES_MANAGER"] },
  { prefix: "/production", roles: ["ADMIN", "PRODUCTION"] },
  { prefix: "/finance", roles: ["ADMIN", "FINANCE"] },
  {
    prefix: "/account",
    roles: ["ADMIN", "SALES", "SALES_MANAGER", "PRODUCTION", "FINANCE", "CUSTOMER"],
  },
  { prefix: "/checkout", roles: ["CUSTOMER", "ADMIN"] },
  { prefix: "/orders", roles: ["CUSTOMER", "ADMIN", "SALES", "SALES_MANAGER"] },
];

/**
 * Sub-paths that must stay reachable without login even though their parent
 * prefix above is protected — guest checkout. Auth/ownership for these is
 * enforced by the page itself (unguessable order-id = capability, same
 * model as the public `/receipt/[orderId]` nota), not by role/session here.
 */
const PUBLIC_EXCEPTIONS = ["/checkout/guest", "/checkout/payment"];

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  SALES: "/sales",
  SALES_MANAGER: "/sales",
  PRODUCTION: "/production",
  FINANCE: "/finance",
  CUSTOMER: "/shop",
};

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isPublicException = PUBLIC_EXCEPTIONS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const rule = isPublicException
    ? undefined
    : PROTECTED.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));

  // Signed-in users hitting the auth pages -> bounce to their dashboard.
  const onAuthPage = pathname === "/login" || pathname === "/register";

  if (!rule && !onAuthPage) return supabaseResponse;

  if (!user) {
    if (rule) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // We have a user — resolve role (lightweight query via the same cookie session).
  const role = await fetchRole(request);

  if (onAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role ?? "CUSTOMER"] ?? "/shop";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (rule && (!role || !rule.roles.includes(role))) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role ?? "CUSTOMER"] ?? "/shop";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

/** Minimal role lookup that reuses the request's auth cookies. */
async function fetchRole(request: NextRequest): Promise<string | null> {
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    return (data?.role as string) ?? null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
