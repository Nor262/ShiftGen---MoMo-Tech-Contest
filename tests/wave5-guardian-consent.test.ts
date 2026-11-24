import { afterAll, describe, expect, it } from "vitest";
import { POST as postConsent } from "@/app/api/shield/consent/route";
import { POST as postGuardian } from "@/app/api/shield/family/guardian/route";
import { GET as getHolds } from "@/app/api/shield/family/holds/route";
import { POST as postEscalate } from "@/app/api/shield/family/escalate/[txId]/route";
import { prisma } from "@/lib/prisma";

/**
 * Seam: a guardian sees nothing until they accept, and nothing after the owner revokes (ticket #6;
 * Luật 91/2025 Điều 9–10, 15.2.b; TT 40 Điều 19.1.n).
 */
const sessionId = `w5-guardian-${Date.now()}`;
const req = (path: string, body?: unknown) =>
  new Request(`http://localhost${path}${path.includes("?") ? "&" : "?"}session=${sessionId}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let txId = "";
async function seedHeldTransfer() {
  const tx = await prisma.heldTransaction.create({
    data: {
      demoSessionId: sessionId,
      senderId: "USER_B2C_HUNG",
      senderLabel: "Bác Hùng (62 tuổi)",
      recipientAccount: "990123456789",
      recipientBank: "Ngân hàng nhận (MẪU MÔ PHỎNG)",
      amountVnd: 9_500_000,
      status: "ON_HOLD_24H",
      neutralMessage: "x",
      holdExpiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  txId = tx.txId;
}
const holds = () => getHolds(req("/api/shield/family/holds?guardianId=FAMILY_MINH"));
const escalate = () =>
  postEscalate(req(`/api/shield/family/escalate/${txId}`, { guardianId: "FAMILY_MINH" }), {
    params: Promise.resolve({ txId }),
  });
const guardian = (body: Record<string, unknown>) => postGuardian(req("/api/shield/family/guardian", body));

afterAll(async () => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.userConsent.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.heldTransaction.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.investigationCase.deleteMany({ where: { demoSessionId: sessionId } }),
    prisma.scanSession.deleteMany({ where: { demoSessionId: sessionId } }),
  ]);
});

describe("guardian consent: invite → accept → revoke", () => {
  it("inviting a guardian does not let them see anything yet", async () => {
    const c = await postConsent(
      req("/api/shield/consent", { userId: "USER_B2C_HUNG", optIn24hHold: true, guardianId: "FAMILY_MINH" }),
    );
    expect((await c.json()).consent).toMatchObject({ guardianId: "FAMILY_MINH", guardianStatus: "INVITED" });
    await seedHeldTransfer();
    const h = await holds();
    expect(h.status).toBe(403);
    expect((await h.json()).code).toBe("GUARDIAN_NOT_ACCEPTED");
    expect((await escalate()).status).toBe(403);
  });

  it("only the invited guardian can accept", async () => {
    const wrong = await guardian({ action: "ACCEPT", ownerId: "USER_B2C_HUNG", guardianId: "FAMILY_OTHER" });
    expect(wrong.status).toBe(403);
  });

  it("after accepting, the guardian sees cards with the account partly masked, and can escalate", async () => {
    const ok = await guardian({ action: "ACCEPT", ownerId: "USER_B2C_HUNG", guardianId: "FAMILY_MINH" });
    expect(ok.status).toBe(200);
    expect((await ok.json()).consent.guardianStatus).toBe("ACCEPTED");
    const h = await holds();
    expect(h.status).toBe(200);
    const cards = (await h.json()).holds;
    expect(cards).toHaveLength(1);
    expect(cards[0].recipientAccount).not.toContain("990123456789");
    expect(cards[0].recipientAccount).toContain("6789");
    expect((await escalate()).status).toBe(200);
  });

  it("after the owner revokes, the guardian sees nothing and cannot escalate", async () => {
    const off = await guardian({ action: "REVOKE", ownerId: "USER_B2C_HUNG" });
    expect(off.status).toBe(200);
    expect((await off.json()).consent.guardianStatus).toBe("REVOKED");
    const h = await holds();
    expect(h.status).toBe(403);
    expect((await h.json()).code).toBe("GUARDIAN_REVOKED");
    expect((await escalate()).status).toBe(403);
  });

  it("logs invite, accept and revoke", async () => {
    const actions = (
      await prisma.auditLog.findMany({ where: { demoSessionId: sessionId }, orderBy: { createdAt: "asc" } })
    ).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["GUARDIAN_INVITED", "GUARDIAN_ACCEPTED", "GUARDIAN_REVOKED"]));
    expect(actions.indexOf("GUARDIAN_INVITED")).toBeLessThan(actions.indexOf("GUARDIAN_ACCEPTED"));
    expect(actions.indexOf("GUARDIAN_ACCEPTED")).toBeLessThan(actions.indexOf("GUARDIAN_REVOKED"));
  });
});
