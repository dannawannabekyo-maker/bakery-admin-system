import { getStoreSettings } from "@/lib/data";
import { PageHeader } from "@/components/dashboard-shell";
import { PaymentSettingsForm } from "./settings-form";

export const metadata = { title: "Payment settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <>
      <PageHeader
        title="Payment settings"
        description="Shown to customers on the payment screen. QRIS is a single static image; the bank details are for manual transfers."
      />
      <PaymentSettingsForm settings={settings} />
    </>
  );
}
