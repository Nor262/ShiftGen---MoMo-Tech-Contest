import { toUserConsentDto } from "./shield";
import { getPrimaryLlmStatus } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { seedBaselineSession } from "@/prisma/seed";
import {
  ActorRoleSchema,
  AppealStatusSchema,
  AuditActionSchema,
  CaseStatusSchema,
  GraphDataSchema,
  HeldTxStatusSchema,
  ImmunityIndicatorTypeSchema,
  ImmunitySeveritySchema,
  ImmunityStatusSchema,
  SanitizedEvidenceSchema,
  WarRoomDebateSchema,
  type LlmStatus,
  type SessionResponse,
} from "@/contracts";

export const SESSION_COOKIE_NAME = "tl_session";
export const SESSION_HEADER_NAME = "x-demo-session-id";
export const DEFAULT_SESSION_ID = "default";
const SESSION_SLUG_REGEX = /^[a-zA-Z0-9-]{1,64}$/;

export function sanitizeSessionId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return SESSION_SLUG_REGEX.test(trimmed) ? trimmed : null;
}

function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function getSessionId(request?: Request): string {
  if (!request) return DEFAULT_SESSION_ID;

  try {
    const url = new URL(request.url);
    const fromQuery = sanitizeSessionId(url.searchParams.get("session"));
    if (fromQuery) return fromQuery;
  } catch {
    // Ignore malformed URLs and fall back to headers/cookie.
  }

  const fromHeader = sanitizeSessionId(request.headers.get(SESSION_HEADER_NAME));
  if (fromHeader) return fromHeader;

  const fromCookie = sanitizeSessionId(
    readCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME),
  );
  if (fromCookie) return fromCookie;

  return DEFAULT_SESSION_ID;
}

export function getLlmStatus(): LlmStatus {
  return getPrimaryLlmStatus();
}

export async function ensureSessionSeeded(demoSessionId: string): Promise<number> {
  return seedBaselineSession(demoSessionId);
}

/** Glossary "Giải phóng": a hold past holdExpiresAt that was neither cancelled nor escalated is released. */
export async function releaseExpiredHolds(demoSessionId: string, now = new Date()): Promise<number> {
  const expired = await prisma.heldTransaction.findMany({
    where: { demoSessionId, status: "ON_HOLD_24H", holdExpiresAt: { lte: now } },
    select: { txId: true, senderId: true },
  });
  if (expired.length === 0) return 0;

  await prisma.$transaction([
    prisma.heldTransaction.updateMany({
      where: { txId: { in: expired.map((t) => t.txId) }, status: "ON_HOLD_24H" },
      data: { status: "RELEASED" },
    }),
    prisma.auditLog.createMany({
      data: expired.map((t) => ({
        demoSessionId,
        actorId: t.senderId,
        actorRole: "USER_B2C",
        action: "TRANSFER_COMPLETED",
        targetId: t.txId,
        rationale: "Hết hạn tạm giữ 24h, không bị hủy hay chuyển cấp: giao dịch được giải phóng.",
        metadataJson: JSON.stringify({ releaseReason: "HOLD_EXPIRED" }),
      })),
    }),
  ]);
  return expired.length;
}

