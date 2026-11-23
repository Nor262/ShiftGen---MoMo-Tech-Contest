import { describe, expect, it } from "vitest";
import {
  ApproveImmunityRequestSchema,
  CaseDecisionRequestSchema,
  ConsentRequestSchema,
  FamilyEscalateRequestSchema,
  InvestigateCaseRequestSchema,
  ShieldScanRequestSchema,
  TransferRequestSchema,
} from "@/contracts";
import { loadWarRoomReplay } from "@/lib/replay";
import {
  buildApprove,
  buildConsent,
  buildEscalate,
  buildInvestigate,
  buildMakerDecision,
  buildNewUserProbe,
  buildScan,
  buildTransfer,
  CHECKER_DRAFT_VI,
  MAKER_DRAFT_VI,
  STORY_AMOUNT_VND,
  STORY_RECIPIENT_ACCOUNT,
} from "@/lib/story/actions";

/** Seam: request bodies the story stage sends to the existing API (ticket #19). */
const debate = loadWarRoomReplay("CASE-01")!.debate;

describe("story request builders", () => {
  it("every body passes its frozen contract schema", () => {
    expect(() => ConsentRequestSchema.parse(buildConsent())).not.toThrow();
    expect(() => ShieldScanRequestSchema.parse(buildScan())).not.toThrow();
    expect(() => TransferRequestSchema.parse(buildTransfer("s1"))).not.toThrow();
    expect(() => FamilyEscalateRequestSchema.parse(buildEscalate())).not.toThrow();
    expect(() => InvestigateCaseRequestSchema.parse(buildInvestigate())).not.toThrow();
    expect(() => CaseDecisionRequestSchema.parse(buildMakerDecision(debate, MAKER_DRAFT_VI))).not.toThrow();
    expect(() => ApproveImmunityRequestSchema.parse(buildApprove(CHECKER_DRAFT_VI))).not.toThrow();
    expect(() => ShieldScanRequestSchema.parse(buildNewUserProbe())).not.toThrow();
  });

  it("Bác Hùng opts in with Chị Minh as guardian, then scans CASE-01", () => {
    expect(buildConsent()).toMatchObject({ userId: "USER_B2C_HUNG", optIn24hHold: true, guardianId: "FAMILY_MINH" });
    expect(buildScan()).toMatchObject({ userId: "USER_B2C_HUNG", inputType: "DEMO_PRESET", presetCode: "CASE-01" });
  });

  it("sends the first 9,5 million CASE-01 transfer to the seeded mule account, linked to the scan", () => {
    expect(STORY_RECIPIENT_ACCOUNT).toBe("990123456789");
    expect(STORY_AMOUNT_VND).toBe(9_500_000);
    expect(buildTransfer("s1")).toMatchObject({
      userId: "USER_B2C_HUNG",
      recipientAccount: "990123456789",
      amountVnd: 9_500_000,
      scanId: "s1",
    });
    expect(buildEscalate()).toMatchObject({ guardianId: "FAMILY_MINH" });
  });

  it("Maker proposes an ACTIVE bank-account indicator backed by ≥2 source TYPES (governance-valid)", () => {
    const body = buildMakerDecision(debate, MAKER_DRAFT_VI);
    expect(body).toMatchObject({
      decision: "PROPOSE_IMMUNITY",
      requestedLevel: "ACTIVE",
      indicatorType: "BANK_ACCOUNT",
      indicatorValue: "990123456789",
      actorId: "RISK_MAKER_HUYEN",
      actorRole: "RISK_MAKER",
    });
    if (body.decision !== "PROPOSE_IMMUNITY") throw new Error("unreachable");
    expect(new Set(body.evidenceSources.map((s) => s.split("_")[0])).size).toBeGreaterThanOrEqual(2);
  });

  it("the Checker is a different person from the Maker", () => {
    expect(buildApprove(CHECKER_DRAFT_VI)).toMatchObject({ checkerId: "RISK_CHECKER_TUAN", checkerRole: "RISK_CHECKER" });
    expect(buildInvestigate()).toMatchObject({ actorId: "RISK_MAKER_HUYEN" });
  });

  it("a new user looks up the same account", () => {
    expect(buildNewUserProbe()).toMatchObject({
      userId: "USER_B2C_NEW",
      inputType: "TEXT_LOOKUP",
      recipientAccount: "990123456789",
    });
  });

  it("drafts are honest: 'Kết luận rủi ro cao', never 'xác nhận lừa đảo'", () => {
    for (const draft of [MAKER_DRAFT_VI, CHECKER_DRAFT_VI]) {
      expect(draft.length).toBeGreaterThanOrEqual(3);
      expect(draft.toLowerCase()).not.toContain("xác nhận lừa đảo");
    }
  });
});
