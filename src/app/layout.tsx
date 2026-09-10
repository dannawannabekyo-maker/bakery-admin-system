import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Allins Bakery",
    template: "%s · Allins Bakery",
  },
  description:
    "Allins Bakery — online shop, order management, kitchen production board, and owner admin.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