export async function resetDemoSession(
  demoSessionId: string,
): Promise<{ sessionId: string; seededCasesCount: number }> {
  await prisma.$transaction([
    prisma.appeal.deleteMany({ where: { demoSessionId } }),
    prisma.immunityIndicator.deleteMany({ where: { demoSessionId } }),
    prisma.investigationCase.deleteMany({ where: { demoSessionId } }),
    prisma.heldTransaction.deleteMany({ where: { demoSessionId } }),
    prisma.scanSession.deleteMany({ where: { demoSessionId } }),
    prisma.userConsent.deleteMany({ where: { demoSessionId } }),
    prisma.auditLog.deleteMany({ where: { demoSessionId } }),
  ]);

  const seededCasesCount = await seedBaselineSession(demoSessionId);

  await prisma.auditLog.create({
    data: {
      demoSessionId,
      actorId: "SYSTEM_DEMO",
      actorRole: "RISK_MAKER",
      action: "DEMO_RESET",
      targetId: demoSessionId,
      rationale: "Khôi phục dữ liệu phiên demo (MẪU MÔ PHỎNG)",
      metadataJson: JSON.stringify({ seededCasesCount }),
    },
  });

  return { sessionId: demoSessionId, seededCasesCount };
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getSessionSnapshot(
  demoSessionId: string,
): Promise<SessionResponse> {
  await ensureSessionSeeded(demoSessionId);
  await releaseExpiredHolds(demoSessionId);

  const [consents, scansCount, holds, cases, indicators, appeals, auditLogs] =
    await Promise.all([
      prisma.userConsent.findMany({ where: { demoSessionId } }),
      prisma.scanSession.count({ where: { demoSessionId } }),
      prisma.heldTransaction.findMany({
        where: { demoSessionId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.investigationCase.findMany({
        where: { demoSessionId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.immunityIndicator.findMany({
        where: { demoSessionId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.appeal.findMany({
        where: { demoSessionId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { demoSessionId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  return {
    sessionId: demoSessionId,
    consents: consents.map(toUserConsentDto),
    scansCount,
    holds: holds.map((h) => ({
      txId: h.txId,
      demoSessionId: h.demoSessionId,
      scanId: h.scanId,
      senderId: h.senderId,
      senderLabel: h.senderLabel,
      recipientAccount: h.recipientAccount,
      recipientBank: h.recipientBank,
      amountVnd: h.amountVnd,
      status: HeldTxStatusSchema.catch("ON_HOLD_24H").parse(h.status),
      neutralMessage: h.neutralMessage,
      holdExpiresAt: h.holdExpiresAt.toISOString(),
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    })),
    cases: cases.map((c) => {
      const parsedGraph = GraphDataSchema.safeParse(
        safeJsonParse(c.graphDataJson, { nodes: [], edges: [] }),
      );
      const parsedMinute0 = c.sanitizedMinute0Json
        ? SanitizedEvidenceSchema.safeParse(safeJsonParse(c.sanitizedMinute0Json, null))
        : null;
      const parsedDebate = c.agentDebateJson
        ? WarRoomDebateSchema.safeParse(safeJsonParse(c.agentDebateJson, null))
        : null;

      return {
        caseId: c.caseId,
        demoSessionId: c.demoSessionId,
        txId: c.txId,
        scenarioCode: c.scenarioCode,
        title: c.title,
        subtitle: c.subtitle,
        status: CaseStatusSchema.catch("OPEN").parse(c.status),
        graphData: parsedGraph.success ? parsedGraph.data : { nodes: [], edges: [] },
        caseContext: safeJsonParse<Record<string, unknown>>(c.caseContextJson, {}),
        sanitizedMinute0: parsedMinute0?.success ? parsedMinute0.data : null,
        agentDebate: parsedDebate?.success ? parsedDebate.data : null,
        totalLatencyMs: c.totalLatencyMs,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    }),
    indicators: indicators.map((i) => ({
      indicatorId: i.indicatorId,
      demoSessionId: i.demoSessionId,
      caseId: i.caseId,
      indicatorType: ImmunityIndicatorTypeSchema.catch("BANK_ACCOUNT").parse(
        i.indicatorType,
      ),
      indicatorValue: i.indicatorValue,
      severity: ImmunitySeveritySchema.catch("SOFT_WARNING").parse(i.severity),
      status: ImmunityStatusSchema.catch("SOFT_WARNING").parse(i.status),
      evidenceSources: safeJsonParse<string[]>(i.evidenceSourcesJson, []),
      makerId: i.makerId,
      checkerId: i.checkerId,
      ttlHours: i.ttlHours,
      expiresAt: i.expiresAt.toISOString(),
      rollbackReason: i.rollbackReason,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    appeals: appeals.map((a) => ({
      appealId: a.appealId,
      demoSessionId: a.demoSessionId,
      indicatorId: a.indicatorId,
      appellantName: a.appellantName,
      appellantNote: a.appellantNote,
      status: AppealStatusSchema.catch("PENDING_HUMAN_REVIEW").parse(a.status),
      reviewerId: a.reviewerId,
      resolutionNote: a.resolutionNote,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    auditLogs: auditLogs.map((l) => ({
      logId: l.logId,
      demoSessionId: l.demoSessionId,
      actorId: l.actorId,
      actorRole: ActorRoleSchema.catch("RISK_MAKER").parse(l.actorRole),
      action: AuditActionSchema.catch("DEMO_RESET").parse(l.action),
      targetId: l.targetId,
      rationale: l.rationale,
      metadata: safeJsonParse<Record<string, unknown> | null>(l.metadataJson, null),
      createdAt: l.createdAt.toISOString(),
    })),
    llmStatus: getLlmStatus(),
  };
}

export * from "./quota";
export * from "./shield";
