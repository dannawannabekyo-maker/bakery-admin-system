import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/orders/new", label: "New Order" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/users", label: "Users" },
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
