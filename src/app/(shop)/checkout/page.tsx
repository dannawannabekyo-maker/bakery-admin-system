import { requireSession } from "@/lib/auth";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const { profile, email } = await requireSession("/checkout");

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
      />
    </div>
  );
}
