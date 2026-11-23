import { describe, expect, it } from "vitest";
import { DEMO_SIMULATION_LABEL } from "@/contracts";
import { redactText } from "@/lib/pii";
import { buildEvidencePack, POLICE_GUIDE, shouldOfferPoliceGuide } from "@/lib/police-report";
import { SCAN_REPLAY_RECORDS } from "@/lib/replay";

/** Seam: the evidence pack a victim takes to the police, and the guide copy (ticket #8). */
const scan = SCAN_REPLAY_RECORDS["CASE-01"]!;

describe("evidence pack", () => {
  const pack = buildEvidencePack({
    result: scan.result,
    modelUsed: scan.modelUsed,
    scannedAt: "2026-11-24T02:00:00.000Z",
    txStatus: "CANCELLED_BY_B2E",
  });

  it("carries the simulation label and says the analysis is AI-generated", () => {
    expect(pack).toContain(DEMO_SIMULATION_LABEL);
    expect(pack).toContain("Kết quả do AI tạo");
    expect(pack).toContain(scan.modelUsed);
  });

  it("contains no raw PII and masks the recipient account to its last 4 digits", () => {
    expect(redactText(pack).hits).toEqual([]);
    expect(pack).not.toContain("990123456789");
    expect(pack).toContain("•••• 6789");
  });

  it("states what happened to the transfer in plain words", () => {
    expect(pack).toMatch(/đội Risk đã hủy/i);
  });

  it("never includes an image or raw message, only the analysis", () => {
    expect(pack).not.toMatch(/base64|data:image/i);
  });
});

describe("police guide copy", () => {
  const text = [POLICE_GUIDE.title, ...POLICE_GUIDE.steps, ...POLICE_GUIDE.rights, POLICE_GUIDE.secondScamWarning].join("\n");

  it("sends people to the commune/ward police, who may not refuse", () => {
    expect(text).toMatch(/Công an xã\/phường/);
    expect(text).toMatch(/không được từ chối/);
    expect(text).toMatch(/20 ngày/);
  });

  it("prints no unverified hotline or phone number", () => {
    expect(text).not.toMatch(/\b(113|156|A05)\b/);
    expect(text).not.toMatch(/\d{3}[ .-]?\d{3,4}[ .-]?\d{3,4}/);
  });

  it("warns about the 'get your money back' second scam", () => {
    expect(POLICE_GUIDE.secondScamWarning).toMatch(/lấy lại tiền/);
  });
});

describe("when to offer the guide", () => {
  it("after a high or critical scan, or after a cancelled transfer", () => {
    expect(shouldOfferPoliceGuide({ riskLevel: "CRITICAL" })).toBe(true);
    expect(shouldOfferPoliceGuide({ riskLevel: "HIGH" })).toBe(true);
    expect(shouldOfferPoliceGuide({ riskLevel: "MEDIUM" })).toBe(false);
    expect(shouldOfferPoliceGuide({ txStatus: "CANCELLED_BY_USER" })).toBe(true);
    expect(shouldOfferPoliceGuide({ txStatus: "CANCELLED_BY_B2E" })).toBe(true);
    expect(shouldOfferPoliceGuide({ txStatus: "ON_HOLD_24H" })).toBe(false);
  });
});

import { readFileSync } from "node:fs";

describe("guide is shown where the ticket asks", () => {
  const guide = readFileSync("components/b2c/PoliceReportGuide.tsx", "utf8");

  it("is a labelled landmark with large text and a keyboard-usable download", () => {
    expect(guide).toMatch(/<section[^>]*aria-labelledby=/);
    expect(guide).toMatch(/text-lg/);
    expect(guide).toMatch(/<button[\s\S]*Tải gói bằng chứng/);
    expect(guide).toContain("buildEvidencePack");
  });

  it("appears after a high-risk scan, after a user cancel, and at the end of /story", () => {
    for (const f of ["components/b2c/ScanResultPanel.tsx", "components/b2c/TransferHoldPanel.tsx", "components/story/SummaryCard.tsx"]) {
      expect(readFileSync(f, "utf8"), f).toContain("PoliceReportGuide");
    }
  });
});
