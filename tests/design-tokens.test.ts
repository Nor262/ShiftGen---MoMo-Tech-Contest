import { describe, expect, it } from "vitest";
import config from "@/tailwind.config";

/**
 * DESIGN.md contract: every shade a component may use as text must reach WCAG AA (4.5:1)
 * on the surface it lives on. Convention (DESIGN.md): shades 500–900 are text on light
 * surfaces (white / canvas); shades 100–400 are text on the dark War-Room surfaces.
 */
type Scale = Record<string, string>;
const colors = config.theme?.extend?.colors as Record<string, Scale | string>;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT_SURFACES = ["#ffffff", "#f6f6f8"];
const scales = ["momo", "slate", "emerald", "red", "signal", "amber", "sky", "indigo"] as const;

describe("DESIGN.md color tokens", () => {
  // Known-good anchors from DESIGN.md (independent of the config values).
  it("measures contrast like WCAG", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#111a4a", "#ffffff")).toBeCloseTo(16.5, 1);
  });

  // #39: Tailwind shade numbers are not DESIGN.md token names; pin the mapping and its use.
  it("signal-500 is DESIGN.md Signal Orange 700 and signal-400 is Signal Orange 500", () => {
    expect((colors.signal as Scale)["500"]).toBe("#c2410c");
    expect((colors.signal as Scale)["400"]).toBe("#ec652b");
  });

  it("hold and high-risk accents use signal-500 (#c2410c), not the darker signal-700", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : /\.tsx?$/.test(n) ? [join(d, n)] : []));
    const files = [...walk("app"), ...walk("components")];
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/(border|text|bg)-signal-700/);
  });

  for (const name of scales) {
    const scale = colors[name] as Scale;
    const darkSurfaces = [(colors.slate as Scale)["900"], (colors.slate as Scale)["950"]];

    it(`${name}: shades 500–900 are readable text on light surfaces`, () => {
      for (const shade of ["500", "600", "700", "800", "900"]) {
        for (const surface of LIGHT_SURFACES) {
          expect(contrast(scale[shade], surface), `${name}-${shade} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    it(`${name}: shades 100–400 are readable text on dark surfaces`, () => {
      for (const shade of ["100", "200", "300", "400"]) {
        for (const surface of darkSurfaces) {
          expect(contrast(scale[shade], surface), `${name}-${shade} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});
