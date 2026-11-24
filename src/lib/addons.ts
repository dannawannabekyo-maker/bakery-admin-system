/**
 * Custom order add-ons (Paket / Bingkisan / Goodybag / Parcel). Billing-only:
 * they add to the order total and may show on the nota, but never touch stock
 * or the nightly PO capacity. Shared by the manual-order form and the server.
 */
export const ADDON_KINDS = ["PAKET", "BINGKISAN", "LAINNYA"] as const;
export type AddonKind = (typeof ADDON_KINDS)[number];

export const ADDON_KIND_LABEL: Record<AddonKind, string> = {
  PAKET: "Paket",
  BINGKISAN: "Bingkisan / Goodybag / Parcel",
  LAINNYA: "Lainnya",
};

export type AddonContent = { name: string; quantity: number };

export type NewOrderAddon = {
  kind: AddonKind;
  name: string;
  description?: string | null;
  /** Descriptive only — what is inside the package. Does not deduct stock. */
  contents: AddonContent[];
  quantity: number;
  unitPrice: number;
  showOnReceipt: boolean;
};

/** Normalises untrusted input; rows without a name are dropped. */
export function cleanAddons(raw: unknown): NewOrderAddon[] {
  if (!Array.isArray(raw)) return [];
  const out: NewOrderAddon[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const a = r as Record<string, unknown>;
    const name = String(a.name ?? "").trim();
    if (!name) continue;
    const kind = ADDON_KINDS.includes(a.kind as AddonKind)
      ? (a.kind as AddonKind)
      : "LAINNYA";
    const contents = (Array.isArray(a.contents) ? a.contents : [])
      .map((c) => {
        const cc = (c ?? {}) as Record<string, unknown>;
        return {
          name: String(cc.name ?? "").trim(),
          quantity: Math.max(1, Math.floor(Number(cc.quantity) || 1)),
        };
      })
      .filter((c) => c.name);
    out.push({
      kind,
      name: name.slice(0, 120),
      description: String(a.description ?? "").trim().slice(0, 500) || null,
      contents,
      quantity: Math.max(1, Math.floor(Number(a.quantity) || 1)),
      unitPrice: Math.max(0, Math.floor(Number(a.unitPrice) || 0)),
      showOnReceipt: a.showOnReceipt !== false,
    });
  }
  return out;
}

/** Parses the JSON hidden-input payload from the manual-order form. */
export function parseAddonsPayload(value: FormDataEntryValue | null): NewOrderAddon[] {
  try {
    return cleanAddons(JSON.parse(String(value ?? "[]")));
  } catch {
    return [];
  }
}
