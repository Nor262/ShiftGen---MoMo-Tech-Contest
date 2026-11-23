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

  it("states what happened in plain words, not enum codes", () => {
    expect(pack).toMatch(/đội Risk đã hủy/i);
    expect(pack).toMatch(/NGHIÊM TRỌNG/);
    expect(pack).toMatch(/Giả danh cơ quan chức năng/);
    expect(pack).not.toMatch(/POLICE_IMPERSONATION|CRITICAL/);
  });

  it("never includes an image or raw message, only the analysis", () => {
    expect(pack).not.toMatch(/base64|data:image/i);
  });
});

describe("evidence pack: PII the redactor alone would keep", () => {
  const leaky = {
    ...scan.result,
    psych_manipulation_cues: [
      { type: "URGENCY_PRESSURE" as const, quote_vi: "Chuyển ngay vào STK 990123456789 trước 15h", explanation_vi: "Thúc ép thời gian." },
    ],
    extracted_entities: { ...scan.result.extracted_entities, urls: ["https://lua-dao.example/xac-minh?sdt=0912345678&cccd=001064012345"] },
  };
  const pack = buildEvidencePack({ result: leaky, modelUsed: "m", scannedAt: "2026-11-24T02:00:00.000Z" });

  it("masks account numbers quoted from the message", () => {
    expect(pack).not.toContain("990123456789");
  });

  it("drops query strings from links (phone/ID numbers hide there)", () => {
    expect(pack).not.toMatch(/0912345678|001064012345/);
    expect(pack).toContain("https://lua-dao.example/xac-minh");
  });

  it("calls the timestamp what it is: when the pack was made", () => {
    expect(pack).toMatch(/Thời điểm tạo gói/);
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

  it("warns about the 'get your money back' second scam without overstating the law", () => {
    expect(POLICE_GUIDE.secondScamWarning).toMatch(/lấy lại tiền/);
    expect(POLICE_GUIDE.secondScamWarning).not.toMatch(/không ai được thu phí/);
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
