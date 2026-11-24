import { describe, expect, it } from "vitest";
import { NEUTRAL_HOLD_MESSAGE } from "@/contracts";
import { computeStrDeadline, mentionsReporting, scrubTippingOff } from "@/lib/str";

/** Seam: STR deadline (Luật PCRT Điều 26, 37) and the no-tipping-off rule (Điều 40.2) — ticket #7. */
const vn = (iso: string) => new Date(`${iso}+07:00`);

describe("computeStrDeadline", () => {
  it("without signs of a crime: 01 working day after detection (Friday → Monday)", () => {
    const d = computeStrDeadline({
      detectedAt: vn("2026-11-27T10:00:00"), // Friday
      occurredAt: vn("2026-11-27T09:00:00"),
      criminalSigns: false,
    });
    expect(d.deadline.toISOString()).toBe(vn("2026-11-30T10:00:00").toISOString()); // Monday
    expect(d.basis).toBe("DETECTED_1_WORKING_DAY");
  });

  it("with signs of a crime: 24 hours after detection when that is earlier", () => {
    const d = computeStrDeadline({
      detectedAt: vn("2026-11-27T10:00:00"),
      occurredAt: vn("2026-11-27T09:00:00"),
      criminalSigns: true,
    });
    expect(d.deadline.toISOString()).toBe(vn("2026-11-28T10:00:00").toISOString());
    expect(d.basis).toBe("CRIMINAL_24_HOURS");
  });

  it("never later than 03 working days after the transaction occurred", () => {
    const d = computeStrDeadline({
      detectedAt: vn("2026-11-27T10:00:00"), // Friday
      occurredAt: vn("2026-11-24T10:00:00"), // Tuesday → +3 working days = Friday 10:00
      criminalSigns: false,
    });
    expect(d.deadline.toISOString()).toBe(vn("2026-11-27T10:00:00").toISOString());
    expect(d.basis).toBe("OCCURRED_3_WORKING_DAYS");
  });

  it("reports overdue against the clock it is given", () => {
    const d = computeStrDeadline({
      detectedAt: vn("2026-11-27T10:00:00"),
      occurredAt: vn("2026-11-27T09:00:00"),
      criminalSigns: true,
    });
    expect(d.isOverdue(vn("2026-11-28T09:59:00"))).toBe(false);
    expect(d.isOverdue(vn("2026-11-28T10:01:00"))).toBe(true);
  });
});

describe("no tipping-off (Luật PCRT Điều 40.2)", () => {
  it("recognises text that reveals a suspicious-transaction report", () => {
    expect(mentionsReporting("Chúng tôi đã gửi báo cáo giao dịch đáng ngờ cho NHNN")).toBe(true);
    expect(mentionsReporting("Hồ sơ đã chuyển Cục Phòng, chống rửa tiền")).toBe(true);
    expect(mentionsReporting("Tiền của bác vẫn an toàn trong ví")).toBe(false);
  });

  it("removes such lines from the CSKH card and tells agents not to say it", () => {
    const card = scrubTippingOff({
      customer_anxiety_level: "HIGH",
      funds_status_vi: "Giao dịch đã bị chặn và đã báo cáo giao dịch đáng ngờ.",
      empathetic_openers_vi: ["Bác đừng lo, tiền vẫn ở trong ví.", "Bên em đã báo cáo vụ này lên NHNN rồi ạ."],
      do_not_say_vi: [],
    });
    expect(card.empathetic_openers_vi).toEqual(["Bác đừng lo, tiền vẫn ở trong ví."]);
    expect(mentionsReporting(card.funds_status_vi)).toBe(false);
    expect(card.do_not_say_vi.some((x) => /báo cáo/.test(x))).toBe(true);
  });

  it("the neutral hold message shown to users never mentions reporting", () => {
    expect(mentionsReporting(NEUTRAL_HOLD_MESSAGE)).toBe(false);
  });
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadWarRoomReplay } from "@/lib/replay";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

describe("customer-facing surfaces never reveal reporting", () => {
  it("B2C, guardian and story screens contain no reporting language", () => {
    const surfaces = [...files("components/b2c"), ...files("components/story"), ...files("app/(b2c)"), ...files("app/(family)"), ...files("lib/story")];
    const offenders = surfaces.filter((f) => mentionsReporting(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the CSKH card of a War-Room result is scrubbed by the synthesis guardrail", async () => {
    const { enforceSynthesisGuardrail } = await import("@/lib/agents/orchestrator");
    const synthesis = loadWarRoomReplay("CASE-01")!.debate.synthesis;
    const tainted = {
      ...synthesis,
      cskh_empathetic_card: {
        ...synthesis.cskh_empathetic_card,
        empathetic_openers_vi: [...synthesis.cskh_empathetic_card.empathetic_openers_vi, "Bên em đã báo cáo NHNN rồi ạ."],
      },
    };
    const out = enforceSynthesisGuardrail(tainted, synthesis.independent_sources);
    expect(out.cskh_empathetic_card.empathetic_openers_vi.some(mentionsReporting)).toBe(false);
  });
});
