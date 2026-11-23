import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NEUTRAL_HOLD_MESSAGE } from "@/contracts";

/** Seam: source-level guardrails for the story stage (tickets #20–#21). */
const FILES = ["app/story/page.tsx", ...readdirSync("components/story").map((f) => join("components/story", f))];
const all = () => FILES.map((f) => readFileSync(f, "utf8")).join("\n");

describe("story stage guardrails", () => {
  it("exists as /story with stage components", () => {
    expect(existsSync("app/story/page.tsx")).toBe(true);
    expect(FILES.length).toBeGreaterThan(1);
  });

  it("imports the neutral hold message instead of retyping it", () => {
    const src = all();
    expect(src).toContain("NEUTRAL_HOLD_MESSAGE");
    expect(src).not.toContain(NEUTRAL_HOLD_MESSAGE.slice(0, 30));
  });

  it("labels the scenario as a simulation", () => {
    expect(all()).toContain("DEMO_SIMULATION_LABEL");
  });

  it("announces async results and marks the current chapter for assistive tech", () => {
    const src = all();
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain("aria-current");
  });

  it("uses projector-readable text: nothing below 13px, no tiny arbitrary sizes", () => {
    expect(all()).not.toMatch(/text-\[(?:[0-9]|1[0-2])px\]/);
  });

  it("keeps story state in memory only (refresh starts a fresh session)", () => {
    expect(all()).not.toMatch(/localStorage|sessionStorage/);
  });

  it("guards against double clicks firing two API calls", () => {
    expect(all()).toMatch(/useRef/);
  });
});
