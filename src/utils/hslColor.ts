function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;

  const full = raw.length === 3
    ? raw.split("").map((c) => c + c).join("")
    : raw;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case rr:
        h = ((gg - bb) / d) % 6;
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }

    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

/**
 * Returns a CSS `hsl(...)` color when possible.
 * Accepts: hex (#RGB/#RRGGBB), hsl(...), or any CSS color string.
 */
export function normalizeHslColor(input?: string | null): string {
  const fallback = "hsl(var(--primary))";
  if (!input) return fallback;

  const color = String(input).trim();
  if (!color) return fallback;

  if (/^(hsl|hsla)\(/i.test(color)) return color.replace(/^hsla\(/i, "hsl(");

  const rgb = color.startsWith("#") ? hexToRgb(color) : null;
  if (rgb) {
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
  }

  return color;
}

/**
 * Applies an alpha channel to a (normalized) HSL color.
 * Supports `hsl(var(--token))` by converting to `hsl(var(--token) / a)`.
 */
export function withHslAlpha(color: string, alpha: number): string {
  const a = clamp01(alpha);
  const c = normalizeHslColor(color);

  // hsl(var(--primary))  OR  hsl(var(--primary) / 0.5)
  const varMatch = c.match(/^hsl\(\s*(var\(--[\w-]+\))\s*(?:\/\s*([\d.]+)\s*)?\)$/i);
  if (varMatch) return `hsl(${varMatch[1]} / ${a})`;

  if (/^hsl\(/i.test(c)) {
    const inner = c.slice(c.indexOf("(") + 1, c.lastIndexOf(")"))
      .replace(/,/g, " ")
      .trim();

    const left = inner.includes("/") ? inner.split("/")[0].trim() : inner;
    return `hsl(${left} / ${a})`;
  }

  // For non-hsl inputs we can't reliably apply alpha.
  return c;
}
