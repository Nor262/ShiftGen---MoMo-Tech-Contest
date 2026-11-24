import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * #6: what a guardian may see. Only owners whose invitation this guardian ACCEPTED, and only while
 * the owner has not revoked it (Luật 91/2025 Điều 9–10, 15.2.b; TT 40 Điều 19.1.n).
 */
export async function acceptedOwnersOf(demoSessionId: string, guardianId: string) {
  const rows = await prisma.userConsent.findMany({
    where: { demoSessionId, guardianId },
    select: { userId: true, guardianStatus: true },
  });
  return {
    accepted: rows.filter((r) => r.guardianStatus === "ACCEPTED").map((r) => r.userId),
    revoked: rows.some((r) => r.guardianStatus === "REVOKED"),
    invited: rows.filter((r) => r.guardianStatus === "INVITED").map((r) => r.userId),
  };
}

export function guardianDenied(revoked: boolean, invitedBy: string[] = []) {
  return NextResponse.json(
    revoked
      ? { error: "Chủ ví đã thu hồi quyền người giám hộ của bạn.", code: "GUARDIAN_REVOKED" }
      : {
          error: "Bạn cần xác nhận lời mời làm người giám hộ trước khi xem thông tin.",
          code: "GUARDIAN_NOT_ACCEPTED",
          invitedBy,
        },
    { status: 403 },
  );
}

/** Guardians see the receiving account only partly: last 4 digits. */
export function maskAccount(account: string): string {
  const digits = account.replace(/\D/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : account;
}
