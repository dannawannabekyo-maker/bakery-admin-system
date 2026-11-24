"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Field, Input, Select, Textarea, Card } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import { ADDON_KINDS, ADDON_KIND_LABEL, type AddonKind } from "@/lib/addons";
import type { ProductRow, ProfileRow } from "@/lib/supabase/database.types";

type Line = { productId: string; quantity: number };
type AddonContentLine = { name: string; quantity: number };
type AddonLine = {
  kind: AddonKind;
  name: string;
  description: string;
  contents: AddonContentLine[];
  quantity: number;
  unitPrice: number;
  showOnReceipt: boolean;
};
const newAddon = (kind: AddonKind): AddonLine => ({
  kind,
  name: "",
  description: "",
  contents: [],
  quantity: 1,
  unitPrice: 0,
  showOnReceipt: true,
});
type ManualAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export function ManualOrderForm({
  customers,
  products,
  action,
  allowMarkPaid = true,
  allowCapacityOverride = false,
}: {
  customers: ProfileRow[];
  products: Pick<
    ProductRow,
    "id" | "name" | "price" | "stock" | "is_preorder" | "is_active"
  >[];
  action: ManualAction;
  allowMarkPaid?: boolean;
  /** ADMIN only: let this order skip the nightly PO capacity check. */
  allowCapacityOverride?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1 }]);
  const [addons, setAddons] = useState<AddonLine[]>([]);
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
  const validAddons = addons.filter((a) => a.name.trim());
  const addonTotal = validAddons.reduce(
    (sum, a) => sum + a.unitPrice * a.quantity,
    0,
  );
  const total =
    chosen.reduce(
      (sum, l) => sum + (byId.get(l.productId)?.price ?? 0) * l.quantity,
      0,
    ) + addonTotal;

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((ls) => [...ls, { productId: "", quantity: 1 }]);
  const removeLine = (i: number) =>
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)));

  const setAddon = (i: number, patch: Partial<AddonLine>) =>
    setAddons((as) => as.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const removeAddon = (i: number) =>
    setAddons((as) => as.filter((_, idx) => idx !== i));
  const setContent = (i: number, j: number, patch: Partial<AddonContentLine>) =>
    setAddon(i, {
      contents: addons[i].contents.map((c, idx) =>
        idx === j ? { ...c, ...patch } : c,
      ),
    });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(chosen)} />
      <input type="hidden" name="addons" value={JSON.stringify(validAddons)} />
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

      <div className="space-y-2">
        <p className="text-sm font-medium">Paket &amp; bingkisan (custom)</p>
        <p className="text-xs text-foreground/60">
          Tambahan tagihan: paket berisi beberapa produk, goodybag, parcel, dll.
          Nama, isi, dan harga bebas. Tidak mengurangi stok.
        </p>
        <datalist id="addon-product-names">
          {active.map((prod) => (
            <option key={prod.id} value={prod.name} />
          ))}
        </datalist>
        {addons.map((a, i) => (
          <Card key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                className="w-48"
                value={a.kind}
                onChange={(e) => setAddon(i, { kind: e.target.value as AddonKind })}
              >
                {ADDON_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ADDON_KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
              <Input
                className="flex-1"
                placeholder="Nama (mis. Paket Hampers Lebaran)"
                value={a.name}
                onChange={(e) => setAddon(i, { name: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeAddon(i)}
                className="text-sm text-red-600 hover:underline"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground/70">
                Isi paket (opsional — pilih produk atau ketik bebas)
              </p>
              {a.contents.map((c, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    list="addon-product-names"
                    placeholder="Produk / isi"
                    value={c.name}
                    onChange={(e) => setContent(i, j, { name: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={c.quantity}
                    onChange={(e) =>
                      setContent(i, j, {
                        quantity: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAddon(i, {
                        contents: a.contents.filter((_, idx) => idx !== j),
                      })
                    }
                    className="text-sm text-red-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setAddon(i, {
                    contents: [...a.contents, { name: "", quantity: 1 }],
                  })
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                + Tambah isi
              </button>
            </div>

            <Input
              placeholder="Keterangan (opsional, mis. kemasan, kartu ucapan)"
              value={a.description}
              onChange={(e) => setAddon(i, { description: e.target.value })}
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-sm">
                Harga
                <Input
                  type="number"
                  min={0}
                  className="w-32"
                  value={a.unitPrice}
                  onChange={(e) =>
                    setAddon(i, { unitPrice: Math.max(0, Number(e.target.value)) })
                  }
                />
              </label>
              <label className="flex items-center gap-1 text-sm">
                Jumlah
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={a.quantity}
                  onChange={(e) =>
                    setAddon(i, { quantity: Math.max(1, Number(e.target.value)) })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={a.showOnReceipt}
                  onChange={(e) => setAddon(i, { showOnReceipt: e.target.checked })}
                />
                Tampilkan di nota
              </label>
              <span className="ml-auto text-sm font-medium">
                {formatCurrency(a.unitPrice * a.quantity)}
              </span>
            </div>
          </Card>
        ))}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setAddons((as) => [...as, newAddon("PAKET")])}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Tambah paket
          </button>
          <button
            type="button"
            onClick={() => setAddons((as) => [...as, newAddon("BINGKISAN")])}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Tambah bingkisan / goodybag / parcel
          </button>
        </div>
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
        hint={
          hasPreorder
            ? "Subject to the nightly production capacity, same as the storefront."
            : undefined
        }
      >
        <Input
          name="pickup_or_delivery_date"
          type="datetime-local"
          required={hasPreorder}
        />
      </Field>

      {hasPreorder && allowCapacityOverride && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="bypass_capacity" />
          Override nightly capacity for this order (Admin only)
        </label>
      )}

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
