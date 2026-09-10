"use client";

import { useActionState } from "react";

import {
  adminSetOrderStatus,
  adminUpdateOrderMeta,
} from "../../actions";
import { Field, Input, Select, Textarea, Card } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/constants";
import type { OrderWithRelations } from "@/lib/data";

export function OrderAdminPanel({ order }: { order: OrderWithRelations }) {
  const [statusState, statusAction] = useActionState(adminSetOrderStatus, null);
  const [metaState, metaAction] = useActionState(adminUpdateOrderMeta, null);

  const pickupLocal = order.pickup_or_delivery_date
    ? new Date(order.pickup_or_delivery_date).toISOString().slice(0, 16)
    : "";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <h2 className="font-semibold">Force status (any transition)</h2>
        <form action={statusAction} className="flex items-end gap-2">
          <input type="hidden" name="id" value={order.id} />
          <div className="flex-1">
            <Field label="New status">
              <Select name="status" defaultValue={order.status}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <SubmitButton pendingText="Applying…">Apply</SubmitButton>
        </form>
        <Feedback state={statusState} />

        <div className="flex flex-wrap gap-2 pt-2">
          <QuickStatus id={order.id} status="PAID" label="Mark Paid" />
          <QuickStatus id={order.id} status="IN_PRODUCTION" label="→ Production" />
          <QuickStatus id={order.id} status="READY" label="→ Ready" />
          <QuickStatus id={order.id} status="COMPLETED" label="Force Complete" />
          <QuickStatus id={order.id} status="CANCELLED" label="Cancel" danger />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Edit order details</h2>
        <form action={metaAction} className="space-y-3">
          <input type="hidden" name="id" value={order.id} />
          <Field label="Pickup / delivery date">
            <Input
              type="datetime-local"
              name="pickup_or_delivery_date"
              defaultValue={pickupLocal}
            />
          </Field>
          <Field label="Payment method">
            <Input
              name="payment_method"
              defaultValue={order.payment_method ?? ""}
            />
          </Field>
          <Field label="Admin notes">
            <Textarea name="admin_notes" defaultValue={order.admin_notes ?? ""} />
          </Field>
          <SubmitButton pendingText="Saving…">Save details</SubmitButton>
          <Feedback state={metaState} />
        </form>
      </Card>
    </div>
  );
}

function QuickStatus({
  id,
  status,
  label,
  danger,
}: {
  id: string;
  status: string;
  label: string;
  danger?: boolean;
}) {
  const [, action] = useActionState(adminSetOrderStatus, null);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        className={
          "rounded-lg px-3 py-1.5 text-sm font-medium " +
          (danger
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-foreground/10 hover:bg-foreground/15")
        }
      >
        {label}
      </button>
    </form>
  );
}
