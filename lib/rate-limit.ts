export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  bypassInTest?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAtMs: number;
  retryAfterSec: number;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getDefaultRateLimitConfig(): RateLimitConfig {
  return {
    maxRequests: parsePositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 30),
    windowMs: parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 600_000),
    bypassInTest: true,
  };
}

// shortcut: in-memory sliding-window Map, upgrade to Redis/Upstash if running multiple server instances
export function createRateLimiter(overrides?: Partial<RateLimitConfig>) {
  const store = new Map<string, number[]>();

  function check(
    ip: string,
    sessionId: string,
    nowMs: number = Date.now(),
  ): RateLimitResult {
    const cfg = { ...getDefaultRateLimitConfig(), ...overrides };
    if (cfg.bypassInTest !== false && process.env.NODE_ENV === "test") {
      return {
        allowed: true,
        remaining: cfg.maxRequests,
        limit: cfg.maxRequests,
        resetAtMs: nowMs + cfg.windowMs,
        retryAfterSec: 0,
      };
    }

    const key = `${ip || "unknown"}:${sessionId || "default"}`;
    const cutoff = nowMs - cfg.windowMs;
    const timestamps = (store.get(key) ?? []).filter((ts) => ts > cutoff);

    if (timestamps.length >= cfg.maxRequests) {
      const oldest = timestamps[0] ?? nowMs;
      const resetAtMs = oldest + cfg.windowMs;
      store.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        limit: cfg.maxRequests,
        resetAtMs,
        retryAfterSec: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
      };
    }

    timestamps.push(nowMs);
    store.set(key, timestamps);
    return {
      allowed: true,
      remaining: Math.max(0, cfg.maxRequests - timestamps.length),
      limit: cfg.maxRequests,
      resetAtMs: timestamps[0] + cfg.windowMs,
      retryAfterSec: 0,
    };
  }

  function reset(): void {
    store.clear();
  }

  return { check, reset };
}

export const defaultRateLimiter = createRateLimiter();

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}
