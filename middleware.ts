import { NextResponse, type NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "tl_session";
export const SESSION_HEADER_NAME = "x-demo-session-id";
const SESSION_SLUG_REGEX = /^[a-zA-Z0-9-]{1,64}$/;

export function sanitizeSessionSlug(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!SESSION_SLUG_REGEX.test(trimmed)) return null;
  return trimmed;
}

function generateSessionSlug(): string {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `demo-${raw}`;
}

export function middleware(request: NextRequest): NextResponse {
  const fromQuery = sanitizeSessionSlug(request.nextUrl.searchParams.get("session"));
  const fromCookie = sanitizeSessionSlug(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const sessionId = fromQuery ?? fromCookie ?? generateSessionSlug();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_HEADER_NAME, sessionId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (fromQuery || !fromCookie || fromCookie !== sessionId) {
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo-images/).*)"],
};
