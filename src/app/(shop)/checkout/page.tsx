import { requireSession } from "@/lib/auth";
import { getDateLoads } from "@/lib/capacity";
import { jakartaDateString } from "@/lib/format";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

/** How far ahead the pre-order date picker offers, in days. */
const PICKUP_WINDOW_DAYS = 21;

export default async function CheckoutPage() {
  const { profile, email } = await requireSession("/checkout");
  const loads = await getDateLoads(jakartaDateString(), PICKUP_WINDOW_DAYS);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <CheckoutForm
        customer={{
          name: profile.full_name,
          phone: profile.phone_number,
          address: profile.address,
          email,
        }}
        loads={loads}
      />
    </div>
  );
}
