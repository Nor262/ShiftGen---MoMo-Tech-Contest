import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds, SESSION_HEADER_NAME } from "@/lib/session";
import {
  approveImmunityIndicator,
  countIndependentSourceTypes,
  ImmunityGovernanceError,
  resolveAppeal,
} from "@/lib/immunity/service";
import { addWorkingDays } from "@/lib/working-days";
import { POST as postDecision } from "@/app/api/warroom/cases/[caseId]/decision/route";
import { POST as postEscalate } from "@/app/api/shield/family/escalate/[txId]/route";

const SESSIONS: string[] = [];
function session(prefix: string): string {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  SESSIONS.push(id);
  return id;
}

function heldTx(demoSessionId: string, status: string, holdExpiresAt: Date) {
  return prisma.heldTransaction.create({
    data: {
      demoSessionId,
      senderId: "USER_B2C_HUNG",
      senderLabel: "MẪU MÔ PHỎNG",
      recipientAccount: "000111222333",
      recipientBank: "MÔ PHỎNG",
      amountVnd: 9_500_000,
      status,
      neutralMessage: "x",
      holdExpiresAt,
    },
  });
}

function post(path: string, demoSessionId: string, body: unknown): Request {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { [SESSION_HEADER_NAME]: demoSessionId, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  for (const demoSessionId of SESSIONS) {
    await prisma.$transaction([
      prisma.appeal.deleteMany({ where: { demoSessionId } }),
      prisma.immunityIndicator.deleteMany({ where: { demoSessionId } }),
      prisma.investigationCase.deleteMany({ where: { demoSessionId } }),
      prisma.heldTransaction.deleteMany({ where: { demoSessionId } }),
      prisma.auditLog.deleteMany({ where: { demoSessionId } }),
    ]);
  }
});

describe("Fix 1 — Giải phóng khi hết hạn Tạm giữ", () => {
  it("releases only expired ON_HOLD_24H holds and audits them", async () => {
    const s = session("w5-expire");
    const past = new Date(Date.now() - 1000);
    const expired = await heldTx(s, "ON_HOLD_24H", past);
    const live = await heldTx(s, "ON_HOLD_24H", new Date(Date.now() + 3_600_000));
    const escalated = await heldTx(s, "ESCALATED_TO_B2E", past);

    expect(await releaseExpiredHolds(s)).toBe(1);

    const byId = async (txId: string) =>
      (await prisma.heldTransaction.findUniqueOrThrow({ where: { txId } })).status;
    expect(await byId(expired.txId)).toBe("RELEASED");
    expect(await byId(live.txId)).toBe("ON_HOLD_24H");
    expect(await byId(escalated.txId)).toBe("ESCALATED_TO_B2E");
    expect(
      await prisma.auditLog.count({ where: { demoSessionId: s, targetId: expired.txId, action: "TRANSFER_COMPLETED" } }),
    ).toBe(1);
  });

  it("refuses to escalate a hold that has already expired", async () => {
    const s = session("w5-escalate");
    const tx = await heldTx(s, "ON_HOLD_24H", new Date(Date.now() - 1000));
    const res = await postEscalate(
      post(`/api/shield/family/escalate/${tx.txId}`, s, { guardianId: "FAMILY_MINH" }),
      { params: Promise.resolve({ txId: tx.txId }) },
    );
    expect(res.status).toBe(409);
  });
});

describe("Fix 2 — Minh oan giải phóng giao dịch", () => {
  it("DISMISS_FP releases the case's escalated hold", async () => {
    const s = session("w5-fp");
    const tx = await heldTx(s, "ESCALATED_TO_B2E", new Date(Date.now() + 3_600_000));
    const c = await prisma.investigationCase.create({
      data: {
        demoSessionId: s,
        txId: tx.txId,
        scenarioCode: "TEST",
        title: "MẪU MÔ PHỎNG",
        subtitle: "",
        status: "OPEN",
        graphDataJson: "{}",
        caseContextJson: "{}",
      },
    });
    const res = await postDecision(
      post(`/api/warroom/cases/${c.caseId}/decision`, s, {
        decision: "DISMISS_FP",
        actorId: "RISK_MAKER_HUYEN",
        actorRole: "RISK_MAKER",
        rationale: "Tiểu thương hợp pháp",
      }),
      { params: Promise.resolve({ caseId: c.caseId }) },
    );
    expect(res.status).toBe(200);
    expect((await prisma.heldTransaction.findUniqueOrThrow({ where: { txId: tx.txId } })).status).toBe("RELEASED");
  });
});

