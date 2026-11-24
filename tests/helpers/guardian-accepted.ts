import { POST as postEscalate } from "@/app/api/shield/family/escalate/[txId]/route";
import { GET as getHolds } from "@/app/api/shield/family/holds/route";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";

/**
 * Test setup only: every guardian named in this session has already accepted their invitation (#6).
 * Tests about the invitation itself call the routes directly (tests/wave5-guardian-consent.test.ts).
 */
async function acceptAllInvitations(request: Request) {
  await prisma.userConsent.updateMany({
    where: { demoSessionId: getSessionId(request), guardianId: { not: null } },
    data: { guardianStatus: "ACCEPTED" },
  });
}

export async function getFamilyHoldsAccepted(request: Request): Promise<Response> {
  await acceptAllInvitations(request);
  return getHolds(request);
}

export async function postFamilyEscalateAccepted(
  request: Request,
  context: { params: Promise<{ txId: string }> },
): Promise<Response> {
  await acceptAllInvitations(request);
  return postEscalate(request, context);
}
