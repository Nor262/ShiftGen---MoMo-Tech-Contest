import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Seam: the home page tells "today vs with TrustLoop" and leads into /story (ticket #22). */
const home = readFileSync("app/page.tsx", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");

describe("home: two lanes into the story", () => {
  it("shows both lanes, labelled as a simulation, with the CASE-01 amounts", () => {
    expect(home).toContain("DEMO_SIMULATION_LABEL");
    expect(home).toMatch(/Hôm nay/);
    expect(home).toMatch(/Có TrustLoop/);
    expect(home).toContain("38.000.000đ");
    expect(home).not.toContain("15.000.000đ");
  });

  it("keeps the 'today' lane neutral — it is hypothetical, not a system error", () => {
    expect(home).not.toMatch(/\b(text|bg|border)-(red|error)-/);
  });

  it("has one primary action that opens /story on a fresh session, and the free try also starts fresh", () => {
    expect(home).toContain("/story?session=${newSessionSlug()}");
    expect(home).toContain("/shield?session=${newSessionSlug()}");
    expect(home).toContain('from "@/lib/demo-session"');
    expect(home).not.toMatch(/href="\/shield"/);
  });

  it("drops the illustrative hold card and the old 4-step grid", () => {
    expect(home).not.toContain("NEUTRAL_HOLD_MESSAGE");
    expect(home).not.toMatch(/\bLOOP\b/);
  });
});

describe("nav: Tổng quan + Xem câu chuyện; the 4 old screens only in Technical Mode", () => {
  it("lists the story and hides the old screens behind tech-only", () => {
    expect(layout).toContain('"/story"');
    expect(layout).toMatch(/Xem câu chuyện/);
    expect(layout).toMatch(/techOnly|tech-only/);
  });
});
