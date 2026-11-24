import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getStr, POST as postStr } from "@/app/api/warroom/cases/[caseId]/str/route";
import { prisma } from "@/lib/prisma";

/** Seam: STR draft + deadline for a Kết luận rủi ro cao, confirmed by a person, simulated only (ticket #7). */
const sessionId = `w5-str-${Date.now()}`;
let closedCaseId = "";
let openCaseId = "";

const req = (caseId: string, body?: unknown) =>
  new Request(`http://localhost/api/warroom/cases/${encodeURIComponent(caseId)}/str?session=${sessionId}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (caseId: string) => ({ params: Promise.resolve({ caseId }) });

beforeAll(async () => {
  const tx = await prisma.heldTransaction.create({
    data: {
      demoSessionId: sessionId,
      senderId: "USER_B2C_HUNG",
      senderLabel: "Bác Hùng",
      recipientAccount: "990123456789",
      recipientBank: "X",
      amountVnd: 9_500_000,
      status: "CANCELLED_BY_B2E",
      neutralMessage: "x",
      holdExpiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  const base = {
    demoSessionId: sessionId,
    scenarioCode: "CASE-01",
    title: "t",
    subtitle: "s",
    graphDataJson: JSON.stringify({ nodes: [], edges: [] }),
    caseContextJson: "{}",
    sanitizedMinute0Json: JSON.stringify({ scam_category: "POLICE_IMPERSONATION", summary_vi: "Giả danh công an" }),
  };
  closedCaseId = (await prisma.investigationCase.create({ data: { ...base, txId: tx.txId, status: "CLOSED" } })).caseId;
  openCaseId = (await prisma.investigationCase.create({ data: { ...base, status: "PENDING_DECISION" } })).caseId;
});

afterAll(async () => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.investigationCase.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.heldTransaction.deleteMany({ where: { demoSessionId: sessionId } }),
  ]);
});

describe("STR draft and deadline", () => {
  it("is only offered once a case has a Kết luận rủi ro cao", async () => {
    const body = await (await getStr(req(openCaseId), ctx(openCaseId))).json();
    expect(body.eligible).toBe(false);
  });

  it("shows a labelled draft and the earliest legal deadline, with signs of a crime → 24h", async () => {
    const res = await getStr(req(closedCaseId), ctx(closedCaseId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ eligible: true, criminalSigns: true, basis: "CRIMINAL_24_HOURS", confirmedAt: null });
    expect(body.draftVi).toContain("MẪU MÔ PHỎNG");
    expect(body.draftVi).not.toContain("990123456789"); // account masked in the draft
    expect(new Date(body.deadline).getTime()).toBeGreaterThan(Date.now());
  });

  it("is never sent automatically: only a B2E person confirms, once, and it is audited", async () => {
    const customer = await postStr(req(closedCaseId, { actorId: "USER_B2C_HUNG", actorRole: "USER_B2C" }), ctx(closedCaseId));
    expect(customer.status).toBe(403);

    const ok = await postStr(req(closedCaseId, { actorId: "RISK_CHECKER_TUAN", actorRole: "RISK_CHECKER" }), ctx(closedCaseId));
    expect(ok.status).toBe(200);
    expect((await ok.json()).confirmedAt).toBeTruthy();

    const again = await postStr(req(closedCaseId, { actorId: "RISK_CHECKER_TUAN", actorRole: "RISK_CHECKER" }), ctx(closedCaseId));
    expect(again.status).toBe(409);

    const log = await prisma.auditLog.findFirst({ where: { demoSessionId: sessionId, action: "STR_SUBMISSION_CONFIRMED" } });
    expect(log?.rationale).toContain("MẪU MÔ PHỎNG");
    expect(log?.targetId).toBe(closedCaseId);
  });

  it("refuses to confirm a case without a Kết luận rủi ro cao", async () => {
    const res = await postStr(req(openCaseId, { actorId: "RISK_MAKER_HUYEN", actorRole: "RISK_MAKER" }), ctx(openCaseId));
    expect(res.status).toBe(409);
  });
});
