import { afterEach, describe, expect, it, vi } from "vitest";
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
  runBeat,
  storyContext,
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
    // two separate purposes granted in the same beat (#5): 24h protection and scan analysis
    expect(buildConsent()).toMatchObject({ userId: "USER_B2C_HUNG", optIn24hHold: true, optInScan: true, guardianId: "FAMILY_MINH" });
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

describe("runBeat checks the story actually happened, not just HTTP 200", () => {
  const reply = (body: unknown, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  afterEach(() => vi.unstubAllGlobals());

  it("stops at 2.1 when the transfer was not held (a low AI score must not look like a hold)", async () => {
    const tx = { txId: "t1", status: "COMPLETED", neutralMessage: "", holdExpiresAt: null, transaction: {} };
    vi.stubGlobal("fetch", reply(tx));
    await expect(runBeat("2.1", { scanId: "s1" })).rejects.toThrow(/không bị tạm giữ/);
  });

  it("stops at 4.2 when the new user gets no warning", async () => {
    vi.stubGlobal("fetch", reply({ immunityHit: null }));
    await expect(runBeat("4.2", {})).rejects.toThrow(/không thấy cảnh báo/);
  });

  it("shows the API's own Vietnamese error on failure", async () => {
    vi.stubGlobal("fetch", reply({ error: "Đã đạt hạn mức lượt gọi AI trong ngày", code: "X" }, 429));
    await expect(runBeat("1.2", {})).rejects.toThrow("Đã đạt hạn mức lượt gọi AI trong ngày");
  });

  it("refuses a Maker proposal that governance would reject, with a reason instead of a dead 400", async () => {
    const thin = { ...debate, synthesis: { ...debate.synthesis, independent_sources: ["SIMO_A", "SIMO_B"] } };
    const fetchSpy = reply({});
    vi.stubGlobal("fetch", fetchSpy);
    await expect(runBeat("3.2", { caseId: "c", debate: thin })).rejects.toThrow(/2 loại nguồn/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the Checker's own rationale, never the Maker's", async () => {
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body)).rationale).toBe("checker words");
      return new Response("not json", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    await expect(
      runBeat("4.1", { indicatorId: "i1", makerRationale: "maker words", checkerRationale: "checker words" }),
    ).rejects.toThrow(/Phản hồi không hợp lệ/);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe("storyContext gathers ids from earlier beats", () => {
  it("maps each beat's result to what the next beats need", () => {
    const ctx = storyContext({
      "1.2": { scanId: "s1" },
      "2.1": { txId: "t1" },
      "2.2": { caseId: "c1" },
      "3.1": { debate },
      "3.2": { indicator: { indicatorId: "i1" } },
    });
    expect(ctx).toEqual({ scanId: "s1", txId: "t1", caseId: "c1", debate, indicatorId: "i1" });
    expect(storyContext({})).toEqual({});
  });
});

describe("4.1 reports the held transfer's real status after approval", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the transaction back instead of assuming it was cancelled", async () => {
    const indicator = {
      indicatorId: "i1",
      demoSessionId: "d",
      caseId: "c",
      indicatorType: "BANK_ACCOUNT",
      indicatorValue: "990123456789",
      severity: "HIGH_RISK",
      status: "ACTIVE",
      evidenceSources: ["A_1", "B_1"],
      makerId: "RISK_MAKER_HUYEN",
      checkerId: "RISK_CHECKER_TUAN",
      ttlHours: 720,
      expiresAt: "2026-12-24T00:00:00.000Z",
      rollbackReason: null,
      createdAt: "2026-11-24T00:00:00.000Z",
      updatedAt: "2026-11-24T00:00:00.000Z",
    };
    const fetchSpy = vi.fn(async (url: string) =>
      url.includes("/approve")
        ? new Response(JSON.stringify({ indicator }), { status: 200 })
        : new Response(JSON.stringify({ holds: [{ txId: "t1", status: "CANCELLED_BY_B2E" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const out = (await runBeat("4.1", { indicatorId: "i1", txId: "t1", checkerRationale: "đã kiểm tra" })) as {
      txStatus?: string;
    };
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1][0])).toContain("/api/shield/family/holds");
    expect(out.txStatus).toBe("CANCELLED_BY_B2E");
  });

  it("refuses a blank or too-short reason before calling the API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(runBeat("4.1", { indicatorId: "i1", txId: "t1", checkerRationale: "  " })).rejects.toThrow(/lý do/i);
    await expect(runBeat("3.2", { caseId: "c", debate, makerRationale: "ab" })).rejects.toThrow(/lý do/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("final review: the story stays on its own session", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends ?session= on every call, so another tab's cookie cannot hijack the story", async () => {
    const fetchSpy = vi.fn(async (_url: string) => new Response(JSON.stringify({ error: "x" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);
    await runBeat("1.1", { session: "demo-abc" }).catch(() => {});
    expect(String(fetchSpy.mock.calls[0][0])).toContain("session=demo-abc");
  });

  it("4.1 still succeeds when the follow-up holds read fails (approval already went through)", async () => {
    const indicator = {
      indicatorId: "i1", demoSessionId: "d", caseId: "c", indicatorType: "BANK_ACCOUNT",
      indicatorValue: "990123456789", severity: "HIGH_RISK", status: "ACTIVE", evidenceSources: ["A_1", "B_1"],
      makerId: "RISK_MAKER_HUYEN", checkerId: "RISK_CHECKER_TUAN", ttlHours: 720,
      expiresAt: "2026-12-24T00:00:00.000Z", rollbackReason: null,
      createdAt: "2026-11-24T00:00:00.000Z", updatedAt: "2026-11-24T00:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/approve")) return new Response(JSON.stringify({ indicator }), { status: 200 });
        throw new TypeError("Failed to fetch");
      }),
    );
    const out = (await runBeat("4.1", { session: "s", indicatorId: "i1", txId: "t1" })) as { txStatus?: string };
    expect(out.txStatus).toBeUndefined();
  });
});
