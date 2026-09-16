import { requireRole } from "@/lib/auth";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { RealtimeOrdersRefresh } from "@/components/realtime-orders-refresh";

const BASE_NAV: NavItem[] = [
  { href: "/sales", label: "Incoming Orders" },
  { href: "/sales/orders/new", label: "New Manual Order" },
  { href: "/sales/recap", label: "Recap" },
];

// Store-wide visibility + the exportable sales report are Sales Manager
// (and Admin) territory only — plain Sales stays scoped to its own recap.
const MANAGER_NAV: NavItem[] = [{ href: "/sales/report", label: "Sales Report" }];

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["SALES", "SALES_MANAGER", "ADMIN"], "/sales");
  const nav =
    profile.role === "SALES_MANAGER" || profile.role === "ADMIN"
      ? [...BASE_NAV, ...MANAGER_NAV]
      : BASE_NAV;

  return (
    <DashboardShell
      title="Sales Desk"
      role={profile.role}
      userName={profile.full_name || "Sales"}
      nav={nav}
    >
      <RealtimeOrdersRefresh />
      {children}
    </DashboardShell>
  );
}
