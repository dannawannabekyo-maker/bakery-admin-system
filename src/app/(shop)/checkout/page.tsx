import { requireSession } from "@/lib/auth";
import { getDateLoads } from "@/lib/capacity";
import { getStoreSettings } from "@/lib/data";
import { jakartaDateString } from "@/lib/format";
import { storeClosedMessage } from "@/lib/store-status";
import { Alert } from "@/components/ui";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

/** How far ahead the pre-order date picker offers, in days. */
const PICKUP_WINDOW_DAYS = 21;

export default async function CheckoutPage() {
  const { profile, email } = await requireSession("/checkout");
  const [settings, loads] = await Promise.all([
    getStoreSettings(),
    getDateLoads(jakartaDateString(), PICKUP_WINDOW_DAYS),
  ]);
  const closedMessage = storeClosedMessage(settings);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {closedMessage ? (
        <Alert tone="error">{closedMessage}</Alert>
      ) : (
        <CheckoutForm
          customer={{
            name: profile.full_name,
            phone: profile.phone_number,
            address: profile.address,
            email,
          }}
          loads={loads}
        />
      )}
    </div>
  );
}
