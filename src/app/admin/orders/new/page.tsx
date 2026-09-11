import { listCustomers } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import { ManualOrderForm } from "@/components/manual-order-form";
import { adminCreateManualOrder } from "../../actions";

export const metadata = { title: "New order" };
export const dynamic = "force-dynamic";

export default async function AdminNewOrderPage() {
  const admin = createAdminClient();
  const [customers, { data: products }] = await Promise.all([
    listCustomers(),
    admin
      .from("products")
      .select("id,name,price,stock,is_preorder,is_active")
      .order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Manual order"
        description="Create an order on behalf of any customer. Optionally mark it paid."
      />
      <Card className="max-w-2xl">
        <ManualOrderForm
          customers={customers}
          products={products ?? []}
          action={adminCreateManualOrder}
          allowCapacityOverride
        />
      </Card>
    </>
  );
}
