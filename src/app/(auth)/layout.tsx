import { getStoreSettings } from "@/lib/data";
import { BrandMark } from "@/components/brand-mark";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <BrandMark href="/" className="text-lg font-bold" />
        <div className="space-y-3">
          <h2 className="text-3xl font-bold leading-tight">
            One system for the counter, the kitchen, and the owner.
          </h2>
          <p className="text-primary-foreground/80">
            Ready-stock checkout, pre-orders with pickup dates, a kitchen
            production board, and full owner control.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} {settings.store_name}
        </p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">{children}</div>
      </div>
    </div>
  );
}
