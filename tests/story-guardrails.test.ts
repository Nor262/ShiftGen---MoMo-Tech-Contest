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

  it("keeps stage text at 16px or more (spec: sân khấu ≥16px, điện thoại ≥18px)", () => {
    expect(all()).not.toMatch(/(^|[\s"'`])text-(xs|sm)([\s"'`]|$)/m);
  });

  it("has exactly one Signal Orange surface: the hold banner on the phone", () => {
    expect(all().match(/bg-signal-|border-signal-/g) ?? []).toHaveLength(2); // banner wash + its rule
    expect(all()).not.toMatch(/bg-signal-700/);
  });

  it("offers Technical Mode links to the full screens and keeps focus on a busy button", () => {
    const src = all();
    expect(src).toContain("tech-only");
    expect(src).toContain("Mở màn hình đầy đủ");
    expect(src).toContain("aria-disabled");
    expect(src).not.toMatch(/[^-]disabled=\{state\.running\}/);
  });

  it("shows why a chapter is still locked, in visible text", () => {
    expect(all()).toMatch(/lockedReason\}<\/p>|\{nextLocked\.lockedReason\}/);
  });

  it("ends with a summary card of measured times only, and a fresh rerun", () => {
    const card = readFileSync("components/story/SummaryCard.tsx", "utf8");
    expect(card).toContain("DEMO_SIMULATION_LABEL");
    expect(card).toContain("Chạy lại từ đầu");
    expect(card).toContain("newSessionSlug");
    expect(card).not.toMatch(/\d+\s*%|<\s*\d+\s*(s|giây)|99/);
    // a replayed step must never be presented as measured in this run
    expect(card).toContain("isReplayModel");
    expect(card).toContain("isReplayNotice");
  });

  it("asks Maker and Checker for their own written reason, with a real label", () => {
    const src = all();
    expect(src).toMatch(/<label[^>]*htmlFor="story-rationale"/);
    expect(src).toContain("MAKER_DRAFT_VI");
    expect(src).toContain("CHECKER_DRAFT_VI");
    expect(src).toMatch(/makerRationale|checkerRationale/);
  });

  it("marks War-Room replays as replays", () => {
    expect(all()).toContain("isReplayModel");
  });

  it("keeps story state in memory only (refresh starts a fresh session)", () => {
    expect(all()).not.toMatch(/localStorage|sessionStorage/);
  });

  it("guards against double clicks firing two API calls", () => {
    expect(all()).toMatch(/useRef/);
  });
});
