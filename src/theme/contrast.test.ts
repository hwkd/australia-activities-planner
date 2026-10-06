import { describe, expect, it } from "vitest";
import { WEATHERS } from "~/stores/weather";
import { THEMES } from "./tokens";
import samples from "./scene-samples.json";
import { contrast, gradientStops, over, parseColor } from "./contrast";

/**
 * AC 12: every text style passes WCAG AA in all four themes. Glass is translucent, so text on glass is
 * checked against the glass composited over the scene's lightest and darkest points (sampled by
 * scripts/theme/sample-scenes.mjs); text straight on the sky against the sky-text samples.
 * Normal text needs 4.5:1; large text (headlines) and graphics (fit meters) 3:1.
 */
const VIEWS = ["phone", "desktop"] as const;
type Check = { what: string; fg: string; bg: string; min: number; ratio: number };

function checks(): Check[] {
  const out: Check[] = [];
  for (const w of WEATHERS) {
    const t = THEMES[w];
    const s = samples[w];
    const add = (what: string, fg: string, bgRgba: ReturnType<typeof parseColor>, bgName: string, min: number) => {
      const f = parseColor(fg);
      const fgOn = f[3] < 1 ? over(f, bgRgba) : f;
      out.push({ what: `${w} · ${what}`, fg, bg: bgName, min, ratio: contrast(fgOn, bgRgba) });
    };
    for (const v of VIEWS) {
      for (const end of ["light", "dark"] as const) {
        const scene = parseColor(s[v].glass[end]);
        for (const [fillName, fill] of [["glass", t.glass], ["glass2", t.glass2]] as const) {
          const bg = over(parseColor(fill), scene);
          const name = `${fillName} over ${v} ${end} ${s[v].glass[end]}`;
          add("ink on " + fillName, t.ink, bg, name, 4.5);
          add("mute on " + fillName, t.mute, bg, name, 4.5);
          add("great meter on " + fillName, t.great, bg, name, 3);
        }
        const sky = parseColor(s[v].skyText[end]);
        const skyName = `sky ${v} ${end} ${s[v].skyText[end]}`;
        add("sky text (eyebrow, intro)", t.skyMute, sky, skyName, 4.5);
        add("headline (large)", t.ink, sky, skyName, 3);
        add("headline weather word (large)", t.accent, sky, skyName, 3);
      }
    }
    // Sheets, the toast and the fixed bars (`.glass-strong`): the heavier fill over the sky's base colour.
    const strong = over(parseColor(t.glass2), parseColor(t.bg));
    const strongName = `glass2 over bg ${t.bg}`;
    add("ink on glass-strong", t.ink, strong, strongName, 4.5);
    add("mute on glass-strong", t.mute, strong, strongName, 4.5);
    add("selected control text", t.selInk, parseColor(t.sel), `sel ${t.sel}`, 4.5);
    for (const stop of gradientStops(t.seg)) add("selected sky segment label", "#FFFFFF", parseColor(stop), `seg ${stop}`, 4.5);
  }
  return out;
}

describe("AC 12: contrast in all four themes", () => {
  it("every text token passes over the worst-case backgrounds", () => {
    const fails = checks().filter((c) => c.ratio < c.min).map((c) => `${c.what}: ${c.ratio.toFixed(2)} < ${c.min} (${c.fg} on ${c.bg})`);
    expect(fails).toEqual([]);
  });
});
