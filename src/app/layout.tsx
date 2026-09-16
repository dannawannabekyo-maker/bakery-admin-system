import type { Metadata } from "next";
import "./globals.css";

import { getStoreSettings } from "@/lib/data";
import { deriveTheme } from "@/lib/color";
import { ThemeScript } from "@/components/theme-script";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: {
      default: settings.store_name,
      template: `%s · ${settings.store_name}`,
    },
    description: `${settings.store_name} — online shop, order management, kitchen production board, and owner admin.`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getStoreSettings();
  const theme = deriveTheme(settings.theme_primary_color);

  return (
    // data-theme is set by ThemeScript before first paint (light/dark toggle
    // persisted per-viewer) — it will always disagree with this server-
    // rendered markup, which has no attribute yet.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <style>{`:root{--brand-primary:${theme.primary};--brand-primary-foreground:${theme.primaryForeground};--brand-primary-dark:${theme.primaryDark};--brand-primary-foreground-dark:${theme.primaryForegroundDark};}`}</style>
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
