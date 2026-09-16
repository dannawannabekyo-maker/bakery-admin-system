import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/lib/constants";

export type NavItem = { href: string; label: string };

export function DashboardShell({
  title,
  role,
  userName,
  nav,
  children,
}: {
  title: string;
  role: Role;
  userName: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-muted/40 p-4 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between gap-3 md:mb-6 md:block">
          <BrandMark href="/" className="text-lg font-bold" />
          <p className="mt-1 hidden text-xs uppercase tracking-widest text-primary md:block">
            {title}
          </p>
          {/* Mobile-only theme toggle + account + sign out */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <form action={signOut} className="flex items-center gap-2">
              <span className="max-w-[8rem] truncate text-xs text-foreground/60">
                {userName}
              </span>
              <button className="rounded-md border border-border px-2 py-1 text-xs font-medium text-red-600">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto whitespace-nowrap px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:whitespace-normal md:px-0 md:pb-0">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-foreground/10 hover:text-foreground md:shrink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 hidden border-t border-border pt-4 text-sm md:block">
          <p className="font-medium">{userName}</p>
          <p className="text-xs text-foreground/60">{role}</p>
          <div className="mt-2 flex items-center gap-3">
            <form action={signOut}>
              <button className="text-xs font-medium text-red-600 hover:underline">
                Sign out
              </button>
            </form>
            <ThemeToggle className="ml-auto rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-foreground/10" />
          </div>
        </div>
      </aside>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-foreground/60">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
