import { listCustomers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Card, Alert } from "@/components/ui";
import { PageHeader } from "@/components/dashboard-shell";
import { ManualOrderForm } from "@/components/manual-order-form";
import { salesCreateManualOrder } from "../../actions";

export const metadata = { title: "New manual order" };
export const dynamic = "force-dynamic";

export default async function SalesNewOrderPage() {
  const supabase = await createClient();
  const [customers, { data: products }] = await Promise.all([
    listCustomers(),
    supabase
      .from("products")
      .select("id,name,price,stock,is_preorder,is_active")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="New manual order"
        description="For phone / walk-in customers. Pick an existing customer account."
      />
      {customers.length === 0 && (
        <Alert tone="info">
          No customer accounts yet. Ask an admin to create one under Users, or the
          customer can self-register.
        </Alert>
      )}
      <Card className="max-w-2xl">
        <ManualOrderForm
          customers={customers}
          products={products ?? []}
          action={salesCreateManualOrder}
        />
      </Card>
    </>
  );
}
