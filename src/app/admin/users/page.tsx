import { listAllProfiles } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { PageHeader } from "@/components/dashboard-shell";
import { getSession } from "@/lib/auth";
import { deleteUser } from "../actions";
import { CreateUserForm, EditUserForm } from "./user-forms";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const roleStyles: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  SALES: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  PRODUCTION:
    "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  CUSTOMER: "bg-foreground/10 text-foreground",
};

export default async function AdminUsersPage() {
  const [profiles, session] = await Promise.all([
    listAllProfiles(),
    getSession(),
  ]);

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts via the Supabase Admin API and assign roles."
      />

      <Card>
        <h2 className="mb-3 font-semibold">Create account</h2>
        <CreateUserForm />
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-foreground/60">
            <tr>
              <th className="p-3">Name / edit</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Role</th>
              <th className="p-3">Joined</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-border align-top">
                <td className="p-3">
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {p.full_name || "(no name)"}
                      {p.id === session?.userId && (
                        <span className="ml-2 text-xs text-foreground/50">
                          you
                        </span>
                      )}
                    </summary>
                    <div className="mt-3 max-w-2xl">
                      <EditUserForm profile={p} />
                    </div>
                  </details>
                </td>
                <td className="p-3">{p.phone_number ?? "—"}</td>
                <td className="p-3">
                  <Badge className={roleStyles[p.role]}>{p.role}</Badge>
                </td>
                <td className="p-3">{formatDate(p.created_at)}</td>
                <td className="p-3 text-right">
                  {p.id !== session?.userId && (
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton
                        message={`Delete ${p.full_name || p.id}? This removes their auth account.`}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
