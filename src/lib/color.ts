/**
 * Pure color math for the single admin-picked brand color (Admin >
 * Appearance). No dependencies, works identically on the server (root
 * layout, injecting CSS variables) and the client (live preview in the
 * appearance form) — one hex in, everything else derived:
 *   - a dark-mode tint of the same hue (lightened, same spirit as the
 *     hand-picked light/dark pastel pair this app shipped with originally)
 *   - an accessible foreground (near-white or near-black, whichever gives
 *     better contrast) for both the light and derived dark variant
 */

export function normalizeHex(input: string): string | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h.toLowerCase()}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio (1–21) between two hex colors. */
export function contrastRatio(hexA: string, hexB: string): number {
  const L1 = relativeLuminance(...hexToRgb(hexA));
  const L2 = relativeLuminance(...hexToRgb(hexB));
  const [light, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (light + 0.05) / (dark + 0.05);
}

/** Whichever of near-white/near-black gives better contrast against `hex`. */
export function bestForeground(hex: string): string {
  const white = "#ffffff";
  const black = "#1a1214";
  return contrastRatio(hex, white) >= contrastRatio(hex, black) ? white : black;
}

/** Lightens `hex` toward a pastel, dark-background-friendly tint, preserving hue. */
export function deriveDarkVariant(hex: string): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  const newL = Math.min(88, Math.max(65, l + (92 - l) * 0.65));
  const newS = Math.max(30, s * 0.9);
  return rgbToHex(...hslToRgb(h, newS, newL));
}

export type DerivedTheme = {
  primary: string;
  primaryForeground: string;
  primaryDark: string;
  primaryForegroundDark: string;
};

/** The full set of CSS variables the brand color drives, from one admin-picked hex. */
export function deriveTheme(primaryHex: string): DerivedTheme {
  const primary = normalizeHex(primaryHex) ?? primaryHex;
  const primaryDark = deriveDarkVariant(primary);
  return {
    primary,
    primaryForeground: bestForeground(primary),
    primaryDark,
    primaryForegroundDark: bestForeground(primaryDark),
  };
}
