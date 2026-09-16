"use client";

/**
 * Client-only export: both files are generated on-device from the same
 * `report` prop the page already rendered — nothing is uploaded or stored,
 * same pattern as the receipt PDF (@/lib/receipt-client). Excel and PDF
 * intentionally show identical numbers since they're built from one object.
 *
 * jsPDF/jspdf-autotable and exceljs are dynamically imported inside each
 * click handler (not at module top-level) — exceljs alone is ~250kB, and
 * nobody visiting this page necessarily clicks either export button, so
 * shipping both upfront would roughly triple this route's JS for no reason.
 */

import { useState } from "react";
import type { jsPDF as JsPDFType } from "jspdf";
import type ExcelJS from "exceljs";

import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/format";
import { FINANCE_PERIOD_LABEL } from "@/lib/constants";
import { hexToRgb, normalizeHex } from "@/lib/color";
import { Button } from "@/components/ui";
import type { SalesReport } from "@/lib/sales-report";

type Branding = {
  storeName: string;
  logoUrl: string | null;
  brandColor: string;
};

function fileBaseName(report: SalesReport) {
  return `Sales-Report-${report.period}-${report.startDate}`;
}

async function loadLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function buildAndDownloadPdf(
  report: SalesReport,
  branding: Branding,
  logoDataUrl: string | null,
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc: JsPDFType = new jsPDF({ unit: "mm", format: "a4" });
  const [r, g, b] = hexToRgb(normalizeHex(branding.brandColor) ?? "#a8547f");
  const marginX = 14;
  let y = 16;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, marginX, y, 14, 14);
    } catch {
      /* unsupported image format — skip, text header still renders */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(r, g, b);
  doc.text(branding.storeName, logoDataUrl ? marginX + 18 : marginX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text("Sales Report", logoDataUrl ? marginX + 18 : marginX, y + 12);

  y += 22;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, 196, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Period: ${FINANCE_PERIOD_LABEL[report.period]} — ${report.label}`, marginX, y);
  doc.text(`Generated: ${formatDateTime(report.generatedAt)}`, 196, y, { align: "right" });
  y += 8;

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    body: [
      ["Total sales", formatCurrency(report.grossSales)],
      ["Orders", String(report.totalOrders)],
      ["Average order value", formatCurrency(report.averageOrderValue)],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
    margin: { left: marginX, right: marginX },
  });
  y = lastY() + 8;

  const headStyles = { fillColor: [r, g, b] as [number, number, number], textColor: 255 };

  autoTable(doc, {
    startY: y,
    head: [["Date", "Orders", "Sales"]],
    body: report.byDate.map((d) => [
      formatDateOnly(d.date),
      String(d.orderCount),
      formatCurrency(d.grossSales),
    ]),
    headStyles,
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: marginX, right: marginX },
  });
  y = lastY() + 8;

  autoTable(doc, {
    startY: y,
    head: [["Fulfilment status", "Orders"]],
    body: report.byStatus.map((s) => [s.label, String(s.count)]),
    headStyles,
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: marginX, right: marginX },
    tableWidth: 90,
  });
  const statusEndY = lastY();

  autoTable(doc, {
    startY: y,
    head: [["Payment method", "Orders", "Sales"]],
    body: report.byPaymentMethod.map((m) => [m.label, String(m.count), formatCurrency(m.grossSales)]),
    headStyles,
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: 108, right: marginX },
  });
  y = Math.max(statusEndY, lastY()) + 8;

  autoTable(doc, {
    startY: y,
    head: [["Top products", "Qty", "Sales"]],
    body: report.topProducts.map((p) => [p.productName, String(p.quantity), formatCurrency(p.grossSales)]),
    headStyles,
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: marginX, right: marginX },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${branding.storeName} — Sales Report`, marginX, 290);
    doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: "right" });
  }

  doc.save(`${fileBaseName(report)}.pdf`);
}

