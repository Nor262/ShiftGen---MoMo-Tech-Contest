import { NextResponse } from "next/server";
import {
  getSessionId,
  getSessionSnapshot,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { SessionResponseSchema } from "@/contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const sessionId = getSessionId(request);
    const snapshot = await getSessionSnapshot(sessionId);
    const validated = SessionResponseSchema.parse(snapshot);

    const response = NextResponse.json(validated, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error("[GET /api/session]", err);
    return NextResponse.json(
      { error: "Database unavailable for demo session", code: "DB_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
