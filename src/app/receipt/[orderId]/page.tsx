import { notFound } from "next/navigation";

import { getReceiptData } from "@/lib/receipt";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata = { title: "Nota" };
export const dynamic = "force-dynamic";

/**
 * Public "nota" (receipt) page — deliberately NOT behind auth/RLS.
 *
 * This is the same link shared with the customer over WhatsApp, so it must
 * open straight away on any device without a login prompt. It relies on the
 * order id (a random UUID) as an unguessable capability link, the same
 * pattern payment/e-commerce receipt links commonly use. It is read-only and
 * leaks nothing beyond what's already on the printed/WhatsApp nota itself.
 *
 * Also used in-store: Sales/Admin open + print this for offline/walk-in
 * customers, so the paper nota and the WhatsApp nota are byte-for-byte the
 * same content.
 */
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const data = await getReceiptData(orderId);
  if (!data) notFound();

  const { order, tax, paymentLabel, statusLabel, settings, poLines } = data;

  return (
    <div className="mx-auto min-h-screen max-w-sm bg-background px-4 py-8 text-foreground print:max-w-none print:p-0">
      {/* Thermal-printer friendly by default; a regular printer just centres it on A4. */}
      <style>{`@page { size: 80mm auto; margin: 4mm; }`}</style>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <span className="text-sm text-foreground/60">Nota #{order.order_number}</span>
        <PrintButton />
      </div>

      <div className="space-y-3 rounded-xl border border-border p-5 text-sm print:rounded-none print:border-0 print:p-0">
        <div className="text-center">
          {settings.showLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl || "/logo.svg"}
              alt="Allins Bakery"
              className="mx-auto mb-2 h-14 w-14 object-contain"
            />
          )}
          <p className="text-lg font-bold">🧁 Allins Bakery</p>
          <p className="text-foreground/60">Nota Pembelian</p>
        </div>

        <Divider />

        <Row label="No. Order" value={order.order_number} strong />
        <Row label="Tanggal" value={formatDateTime(order.created_at)} />
        <Row label="Status" value={statusLabel} />

        <Divider />

        <Row label="Pelanggan" value={order.customer?.full_name || "—"} />
        <Row label="Telp" value={order.customer?.phone_number || "—"} />

        <Divider />

        <table className="w-full">
          <thead>
            <tr className="text-left text-foreground/60">
              <th className="pb-1 font-normal">Item</th>
              <th className="pb-1 text-center font-normal">Qty</th>
              <th className="pb-1 text-right font-normal">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td className="py-0.5 pr-2">
                  {it.product?.name ?? "Produk"}
                  {it.product?.is_preorder && (
                    <span className="ml-1 text-xs text-foreground/50">(PO)</span>
                  )}
                </td>
                <td className="py-0.5 text-center">{it.quantity}</td>
                <td className="py-0.5 text-right">{formatCurrency(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Divider />

        {settings.showTax && (
          <>
            <Row label="Subtotal" value={formatCurrency(tax.net)} />
            <Row label={`PPN (${(tax.rate * 100).toFixed(0)}%)`} value={formatCurrency(tax.tax)} />
          </>
        )}
        <div className="flex items-baseline justify-between text-base font-bold">
          <span>Total Bayar</span>
          <span>{formatCurrency(order.total_amount)}</span>
        </div>

        <Row label="Metode" value={paymentLabel} />
        {order.pickup_or_delivery_date && (
          <Row
            label={order.order_type === "PRE_ORDER" ? "Ambil/Antar" : "Waktu diinginkan"}
            value={formatDateTime(order.pickup_or_delivery_date)}
          />
        )}

        {poLines.length > 0 && (
          <>
            <Divider />
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold">{poLines[0]}</p>
              {poLines.slice(1).map((line, i) => (
                <p key={i} className="text-foreground/70">
                  {line}
                </p>
              ))}
            </div>
          </>
        )}

        <Divider />

        <p className="text-center text-xs text-foreground/60">
          Terima kasih telah berbelanja di Allins Bakery 🧁
          <br />
          Simpan nota ini sebagai bukti pesanan.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-foreground/60">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function Divider() {
  return <hr className="border-dashed border-border" />;
}
