import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

const NAV = [
  { href: "/finance", label: "Recap" },
  { href: "/finance/cash-flow", label: "Cash Flow" },
  { href: "/finance/reports", label: "Reports" },
];

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["FINANCE", "ADMIN"], "/finance");
  return (
    <DashboardShell
      title="Finance"
      role={profile.role}
      userName={profile.full_name || "Finance"}
      nav={NAV}
    >
      {children}
    </DashboardShell>
  );
}
