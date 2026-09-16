import { getStoreSettings } from "@/lib/data";
import { PageHeader } from "@/components/dashboard-shell";
import { AppearanceForm } from "./appearance-form";

export const metadata = { title: "Appearance" };
export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const settings = await getStoreSettings();

  return (
    <>
      <PageHeader
        title="Appearance"
        description="Store name, brand logo, and brand color — applied everywhere: every dashboard, the shop, the login screen, and the printed/WhatsApp nota."
      />
      <AppearanceForm settings={settings} />
    </>
  );
}
