import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bakery Order & Administration System",
    template: "%s · Bakery Admin",
  },
  description:
    "Order management, kitchen production board, and owner God-Mode admin for a bakery.",
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
