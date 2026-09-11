import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { RealtimeOrdersRefresh } from "@/components/realtime-orders-refresh";

const NAV = [
  { href: "/sales", label: "Incoming Orders" },
  { href: "/sales/orders/new", label: "New Manual Order" },
];

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["SALES", "ADMIN"], "/sales");
  return (
    <DashboardShell
      title="Sales Desk"
      role={profile.role}
      userName={profile.full_name || "Sales"}
      nav={NAV}
    >
      <RealtimeOrdersRefresh />
      {children}
    </DashboardShell>
  );
}
