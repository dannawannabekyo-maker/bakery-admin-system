import Link from "next/link";

import { listAuditLog, AUDIT_ENTITY_TYPES } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { Card, Badge, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import { cn } from "@/lib/cn";

export const metadata = { title: "Activity Log" };
export const dynamic = "force-dynamic";

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity } = await searchParams;
  const validEntity = AUDIT_ENTITY_TYPES.includes(entity as never)
    ? entity
    : undefined;
  const logs = await listAuditLog({ limit: 300, entityType: validEntity });

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="What every account did — logins, order changes, product/user edits, finance entries. Append-only; nothing here can be edited or deleted."
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterChip href="/admin/activity" label="All" active={!validEntity} />
        {AUDIT_ENTITY_TYPES.map((e) => (
          <FilterChip
            key={e}
            href={`/admin/activity?entity=${e}`}
            label={e}
            active={validEntity === e}
          />
        ))}
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="No activity recorded yet"
          description="Actions across the app will start appearing here."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border text-left text-foreground/60">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Who</th>
                <th className="p-3">Action</th>
                <th className="p-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border align-top">
                  <td className="whitespace-nowrap p-3 text-foreground/60">
                    {formatDateTime(l.created_at)}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {l.actor_name ?? "System"}
                    {l.actor_role && (
                      <Badge className="ml-2 bg-foreground/10">{l.actor_role}</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <code className="text-xs text-foreground/60">{l.action}</code>
                  </td>
                  <td className="p-3">{l.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-1.5 font-medium",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-foreground/10 hover:bg-foreground/15",
      )}
    >
      {label}
    </Link>
  );
}
