import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { PageHeader } from "@/components/dashboard-shell";
import { deleteCategory } from "../actions";
import { CategoryForm } from "./category-form";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const admin = createAdminClient();
  const { data: categories } = await admin
    .from("categories")
    .select("*, products(count)")
    .order("name");

  return (
    <>
      <PageHeader title="Categories" description="Group products for the shop." />

      <Card>
        <h2 className="mb-3 font-semibold">New category</h2>
        <CategoryForm />
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-foreground/60">
            <tr>
              <th className="p-3">Name / edit</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Products</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((c) => {
              const count =
                Array.isArray(c.products) && c.products[0]
                  ? (c.products[0] as { count: number }).count
                  : 0;
              return (
                <tr key={c.id} className="border-b border-border align-top">
                  <td className="p-3">
                    <details>
                      <summary className="cursor-pointer font-medium">
                        {c.name}
                      </summary>
                      <div className="mt-3">
                        <CategoryForm category={c} />
                      </div>
                    </details>
                  </td>
                  <td className="p-3 font-mono text-xs">{c.slug}</td>
                  <td className="p-3">{count}</td>
                  <td className="p-3 text-right">
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton
                        message={`Delete "${c.name}"? Products keep existing but lose this category.`}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {(categories ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-foreground/60">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
