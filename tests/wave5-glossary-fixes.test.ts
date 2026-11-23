import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { releaseExpiredHolds, SESSION_HEADER_NAME } from "@/lib/session";
import { ImmunityGovernanceError, resolveAppeal } from "@/lib/immunity/service";
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
