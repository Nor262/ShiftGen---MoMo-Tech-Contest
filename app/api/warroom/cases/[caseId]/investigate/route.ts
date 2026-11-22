import { NextResponse } from "next/server";
import {
  InvestigateCaseRequestSchema,
  InvestigateCaseResponseSchema,
  WarRoomSseEventSchema,
  type WarRoomSseEvent,
} from "@/contracts";
import { runWarRoomInvestigation, type InvestigateCaseOutput } from "@/lib/agents";
import {
  getLLMProvider,
  LLMNotConfiguredError,
  LLMTimeoutError,
} from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { checkDbRateLimit, extractClientIp } from "@/lib/rate-limit";
import {
  consumeDailyLlmQuota,
  ensureSessionSeeded,
  getSessionId,
  toInvestigationCaseDto,
} from "@/lib/session";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

function wantsSseStream(request: Request): boolean {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("stream") === "1") return true;
  } catch {
    // Fall through to Accept header check.
  }
  const accept = (request.headers.get("accept") ?? "").toLowerCase();
  return accept.includes("text/event-stream");
}

async function persistInvestigationResult(params: {
  demoSessionId: string;
  caseId: string;
  scenarioCode: string;
  actorId: string;
  actorRole: "USER_B2C" | "FAMILY_GUARDIAN" | "RISK_MAKER" | "RISK_CHECKER";
  output: InvestigateCaseOutput;
}): Promise<void> {
  const { demoSessionId, caseId, scenarioCode, actorId, actorRole, output } = params;
  const totalLatencyMs = Math.max(0, Math.round(output.debate.total_latency_ms));

  await prisma.$transaction([
    prisma.investigationCase.update({
      where: { caseId },
      data: {
        status: "PENDING_DECISION",
        agentDebateJson: JSON.stringify(output.debate),
        totalLatencyMs,
        graphDataJson: JSON.stringify(output.annotatedGraph),
      },
    }),
    prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId,
        actorRole,
        action: "INVESTIGATION_RUN",
        targetId: caseId,
        rationale: `Hoàn tất điều tra 4 Agent (${scenarioCode}): khuyến nghị ${output.debate.synthesis.recommendation}, ${output.debate.synthesis.independent_sources.length} nguồn độc lập, độ trễ thực ${totalLatencyMs}ms (${output.debate.model_used}).`,
        metadataJson: JSON.stringify({
          scenarioCode,
          recommendation: output.debate.synthesis.recommendation,
          eligibleForActiveImmunity: output.debate.synthesis.eligible_for_active_immunity,
          independentSources: output.debate.synthesis.independent_sources,
          agentStatuses: {
            graph_tracer: output.debate.agents.graph_tracer.status,
            evidence_correlator: output.debate.agents.evidence_correlator.status,
            compliance_rag: output.debate.agents.compliance_rag.status,
            false_positive_defender: output.debate.agents.false_positive_defender.status,
          },
          totalLatencyMs,
          modelUsed: output.debate.model_used,
        }),
      },
    }),
  ]);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const rawBody = await request.text();
    let parsedJson: unknown = {};
    if (rawBody.trim()) {
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "Dữ liệu JSON không hợp lệ.", code: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }
    }

    const parsedReq = InvestigateCaseRequestSchema.safeParse(parsedJson);
    if (!parsedReq.success) {
      return NextResponse.json(
        {
          error: "Yêu cầu điều tra hồ sơ không hợp lệ.",
          code: "VALIDATION_ERROR",
          details: parsedReq.error.flatten(),
        },
        { status: 400 },
      );
    }

    const demoSessionId = getSessionId(request);
    const clientIp = extractClientIp(request);

    const rateLimit = await checkDbRateLimit(clientIp, demoSessionId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Bạn đã gửi quá nhiều yêu cầu điều tra trong thời gian ngắn. Vui lòng thử lại sau.",
          code: "RATE_LIMIT_EXCEEDED",
          details: { retryAfterSec: rateLimit.retryAfterSec },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec) },
        },
      );
    }

    await ensureSessionSeeded(demoSessionId);

    const caseRow = await prisma.investigationCase.findFirst({
      where: { caseId, demoSessionId },
    });
    if (!caseRow) {
      return NextResponse.json(
        {
          error: "Không tìm thấy hồ sơ điều tra trong phiên hiện tại.",
          code: "CASE_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const provider = getLLMProvider();
    if (!provider.isConfigured()) {
      const notConfigured = new LLMNotConfiguredError();
      return NextResponse.json(
        { error: notConfigured.message, code: notConfigured.code },
        { status: notConfigured.statusCode },
      );
    }

    const quota = await consumeDailyLlmQuota();
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error:
            "Đã đạt hạn mức lượt gọi AI trong ngày của bản demo. Hệ thống luôn trung thực và không tự bịa kết quả phân tích 4 Agent.",
          code: "DAILY_LLM_QUOTA_EXCEEDED",
          details: {
            dateKey: quota.dateKey,
            used: quota.used,
            limit: quota.limit,
          },
        },
        { status: 429 },
      );
    }

    const caseDto = toInvestigationCaseDto(caseRow);
    const { actorId, actorRole } = parsedReq.data;
    const streamRequested = wantsSseStream(request);

    if (streamRequested) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const pushEvent = (evt: WarRoomSseEvent) => {
            const validated = WarRoomSseEventSchema.parse(evt);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(validated)}\n\n`),
            );
          };

          try {
            await runWarRoomInvestigation({
              caseId: caseDto.caseId,
              scenarioCode: caseDto.scenarioCode,
              title: caseDto.title,
              subtitle: caseDto.subtitle,
              graphData: caseDto.graphData,
              caseContext: caseDto.caseContext,
              sanitizedMinute0: caseDto.sanitizedMinute0,
              provider,
              onEvent: pushEvent,
              beforeComplete: async (output) => {
                await persistInvestigationResult({
                  demoSessionId,
                  caseId: caseDto.caseId,
                  scenarioCode: caseDto.scenarioCode,
                  actorId,
                  actorRole,
                  output,
                });
              },
            });
          } catch (err) {
            if (err instanceof LLMNotConfiguredError) {
              pushEvent({
                event: "error",
                code: err.code,
                message: err.message,
              });
            } else if (err instanceof LLMTimeoutError) {
              pushEvent({
                event: "error",
                code: err.code,
                message: err.message,
              });
            } else {
              console.error("[POST /api/warroom/cases/[caseId]/investigate SSE]", err);
              pushEvent({
                event: "error",
                code: "INVESTIGATION_FAILED",
                message:
                  err instanceof Error && err.message
                    ? err.message
                    : "Không thể hoàn tất phiên điều tra 4 Agent.",
              });
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const output = await runWarRoomInvestigation({
      caseId: caseDto.caseId,
      scenarioCode: caseDto.scenarioCode,
      title: caseDto.title,
      subtitle: caseDto.subtitle,
      graphData: caseDto.graphData,
      caseContext: caseDto.caseContext,
      sanitizedMinute0: caseDto.sanitizedMinute0,
      provider,
      beforeComplete: async (res) => {
        await persistInvestigationResult({
          demoSessionId,
          caseId: caseDto.caseId,
          scenarioCode: caseDto.scenarioCode,
          actorId,
          actorRole,
          output: res,
        });
      },
    });

    const responsePayload = InvestigateCaseResponseSchema.parse({
      caseId: caseDto.caseId,
      status: "PENDING_DECISION",
      debate: output.debate,
    });

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err) {
    if (err instanceof LLMNotConfiguredError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    if (err instanceof LLMTimeoutError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    console.error("[POST /api/warroom/cases/[caseId]/investigate]", err);
    return NextResponse.json(
      {
        error: "Không thể hoàn tất phiên điều tra 4 Agent lúc này.",
        code: "INVESTIGATION_FAILED",
      },
      { status: 502 },
    );
  }
}
