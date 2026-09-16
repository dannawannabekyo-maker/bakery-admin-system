import Link from "next/link";

import { getSession, ROLE_HOME } from "@/lib/auth";
import { getStoreSettings } from "@/lib/data";
import { signOut } from "@/app/(auth)/actions";
import { CartProvider } from "@/components/cart/cart-context";
import { CartBadge } from "@/components/cart/cart-badge";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, settings] = await Promise.all([getSession(), getStoreSettings()]);
  const role = session?.profile.role;
  const staffHome =
    role && role !== "CUSTOMER" ? ROLE_HOME[role] : null;

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <BrandMark
              href="/shop"
              className="shrink-0 text-base font-bold sm:text-lg"
            />
            <nav className="-mr-1 flex flex-1 items-center justify-end gap-0.5 overflow-x-auto whitespace-nowrap pl-1 text-sm [&>*]:shrink-0 [&_a]:shrink-0 sm:gap-1">
              <Link
                href="/shop"
                className="rounded-lg px-3 py-2 font-medium hover:bg-foreground/10"
              >
                Shop
              </Link>
              <CartBadge />
              <ThemeToggle className="rounded-lg px-2 py-2 text-xs font-medium hover:bg-foreground/10" />
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
          © {new Date().getFullYear()} {settings.store_name}
        </footer>
      </div>
    </CartProvider>
  );
}
