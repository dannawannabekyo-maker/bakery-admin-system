import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/orders/new", label: "New Order" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Payments" },
  { href: "/admin/appearance", label: "Appearance" },
  { href: "/finance/receipt-settings", label: "Receipt Settings" },
  { href: "/admin/activity", label: "Activity Log" },
  // God Mode should reach every other dashboard in one click — these were
  // never linked from here before, so Admin had no visible way to open them.
  { href: "/finance", label: "Finance" },
  { href: "/sales", label: "Sales Desk" },
  { href: "/production", label: "Kitchen Board" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("ADMIN", "/admin");
  return (
    <DashboardShell
      title="God Mode"
      role={profile.role}
      userName={profile.full_name || "Owner"}
      nav={NAV}
    >
      {children}
    </DashboardShell>
  );
}
