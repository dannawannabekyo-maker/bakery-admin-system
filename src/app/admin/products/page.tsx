import { getAllProductsAdmin, getCategories } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { Card, Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/form";
import { PageHeader } from "@/components/dashboard-shell";
import { deleteProduct } from "../actions";
import { ProductForm } from "./product-form";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getAllProductsAdmin(),
    getCategories(),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description="Full CRUD. Changes publish to the shop immediately."
      />

      <Card>
        <h2 className="mb-3 font-semibold">New product</h2>
        <ProductForm categories={categories} />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-foreground/60">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Type</th>
              <th className="p-3">State</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border align-top">
                <td className="p-3">
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {p.name}
                    </summary>
                    <div className="mt-3 max-w-2xl">
                      <ProductForm product={p} categories={categories} />
                    </div>
                  </details>
                </td>
                <td className="p-3">{p.category?.name ?? "—"}</td>
                <td className="p-3">{formatCurrency(p.price)}</td>
                <td className="p-3">{p.is_preorder ? "—" : p.stock}</td>
                <td className="p-3">
                  {p.is_preorder ? (
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300">
                      Pre-order
                    </Badge>
                  ) : (
                    <Badge className="bg-foreground/10">Ready stock</Badge>
                  )}
                </td>
                <td className="p-3">
                  {p.is_active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-foreground/50">Hidden</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton message={`Delete "${p.name}"?`}>
                      Delete
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-foreground/60">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
