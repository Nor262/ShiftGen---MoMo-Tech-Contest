import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLlmStatus } from "@/lib/session";
import { HealthResponseSchema } from "@/contracts";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const payload = HealthResponseSchema.parse({
    ok: true,
    status: dbOk ? "healthy" : "degraded",
    db: dbOk ? "connected" : "error",
    llm: getLlmStatus(),
    timestamp: new Date().toISOString(),
  });

  // Always return 200 so platform deploy health checks pass even before DB env is attached.
  return NextResponse.json(payload, { status: 200 });
}
