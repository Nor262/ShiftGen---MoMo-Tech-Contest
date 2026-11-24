import { POST as postScan } from "@/app/api/shield/scan/route";
import { prisma } from "@/lib/prisma";
import { ensureSessionSeeded, getSessionId } from "@/lib/session";

/**
 * Test setup only: the user has already agreed to the scan purpose (#5), then the real route runs.
 * Tests about consent itself call the route directly (tests/wave5-scan-consent.test.ts).
 */
export async function postScanWithConsent(request: Request): Promise<Response> {
  // hand-built request stubs (e.g. the oversized-upload guard test) never reach the consent check
  if (typeof request.clone !== "function") return postScan(request);
  const demoSessionId = getSessionId(request);
  const probe = request.clone();
  let userId = "USER_B2C_HUNG";
  if ((probe.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    userId = String((await probe.formData()).get("userId") ?? userId);
  } else {
    userId = ((await probe.json().catch(() => ({}))) as { userId?: string }).userId ?? userId;
  }
  await ensureSessionSeeded(demoSessionId);
  await prisma.userConsent.upsert({
    where: { demoSessionId_userId: { demoSessionId, userId } },
    create: { demoSessionId, userId, optInScan: true, consentVersion: "test-setup" },
    update: { optInScan: true },
  });
  return postScan(request);
}