async function buildAndDownloadXlsx(report: SalesReport, branding: Branding) {
  const { default: ExcelJS } = await import("exceljs");

  const hex = normalizeHex(branding.brandColor) ?? "#a8547f";
  const argb = `FF${hex.replace("#", "").toUpperCase()}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = branding.storeName;
  wb.created = new Date(report.generatedAt);

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };
  const currencyFmt = '"Rp"#,##0';

  const styleHeaderRow = (row: ExcelJS.Row) => {
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
    });
  };

  // ---- Summary ----
  const summary = wb.addWorksheet("Summary");
  summary.mergeCells("A1:B1");
  summary.getCell("A1").value = `${branding.storeName} — Sales Report`;
  summary.getCell("A1").font = { bold: true, size: 14, color: { argb } };
  summary.getCell("A2").value = `Period: ${FINANCE_PERIOD_LABEL[report.period]} — ${report.label}`;
  summary.getCell("A3").value = `Generated: ${formatDateTime(report.generatedAt)}`;
  summary.addRow([]);
  styleHeaderRow(summary.addRow(["Metric", "Value"]));
  summary.addRow(["Total sales", report.grossSales]).getCell(2).numFmt = currencyFmt;
  summary.addRow(["Orders", report.totalOrders]);
  summary.addRow(["Average order value", report.averageOrderValue]).getCell(2).numFmt = currencyFmt;
  summary.columns = [{ width: 28 }, { width: 20 }];

  // ---- By date ----
  const byDate = wb.addWorksheet("By Date");
  styleHeaderRow(byDate.addRow(["Date", "Orders", "Sales"]));
  for (const d of report.byDate) {
    const row = byDate.addRow([formatDateOnly(d.date), d.orderCount, d.grossSales]);
    row.getCell(3).numFmt = currencyFmt;
  }
  byDate.columns = [{ width: 18 }, { width: 12 }, { width: 18 }];

  // ---- Fulfilment status ----
  const byStatus = wb.addWorksheet("Fulfilment Status");
  styleHeaderRow(byStatus.addRow(["Status", "Orders"]));
  for (const s of report.byStatus) byStatus.addRow([s.label, s.count]);
  byStatus.columns = [{ width: 24 }, { width: 12 }];

  // ---- By payment method ----
  const byMethod = wb.addWorksheet("Payment Method");
  styleHeaderRow(byMethod.addRow(["Method", "Orders", "Sales"]));
  for (const m of report.byPaymentMethod) {
    const row = byMethod.addRow([m.label, m.count, m.grossSales]);
    row.getCell(3).numFmt = currencyFmt;
  }
  byMethod.columns = [{ width: 20 }, { width: 12 }, { width: 18 }];

  // ---- Top products ----
  const byProduct = wb.addWorksheet("Top Products");
  styleHeaderRow(byProduct.addRow(["Product", "Qty", "Sales"]));
  for (const p of report.topProducts) {
    const row = byProduct.addRow([p.productName, p.quantity, p.grossSales]);
    row.getCell(3).numFmt = currencyFmt;
  }
  byProduct.columns = [{ width: 28 }, { width: 10 }, { width: 18 }];

  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBaseName(report)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportButtons({
  report,
  storeName,
  logoUrl,
  brandColor,
}: {
  report: SalesReport;
  storeName: string;
  logoUrl: string | null;
  brandColor: string;
}) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const branding: Branding = { storeName, logoUrl, brandColor };

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const logoDataUrl = logoUrl ? await loadLogoDataUrl(logoUrl) : null;
      await buildAndDownloadPdf(report, branding, logoDataUrl);
    } finally {
      setBusy(null);
    }
  }

  async function downloadXlsx() {
    setBusy("xlsx");
    try {
      await buildAndDownloadXlsx(report, branding);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={downloadPdf} disabled={busy !== null}>
        {busy === "pdf" ? "Generating…" : "Download PDF"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={downloadXlsx} disabled={busy !== null}>
        {busy === "xlsx" ? "Generating…" : "Download Excel"}
      </Button>
    </div>
  );
}
