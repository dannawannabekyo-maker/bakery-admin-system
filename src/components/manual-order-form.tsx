"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Field, Input, Select, Textarea, Card } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import type { ProductRow, ProfileRow } from "@/lib/supabase/database.types";

type Line = { productId: string; quantity: number };
type ManualAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export function ManualOrderForm({
  customers,
  products,
  action,
  allowMarkPaid = true,
}: {
  customers: ProfileRow[];
  products: Pick<
    ProductRow,
    "id" | "name" | "price" | "stock" | "is_preorder" | "is_active"
  >[];
  action: ManualAction;
  allowMarkPaid?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1 }]);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const active = products.filter((p) => p.is_active);
  const byId = useMemo(
    () => new Map(active.map((p) => [p.id, p])),
    [active],
  );

  const chosen = lines.filter((l) => l.productId && l.quantity > 0);
  const hasPreorder = chosen.some((l) => byId.get(l.productId)?.is_preorder);
  const total = chosen.reduce(
    (sum, l) => sum + (byId.get(l.productId)?.price ?? 0) * l.quantity,
    0,
  );

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((ls) => [...ls, { productId: "", quantity: 1 }]);
  const removeLine = (i: number) =>
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(chosen)} />
      <Feedback state={state} />

      <Field label="Customer">
        <Select name="customer_id" required defaultValue="">
          <option value="" disabled>
            Select a customer…
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name || "(no name)"}
              {c.phone_number ? ` · ${c.phone_number}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium">Items</p>
        {lines.map((line, i) => {
          const p = byId.get(line.productId);
          return (
            <div key={i} className="flex items-center gap-2">
              <Select
                className="flex-1"
                value={line.productId}
                onChange={(e) => setLine(i, { productId: e.target.value })}
              >
                <option value="">— choose product —</option>
                {active.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} · {formatCurrency(prod.price)}
                    {prod.is_preorder
                      ? " (PO)"
                      : ` · stock ${prod.stock}`}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                className="w-20"
                value={line.quantity}
                onChange={(e) =>
                  setLine(i, { quantity: Math.max(1, Number(e.target.value)) })
                }
              />
              <span className="w-24 text-right text-sm text-foreground/70">
                {p ? formatCurrency(p.price * line.quantity) : "—"}
              </span>
              <button
                type="button"
                onClick={() => removeLine(i)}
                className="text-sm text-red-600 hover:underline"
              >
                ✕
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addLine}
          className="text-sm font-medium text-primary hover:underline"
        >
          + Add item
        </button>
      </div>

      <Card className="flex items-center justify-between bg-muted/40">
        <span className="text-sm text-foreground/70">
          {hasPreorder ? "Pre-order — date required" : "Ready stock"}
        </span>
        <span className="text-lg font-bold">{formatCurrency(total)}</span>
      </Card>

      <Field
        label={
          hasPreorder
            ? "Pickup / delivery date (required)"
            : "Pickup / delivery date (optional)"
        }
      >
        <Input
          name="pickup_or_delivery_date"
          type="datetime-local"
          required={hasPreorder}
        />
      </Field>

      <Field label="Notes">
        <Textarea name="admin_notes" placeholder="Offline customer, phone order, etc." />
      </Field>

      {allowMarkPaid && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="mark_paid" />
            Mark as PAID now (offline payment received)
          </label>
          <Field label="Payment method">
            <Input name="payment_method" placeholder="CASH / TRANSFER / CARD" />
          </Field>
        </div>
      )}

      <SubmitButton pendingText="Creating order…">Create order</SubmitButton>
    </form>
  );
}
