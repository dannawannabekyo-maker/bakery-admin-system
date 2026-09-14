import { getStoreSettings } from "@/lib/data";
import { PageHeader } from "@/components/dashboard-shell";
import { ReceiptSettingsForm } from "./receipt-settings-form";

export const metadata = { title: "Receipt settings" };
export const dynamic = "force-dynamic";

export default async function ReceiptSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <>
      <PageHeader
        title="Receipt settings"
        description="Global toggles for the PDF nota and WhatsApp text generated from the order list. Nothing here is saved as a file — only these preferences persist."
      />
      <ReceiptSettingsForm settings={settings} />
    </>
  );
}
