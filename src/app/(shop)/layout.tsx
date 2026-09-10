import Link from "next/link";

import { getSession, ROLE_HOME } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { CartProvider } from "@/components/cart/cart-context";
import { CartBadge } from "@/components/cart/cart-badge";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const role = session?.profile.role;
  const staffHome =
    role && role !== "CUSTOMER" ? ROLE_HOME[role] : null;

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/shop" className="text-lg font-bold">
              🥐 The Bakery
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/shop"
                className="rounded-lg px-3 py-2 font-medium hover:bg-foreground/10"
              >
                Shop
              </Link>
              <CartBadge />
              {session ? (
                <>
                  <Link
                    href="/orders"
                    className="rounded-lg px-3 py-2 font-medium hover:bg-foreground/10"
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/account"
                    className="rounded-lg px-3 py-2 font-medium hover:bg-foreground/10"
                  >
                    Account
                  </Link>
                  {staffHome && (
                    <Link
                      href={staffHome}
                      className="rounded-lg bg-foreground/10 px-3 py-2 font-medium hover:bg-foreground/15"
                    >
                      {role} dashboard
                    </Link>
                  )}
                  <form action={signOut}>
                    <button className="rounded-lg px-3 py-2 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>

        <footer className="border-t border-border py-6 text-center text-sm text-foreground/50">
          © {new Date().getFullYear()} The Bakery · Order &amp; Administration
          System
        </footer>
      </div>
    </CartProvider>
  );
}
