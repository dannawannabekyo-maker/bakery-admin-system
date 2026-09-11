import Link from "next/link";

import { cn } from "@/lib/cn";

/** Opens the public/printable nota (`/receipt/[orderId]`) in a new tab. */
export function ReceiptLink({
  orderId,
  className,
  children = "🧾 Nota",
}: {
  orderId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={`/receipt/${orderId}`}
      target="_blank"
      rel="noreferrer"
      className={cn("text-sm font-medium text-primary underline", className)}
    >
      {children}
    </Link>
  );
}
