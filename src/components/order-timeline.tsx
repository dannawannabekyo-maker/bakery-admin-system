import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/lib/constants";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { Card } from "@/components/ui";

const STEPS: OrderStatus[] = [
  "UNPAID",
  "PAID",
  "IN_PRODUCTION",
  "READY",
  "COMPLETED",
];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <Card className="border-red-200 bg-red-50/50 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        This order was cancelled.
      </Card>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <Card>
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  done && "bg-green-600 text-white",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-foreground/10 text-foreground/50",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  active ? "font-semibold" : "text-foreground/60",
                )}
              >
                {ORDER_STATUS_LABEL[step]}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mx-1 hidden h-px w-8 bg-border sm:block" />
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
