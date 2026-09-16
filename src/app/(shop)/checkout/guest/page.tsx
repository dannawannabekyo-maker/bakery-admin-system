import { getDateLoads } from "@/lib/capacity";
import { jakartaDateString } from "@/lib/format";
import { GuestCheckoutForm } from "./guest-checkout-form";

export const metadata = { title: "Checkout tamu" };
export const dynamic = "force-dynamic";

/** How far ahead the pre-order date picker offers, in days. Matches /checkout. */
const PICKUP_WINDOW_DAYS = 21;

export default async function GuestCheckoutPage() {
  const loads = await getDateLoads(jakartaDateString(), PICKUP_WINDOW_DAYS);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Checkout sebagai tamu</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Tanpa perlu akun — cukup nama dan nomor HP. Tim sales akan menghubungi
          Anda untuk konfirmasi pembayaran.
        </p>
      </div>
      <GuestCheckoutForm loads={loads} />
    </div>
  );
}
