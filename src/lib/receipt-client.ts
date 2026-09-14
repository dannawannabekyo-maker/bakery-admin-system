"use client";

/**
 * Client-only receipt generation (PDF download + WhatsApp text). Runs
 * entirely in the browser — the PDF is never uploaded or persisted anywhere;
 * it only ever exists as a local download triggered by jsPDF.
 */

import { jsPDF } from "jspdf";

import { formatCurrency, formatDate, formatDateTime, formatTime, taxBreakdown } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/constants";
import type { OrderWithRelations } from "@/lib/data";

export type ReceiptSettings = {
  showTax: boolean;
  showLogo: boolean;
  showPoInstructions: boolean;
  taxRate: number;
  /** Admin-uploaded receipt logo (from Receipt Settings). Null -> fall back to /logo.svg. */
  logoUrl: string | null;
};

/** "0812..." / "+62 812..." / "62812..." -> "62812..." (digits only, wa.me format). */
export function formatWaPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (!digits.startsWith("62")) digits = "62" + digits;
  return digits;
}

function paymentLabelFor(order: OrderWithRelations): string {
  return order.payment_method
    ? (PAYMENT_METHOD_LABEL[order.payment_method as PaymentMethod] ?? order.payment_method)
    : "Belum ditentukan";
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/** Rasterizes an SVG (same-origin default, or an uploaded one) to a PNG data URL, centred/contained in a square canvas. */
async function rasterizeSvg(url: string): Promise<string | null> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("logo failed to load"));
  });
  const size = 300;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const iw = img.naturalWidth || size;
  const ih = img.naturalHeight || size;
  const scale = Math.min(size / iw, size / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

/**
 * Loads the receipt logo (an admin-uploaded PNG/JPG, or the default /logo.svg)
 * as a data URL jsPDF can embed. Null if it can't be loaded — the PDF simply
 * skips the image rather than failing the whole receipt.
 */
async function loadLogoDataUrl(url: string): Promise<string | null> {
  try {
    if (/\.svg(\?|$)/i.test(url)) return await rasterizeSvg(url);
    const res = await fetch(url);
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
}

function poInstructionLines(order: OrderWithRelations): string[] {
  if (!order.pickup_or_delivery_date) return [];
  const start = new Date(order.pickup_or_delivery_date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return [
    "PO Waiting Time Instructions:",
    `Your order will be ready for pickup on ${formatDate(start)}.`,
    `Please collect it between ${formatTime(start)} and ${formatTime(end)}.`,
  ];
}

/** Same content/settings feed both the PDF and the WhatsApp text so they never drift apart. */
export function buildReceiptWhatsAppText(
  order: OrderWithRelations,
  settings: ReceiptSettings,
): string {
  const tax = taxBreakdown(order.total_amount, settings.taxRate);
  const lines: string[] = [];

  lines.push("🧁 *Allins Bakery* — Nota Pembelian");
  lines.push(`No. Order: ${order.order_number}`);
  lines.push(`Tanggal: ${formatDateTime(order.created_at)}`);
  lines.push("");
  lines.push("*Item:*");
  for (const it of order.items) {
    lines.push(`- ${it.product?.name ?? "Produk"} x${it.quantity} — ${formatCurrency(it.subtotal)}`);
  }
  lines.push("");

  if (settings.showTax) {
    lines.push(`Subtotal: ${formatCurrency(tax.net)}`);
    lines.push(`PPN (${(tax.rate * 100).toFixed(0)}%): ${formatCurrency(tax.tax)}`);
  }
  lines.push(`*Total: ${formatCurrency(tax.gross)}*`);
  lines.push("");
  lines.push(`Metode Pembayaran: ${paymentLabelFor(order)}`);

  if (settings.showPoInstructions) {
    const poLines = poInstructionLines(order);
    if (poLines.length) {
      lines.push("");
      lines.push(...poLines);
    }
  }

  lines.push("");
  lines.push("Terima kasih telah berbelanja di Allins Bakery 🧁");

  return lines.join("\n");
}

export async function buildReceiptPdf(
  order: OrderWithRelations,
  settings: ReceiptSettings,
): Promise<jsPDF> {
  const tax = taxBreakdown(order.total_amount, settings.taxRate);
  const poLines = settings.showPoInstructions ? poInstructionLines(order) : [];

  const width = 80;
  const lineH = 5;
  const estimatedLines = 24 + order.items.length + poLines.length + (settings.showLogo ? 10 : 0);
  const height = Math.max(140, estimatedLines * lineH);

  const doc = new jsPDF({ unit: "mm", format: [width, height] });
  const marginX = 6;
  const contentWidth = width - marginX * 2;
  let y = 8;

  if (settings.showLogo) {
    const logo = await loadLogoDataUrl(settings.logoUrl || "/logo.svg");
    if (logo) {
      const logoSize = 18;
      // Format-less overload: jsPDF auto-detects PNG/JPEG/WEBP from the data URL header.
      doc.addImage(logo, (width - logoSize) / 2, y, logoSize, logoSize);
      y += logoSize + 3;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Allins Bakery", width / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Nota Pembelian", width / 2, y, { align: "center" });
  y += 4;

  const divider = () => {
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginX, y, width - marginX, y);
    y += 4;
  };

  divider();

  doc.setFontSize(9);
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, marginX, y);
    doc.text(value, width - marginX, y, { align: "right" });
    y += lineH;
  };

  row("No. Order", order.order_number, true);
  row("Tanggal", formatDateTime(order.created_at));
  row("Pelanggan", order.customer?.full_name || "—");
  if (order.customer?.phone_number) row("Telp", order.customer.phone_number);

  divider();

  doc.setFont("helvetica", "normal");
  for (const it of order.items) {
    const name = it.product?.name ?? "Produk";
    doc.text(`${name} x${it.quantity}`, marginX, y, { maxWidth: contentWidth - 22 });
    doc.text(formatCurrency(it.subtotal), width - marginX, y, { align: "right" });
    y += lineH;
  }

  divider();

  if (settings.showTax) {
    row("Subtotal", formatCurrency(tax.net));
    row(`PPN (${(tax.rate * 100).toFixed(0)}%)`, formatCurrency(tax.tax));
  }
  doc.setFontSize(11);
  row("Total Bayar", formatCurrency(tax.gross), true);
  doc.setFontSize(9);

  row("Metode", paymentLabelFor(order));

  if (poLines.length) {
    divider();
    doc.setFont("helvetica", "bold");
    doc.text(poLines[0], marginX, y, { maxWidth: contentWidth });
    y += lineH;
    doc.setFont("helvetica", "normal");
    for (const line of poLines.slice(1)) {
      const wrapped = doc.splitTextToSize(line, contentWidth);
      doc.text(wrapped, marginX, y);
      y += lineH * wrapped.length;
    }
  }

  divider();
  doc.setFontSize(8);
  doc.text("Terima kasih telah berbelanja di Allins Bakery", width / 2, y, {
    align: "center",
    maxWidth: contentWidth,
  });

  return doc;
}

/**
 * Downloads the PDF locally, then opens WhatsApp with the same summary.
 *
 * `presentWindow` should be a tab opened synchronously (`window.open("", "_blank")`)
 * at the top of the click handler, before any `await` — browsers only allow
 * `window.open` without it being blocked when it's a direct result of a user
 * gesture, so we pre-open a blank tab and redirect it once the text is ready.
 */
export async function generateAndSendReceipt(
  order: OrderWithRelations,
  settings: ReceiptSettings,
  presentWindow?: Window | null,
): Promise<void> {
  const phone = formatWaPhone(order.customer?.phone_number);
  if (!phone) {
    presentWindow?.close();
    throw new Error("This customer has no phone number on file — WhatsApp not sent.");
  }

  const doc = await buildReceiptPdf(order, settings);
  doc.save(`Nota-${order.order_number}.pdf`);

  const text = buildReceiptWhatsAppText(order, settings);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  if (presentWindow) presentWindow.location.href = url;
  else window.open(url, "_blank", "noopener,noreferrer");
}
