import { prisma } from "@/lib/prisma";

const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface DailyLlmQuotaResult {
  allowed: boolean;
  dateKey: string;
  used: number;
  limit: number;
  remaining: number;
}

export function getDailyLlmLimit(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return Math.floor(override);
  }
  const parsed = Number.parseInt(process.env.DAILY_LLM_CALL_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 100;
}

export function getVietnamDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + VIETNAM_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

export async function getDailyLlmUsage(options?: {
  limit?: number;
  now?: Date;
}): Promise<DailyLlmQuotaResult> {
  const limit = getDailyLlmLimit(options?.limit);
  const dateKey = getVietnamDateKey(options?.now);
  const row = await prisma.dailyLlmUsage.findUnique({ where: { dateKey } });
  const used = row?.callCount ?? 0;

  return {
    allowed: used < limit,
    dateKey,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function consumeDailyLlmQuota(options?: {
  limit?: number;
  now?: Date;
}): Promise<DailyLlmQuotaResult> {
  const limit = getDailyLlmLimit(options?.limit);
  const dateKey = getVietnamDateKey(options?.now);

  if (limit <= 0) {
    return { allowed: false, dateKey, used: 0, limit: 0, remaining: 0 };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.dailyLlmUsage.findUnique({ where: { dateKey } });
        const current = existing?.callCount ?? 0;

        if (current >= limit) {
          return {
            allowed: false,
            dateKey,
            used: current,
            limit,
            remaining: 0,
          };
        }

        const row = await tx.dailyLlmUsage.upsert({
          where: { dateKey },
          create: { dateKey, callCount: 1 },
          update: { callCount: { increment: 1 } },
        });

        return {
          allowed: true,
          dateKey,
          used: row.callCount,
          limit,
          remaining: Math.max(0, limit - row.callCount),
        };
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002" && attempt === 0) {
        continue;
      }
      throw err;
    }
  }

  return { allowed: false, dateKey, used: limit, limit, remaining: 0 };
}
