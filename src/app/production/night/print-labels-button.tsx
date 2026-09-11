"use client";

export function PrintLabelsButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground print:hidden"
    >
      🖨️ Cetak label / stiker
    </button>
  );
}
