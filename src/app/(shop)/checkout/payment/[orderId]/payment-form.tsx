"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { simulatePayment } from "../../actions";
import { formatCurrency } from "@/lib/format";
import { Card, Field, Input, Select } from "@/components/ui";
import { Feedback } from "@/components/form";

export function PaymentForm({
  orderId,
  amount,
}: {
  orderId: string;
  amount: number;
}) {
  const [state, action] = useActionState(simulatePayment, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="order_id" value={orderId} />

      <Card className="space-y-3">
        <Field label="Payment method">
          <Select name="method" defaultValue="SIMULATED_GATEWAY">
            <option value="SIMULATED_GATEWAY">Card (simulated)</option>
            <option value="SIMULATED_WALLET">E-wallet (simulated)</option>
            <option value="SIMULATED_TRANSFER">Bank transfer (simulated)</option>
          </Select>
        </Field>
        <Field label="Card number">
          <Input placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry">
            <Input placeholder="12/30" defaultValue="12/30" />
          </Field>
          <Field label="CVC">
            <Input placeholder="123" defaultValue="123" />
          </Field>
        </div>
        <p className="text-xs text-foreground/50">
          Demo only. These fields are not sent or validated.
        </p>
      </Card>

      <Feedback state={state} />

      <Buttons amount={amount} />

      <p className="text-center text-xs text-foreground/50">
        On success the order moves to <strong>Paid</strong> and stock is deducted
        automatically.
      </p>
    </form>
  );
}

function Buttons({ amount }: { amount: number }) {
  const { pending } = useFormStatus();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="submit"
        name="outcome"
        value="success"
        disabled={pending}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Contacting gateway…" : `Pay ${formatCurrency(amount)}`}
      </button>
      <button
        type="submit"
        name="outcome"
        value="fail"
        disabled={pending}
        className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-60"
      >
        Simulate failed payment
      </button>
    </div>
  );
}
