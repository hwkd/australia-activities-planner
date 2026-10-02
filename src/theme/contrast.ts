/** WCAG 2.x contrast helpers for the theme test (tracker M3.7). */

export type RGBA = [r: number, g: number, b: number, a: number];

export function parseColor(c: string): RGBA {
  const s = c.trim();
  if (s.startsWith("#")) {
    const h = s.slice(1);
    const v = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`can't parse colour ${c}`);
  const [r, g, b, a = "1"] = m[1].split(",").map((x) => x.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}

/** Source-over compositing of `top` onto an opaque `bottom`. */
export function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
}

export function luminance([r, g, b]: RGBA): number {
  const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: RGBA, b: RGBA): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Gradient stops of a CSS linear-gradient, as colours. */
export const gradientStops = (g: string) => [...g.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0]);