describe("Fix 4 — Người xét khiếu nại khác Checker đã kích hoạt", () => {
  it("rejects the activating Checker and accepts a different one", async () => {
    const s = session("w5-appeal");
    const ind = await prisma.immunityIndicator.create({
      data: {
        demoSessionId: s,
        indicatorType: "BANK_ACCOUNT",
        indicatorValue: "000111222333",
        severity: "HIGH_RISK",
        status: "ACTIVE",
        evidenceSourcesJson: JSON.stringify(["a", "b"]),
        makerId: "RISK_MAKER_HUYEN",
        checkerId: "RISK_CHECKER_TUAN",
        ttlHours: 720,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    const appeal = await prisma.appeal.create({
      data: {
        demoSessionId: s,
        indicatorId: ind.indicatorId,
        appellantName: "MẪU MÔ PHỎNG",
        appellantNote: "x",
        status: "PENDING_HUMAN_REVIEW",
      },
    });
    const input = {
      demoSessionId: s,
      indicatorId: ind.indicatorId,
      appealId: appeal.appealId,
      reviewerRole: "RISK_CHECKER" as const,
      resolution: "UPHELD" as const,
      resolutionNote: "Giữ nguyên",
    };

    await expect(resolveAppeal({ ...input, reviewerId: "RISK_CHECKER_TUAN" })).rejects.toMatchObject({
      statusCode: 403,
      code: "APPEAL_REVIEWER_CONFLICT",
    } satisfies Partial<ImmunityGovernanceError>);

    const ok = await resolveAppeal({ ...input, reviewerId: "RISK_CHECKER_LAN" });
    expect(ok.appeal.status).toBe("UPHELD");
  });
});

describe("Q36 — Nguồn độc lập phải khác loại", () => {
  it("counts distinct source types by prefix", () => {
    expect(countIndependentSourceTypes(["MINUTE0_B2C_EVIDENCE", "MINUTE0_B2C_APK_SCREENSHOT"])).toBe(1);
    expect(countIndependentSourceTypes(["MINUTE0_B2C_EVIDENCE", "INTERNAL_GRAPH_SMURFING_MULE"])).toBe(2);
  });
});

describe("Q38 — Kết luận rủi ro cao hủy giao dịch tạm giữ (CANCELLED_BY_B2E)", () => {
  async function setup(sources: string[]) {
    const s = session("w5-b2e");
    const tx = await heldTx(s, "ESCALATED_TO_B2E", new Date(Date.now() + 3_600_000));
    const c = await prisma.investigationCase.create({
      data: { demoSessionId: s, txId: tx.txId, scenarioCode: "TEST", title: "MẪU MÔ PHỎNG", subtitle: "", status: "IMMUNITY_PROPOSED", graphDataJson: "{}", caseContextJson: "{}" },
    });
    const ind = await prisma.immunityIndicator.create({
      data: {
        demoSessionId: s, caseId: c.caseId, indicatorType: "BANK_ACCOUNT", indicatorValue: "000111222333",
        severity: "HIGH_RISK", status: "PENDING_CHECKER", evidenceSourcesJson: JSON.stringify(sources),
        makerId: "RISK_MAKER_HUYEN", ttlHours: 720, expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    const approve = () =>
      approveImmunityIndicator({
        demoSessionId: s, indicatorId: ind.indicatorId, checkerId: "RISK_CHECKER_TUAN",
        checkerRole: "RISK_CHECKER", rationale: "Đủ 2 loại nguồn", ttlHours: 720,
      });
    return { s, tx, approve };
  }

  it("rejects two sources of the same type", async () => {
    const { approve } = await setup(["MINUTE0_A", "MINUTE0_B"]);
    await expect(approve()).rejects.toMatchObject({ statusCode: 400, code: "INSUFFICIENT_EVIDENCE_SOURCES" });
  });

  it("cancels the case's held tx as CANCELLED_BY_B2E with a checker audit", async () => {
    const { s, tx, approve } = await setup(["MINUTE0_B2C_EVIDENCE", "INTERNAL_GRAPH_SMURFING_MULE"]);
    await approve();
    expect((await prisma.heldTransaction.findUniqueOrThrow({ where: { txId: tx.txId } })).status).toBe("CANCELLED_BY_B2E");
    const log = await prisma.auditLog.findFirstOrThrow({ where: { demoSessionId: s, targetId: tx.txId, action: "TRANSFER_CANCELLED" } });
    expect(log.actorRole).toBe("RISK_CHECKER");
  });
});

describe("Q40 — Yêu cầu xét lại tạm giữ", () => {
  it("owner self-escalation is audited as HOLD_REVIEW_REQUESTED, not as a guardian action", async () => {
    const s = session("w5-review");
    const tx = await heldTx(s, "ON_HOLD_24H", new Date(Date.now() + 3_600_000));
    const res = await postEscalate(
      post(`/api/shield/family/escalate/${tx.txId}`, s, { guardianId: "USER_B2C_HUNG" }),
      { params: Promise.resolve({ txId: tx.txId }) },
    );
    expect(res.status).toBeLessThan(300);
    expect((await prisma.heldTransaction.findUniqueOrThrow({ where: { txId: tx.txId } })).status).toBe("ESCALATED_TO_B2E");
    const log = await prisma.auditLog.findFirstOrThrow({ where: { demoSessionId: s, action: "HOLD_REVIEW_REQUESTED" } });
    expect(log.actorRole).toBe("USER_B2C");
  });
});

describe("Q39 — addWorkingDays", () => {
  it("skips the weekend (UTC+7)", () => {
    // Fri 2026-11-27 10:00 +07 → +3 working days = Wed 2026-12-02
    const d = addWorkingDays(new Date("2026-11-27T03:00:00Z"), 3);
    expect(d.toISOString().slice(0, 10)).toBe("2026-12-02");
  });
});
