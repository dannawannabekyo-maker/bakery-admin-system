import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

const NAV = [{ href: "/production", label: "Production Board" }];

export default async function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(["PRODUCTION", "ADMIN"], "/production");
  return (
    <DashboardShell
      title="Kitchen"
      role={profile.role}
      userName={profile.full_name || "Kitchen"}
      nav={NAV}
    >
      {children}
    </DashboardShell>
  );
}
