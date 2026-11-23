import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAST, modelDisplayName } from "@/lib/cast";
import { DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL } from "@/lib/session";

/** Seam: what a judge reads in normal mode (ticket #18). Internal codes live only in `.tech-only`. */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const UI_FILES = [...tsxFiles("app"), ...tsxFiles("components")];

// Strings that, when they appear in JSX text, show internal codes or spec references to a viewer.
// shortcut: line-based scan of known leaks; switch to a rendered-DOM check if a UI test lib is added.
const LEAKS = [
  "(OVERTURNED_ROLLBACK)",
  "<code>OVERTURNED_ROLLBACK</code>",
  "Trước Vision",
  "Dismiss FP",
  "FR-05",
  "FR-06",
  "HTTP 400",
  "(Indicator Type)",
  "{ind.makerId}",
  '{ind.checkerId ?? "Chưa phê duyệt"}',
  "HTTP 403",
  "(POST /api/",
  "<code>POST /api/",
  '"Anh Tuấn"',
  '"Chị Huyền"',
];

describe("normal mode speaks plain Vietnamese", () => {
  it("shows no internal codes or spec references outside .tech-only", () => {
    const offenders: string[] = [];
    for (const file of UI_FILES) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (line.includes("tech-only")) return;
          for (const leak of LEAKS) if (line.includes(leak)) offenders.push(`${file}:${i + 1} ${leak}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it("uses no text smaller than 12px (projector and elderly readers)", () => {
    const offenders = UI_FILES.filter((f) => /text-\[1[01]px\]/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("one cast list for every displayed name", () => {
  it("names each persona the demo shows", () => {
    expect(CAST.USER_B2C_HUNG.name).toBe("Bác Hùng");
    expect(CAST.FAMILY_MINH.name).toBe("Chị Minh");
    expect(CAST.RISK_MAKER_HUYEN.name).toBe("Chuyên viên Huyền");
    expect(CAST.RISK_CHECKER_TUAN.name).toBe("Chuyên viên Tuấn");
    for (const person of Object.values(CAST)) expect(person.role.length).toBeGreaterThan(0);
  });
});

describe("model names read as what actually ran", () => {
  it("explains the non-AI paths in words", () => {
    expect(modelDisplayName(TIER1_IMMUNITY_MODEL)).toBe("Tra cứu Kho Miễn dịch (không dùng AI)");
    expect(modelDisplayName(DAILY_QUOTA_FALLBACK_MODEL)).toMatch(/không dùng AI/);
  });

  it("keeps real model names unchanged", () => {
    expect(modelDisplayName("gemma-4-31B-it")).toBe("gemma-4-31B-it");
  });
});
