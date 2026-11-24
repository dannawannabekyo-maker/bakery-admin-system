"use client";

import { useActionState, useState } from "react";

import { adminEditOrderNota } from "../../actions";
import { Input, Select, Textarea, Card } from "@/components/ui";
import { SubmitButton, Feedback } from "@/components/form";
import { formatCurrency } from "@/lib/format";
import { ADDON_KINDS, ADDON_KIND_LABEL, type AddonKind } from "@/lib/addons";
import type { OrderWithRelations } from "@/lib/data";

type ItemLine = {
  id: string;
  name: string;
  isPreorder: boolean;
  quantity: number;
  price: number;
};
type AddonLine = {
  kind: AddonKind;
  name: string;
  description: string;
  contents: { name: string; quantity: number }[];
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

/** Statuses at which READY_STOCK stock has already been deducted. */
const STOCK_DEDUCTED = ["PAID", "IN_PRODUCTION", "READY", "COMPLETED"];

export function EditNotaCard({ order }: { order: OrderWithRelations }) {
  const [state, action] = useActionState(adminEditOrderNota, null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ItemLine[]>(() =>
    order.items.map((it) => ({
      id: it.id,
      name: it.product?.name ?? "—",
      isPreorder: !!it.product?.is_preorder,
      quantity: it.quantity,
      price: it.price_at_time,
    })),
  );
  const [addons, setAddons] = useState<AddonLine[]>(() =>
    (order.addons ?? []).map((a) => ({
      kind: a.kind,
      name: a.name,
      description: a.description ?? "",
      contents: (a.contents ?? []).map((c) => ({ ...c })),
      quantity: a.quantity,
      unitPrice: a.unit_price,
      showOnReceipt: a.show_on_receipt,
    })),
  );

  if (order.status === "CANCELLED") return null;

  const validAddons = addons.filter((a) => a.name.trim());
  const total =
    items.reduce((s, i) => s + i.quantity * i.price, 0) +
    validAddons.reduce((s, a) => s + a.quantity * a.unitPrice, 0);
  const stockNote = STOCK_DEDUCTED.includes(order.status);

  const setItem = (id: string, patch: Partial<ItemLine>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const setAddon = (i: number, patch: Partial<AddonLine>) =>
    setAddons((as) => as.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const setContent = (
    i: number,
    j: number,
    patch: Partial<{ name: string; quantity: number }>,
  ) =>
    setAddon(i, {
      contents: addons[i].contents.map((c, idx) =>
        idx === j ? { ...c, ...patch } : c,
      ),
    });

  if (!open) {
    return (
      <Card className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Edit nota</p>
          <p className="text-sm text-foreground/60">
            Ubah jumlah, harga, item, dan paket/bingkisan — juga setelah pembayaran.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-foreground/10 px-3 py-1.5 text-sm font-medium hover:bg-foreground/15"
        >
          ✏️ Edit nota
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Edit nota — {order.order_number}</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-foreground/60 hover:underline"
        >
          Tutup
        </button>
      </div>

      {stockNote && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Pesanan sudah dibayar: perubahan jumlah produk ready stock otomatis
          menyesuaikan stok (dikurangi/dikembalikan). Kapasitas PO harian tidak
          dicek ulang.
        </p>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={order.id} />
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items.map((i) => ({ id: i.id, quantity: i.quantity, price: i.price })),
          )}
        />
        <input type="hidden" name="addons" value={JSON.stringify(validAddons)} />

        <div className="space-y-2">
          <p className="text-sm font-medium">Item produk</p>
          <p className="text-xs text-foreground/60">
            Jumlah 0 = hapus baris. Untuk menambah produk baru, buat add-on atau
            pesanan baru.
          </p>
          {items.map((it) => (
            <div key={it.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-40 flex-1 text-sm">
                {it.name}
                {it.isPreorder && (
                  <span className="ml-1 text-xs text-purple-600">PO</span>
                )}
              </span>
              <label className="flex items-center gap-1 text-sm">
                Qty
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={it.quantity}
                  onChange={(e) =>
                    setItem(it.id, {
                      quantity: Math.max(0, Math.floor(Number(e.target.value))),
                    })
                  }
                />
              </label>
              <label className="flex items-center gap-1 text-sm">
                Harga
                <Input
                  type="number"
                  min={0}
                  className="w-28"
                  value={it.price}
                  onChange={(e) =>
                    setItem(it.id, {
                      price: Math.max(0, Math.floor(Number(e.target.value))),
                    })
                  }
                />
              </label>
              <span
                className={
                  "w-28 text-right text-sm font-medium " +
                  (it.quantity === 0 ? "text-red-600 line-through" : "")
                }
              >
                {formatCurrency(it.quantity * it.price)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Paket &amp; bingkisan (custom)</p>
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
                  placeholder="Nama"
                  value={a.name}
                  onChange={(e) => setAddon(i, { name: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setAddons((as) => as.filter((_, idx) => idx !== i))}
                  className="text-sm text-red-600 hover:underline"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground/70">Isi paket (opsional)</p>
                {a.contents.map((c, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
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
                    setAddon(i, { contents: [...a.contents, { name: "", quantity: 1 }] })
                  }
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + Tambah isi
                </button>
              </div>

              <Input
                placeholder="Keterangan (opsional)"
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

        <label className="block space-y-1 text-sm font-medium">
          Alasan perubahan (wajib, tercatat di log aktivitas)
          <Textarea name="reason" required placeholder="mis. Customer menambah 2 box setelah transfer" />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground/70">
            Total lama {formatCurrency(order.total_amount)} → baru{" "}
            <b className="text-base text-foreground">{formatCurrency(total)}</b>
          </span>
          <SubmitButton pendingText="Menyimpan…">Simpan perubahan nota</SubmitButton>
        </div>
        <Feedback state={state} />
      </form>
    </Card>
  );
}
