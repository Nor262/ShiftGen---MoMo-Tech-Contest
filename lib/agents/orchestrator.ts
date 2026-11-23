import { z } from "zod";
import {
  ComplianceRagOutputSchema,
  DebateSynthesisSchema,
  EvidenceCorrelatorOutputSchema,
  FalsePositiveDefenderOutputSchema,
  GraphDataSchema,
  GraphTracerOutputSchema,
  WarRoomDebateSchema,
  WarRoomSseEventSchema,
  type ComplianceRagOutput,
  type DebateSynthesis,
  type EvidenceCorrelatorOutput,
  type FalsePositiveDefenderOutput,
  type GraphData,
  type GraphTracerOutput,
  type PolicyChunk,
  type SanitizedEvidence,
  type WarRoomAgentKey,
  type WarRoomDebate,
  type WarRoomSseEvent,
} from "@/contracts";
import {
  analyzeCaseGraph,
  GraphCaseContextSchema,
  type GraphAnalysisResult,
} from "@/lib/graph";
import {
  getLLMProvider,
  LLMNotConfiguredError,
  LLMTimeoutError,
  type LLMProvider,
} from "@/lib/llm";
import {
  buildComplianceRagPrompt,
  buildDebateSynthesizerPrompt,
  buildEvidenceCorrelatorPrompt,
  buildFalsePositiveDefenderPrompt,
  buildGraphTracerPrompt,
  type AgentCasePromptInput,
} from "./prompts";
import { retrievePolicyChunks } from "./retriever";

const DEFAULT_AGENT_TIMEOUT_MS = 20_000;

const GraphTracerLlmSchema = z.object({
  flagged_node_ids: z.array(z.string()).default([]),
  smurfing_detected: z.boolean().default(false),
  mule_cluster_detected: z.boolean().default(false),
  key_findings: z.array(z.string()).min(1),
  risk_contribution: z.number().int().min(0).max(100),
});

const EvidenceCorrelatorLlmSchema = z.object({
  minute0_matched: z.boolean().default(false),
  simo_flag_matched: z.boolean().default(false),
  cyber_indicator_matched: z.boolean().default(false),
  independent_sources: z.array(z.string()).default([]),
  key_findings: z.array(z.string()).min(1),
  risk_contribution: z.number().int().min(0).max(100),
});

const ComplianceRagLlmSchema = z.object({
  cited_chunk_ids: z.array(z.string()).optional(),
  cited_chunks: z.array(z.object({ chunk_id: z.string() }).passthrough()).optional(),
  policy_notes_vi: z.array(z.string()).min(1),
  insurance_eligibility_vi: z.string().min(1),
  human_review_required: z.boolean().default(true),
});

const FalsePositiveDefenderLlmSchema = z.object({
  innocence_confidence: z.number().int().min(0).max(100),
  benign_signals: z.array(z.string()).default([]),
  counter_arguments_vi: z.array(z.string()).min(1),
  recommend_dismiss: z.boolean(),
});

export interface InvestigateCaseInput extends AgentCasePromptInput {
  provider?: LLMProvider;
  timeoutMs?: number;
  onEvent?: (event: WarRoomSseEvent) => void;
  beforeComplete?: (output: InvestigateCaseOutput) => Promise<void>;
}

export interface InvestigateCaseOutput {
  debate: WarRoomDebate;
  annotatedGraph: GraphData;
  graphAnalysis: GraphAnalysisResult;
}

export function getWarRoomAgentTimeoutMs(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.round(override);
  }
  const parsed = Number.parseInt(process.env.WARROOM_AGENT_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AGENT_TIMEOUT_MS;
}

function measureElapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim().slice(0, 300);
  }
  return "Agent gặp lỗi không xác định trong quá trình phân tích.";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new LLMTimeoutError(`Agent "${label}" vượt quá giới hạn ${timeoutMs}ms.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function emitEvent(
  onEvent: ((event: WarRoomSseEvent) => void) | undefined,
  event: WarRoomSseEvent,
): void {
  if (!onEvent) return;
  onEvent(WarRoomSseEventSchema.parse(event));
}

/**
 * Pure deterministic computation of independent evidence sources from real case facts.
 * Used as a hard code guardrail after LLM synthesis so LLM can NEVER bypass Layer 2 (>= 2 sources).
 */
export function deriveVerifiedIndependentSources(
  input: Pick<AgentCasePromptInput, "scenarioCode" | "caseContext" | "sanitizedMinute0">,
  graphAnalysis: Pick<GraphAnalysisResult, "smurfing_detected" | "mule_cluster_detected">,
): string[] {
  const sources: string[] = [];
  const rawContextSources = Array.isArray(input.caseContext.independentSources)
    ? input.caseContext.independentSources.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];

  const hasApkContextSource = rawContextSources.some((s) => /APK/i.test(s));
  const hasMinute0ContextSource =
    rawContextSources.some((s) => /^MINUTE_?0/i.test(s)) ||
    Boolean(input.caseContext.minute0Source);
  const hasSuspiciousUrl =
    typeof input.caseContext.suspiciousUrl === "string" &&
    input.caseContext.suspiciousUrl.trim().length > 0;
  const hasMinute0Cyber = Boolean(
    input.sanitizedMinute0 &&
      (input.sanitizedMinute0.scam_category === "APK_MALWARE_BAIT" ||
        input.sanitizedMinute0.cyber_threat_types.length > 0),
  );
  const hasMinute0NonLegit = Boolean(
    input.sanitizedMinute0 &&
      input.sanitizedMinute0.scam_category !== "LEGITIMATE" &&
      input.sanitizedMinute0.risk_score >= 40,
  );

  // Channel 1: Minute-00 B2C evidence counts as at most 1 independent source.
  if (
    hasMinute0Cyber ||
    hasApkContextSource ||
    (input.scenarioCode === "CASE-02" && hasSuspiciousUrl)
  ) {
    sources.push("MINUTE0_B2C_APK_SCREENSHOT");
  } else if (hasMinute0NonLegit || hasMinute0ContextSource) {
    sources.push("MINUTE0_B2C_EVIDENCE");
  }

  // Channel 2: Internal deterministic transaction graph smurfing / mule cluster.
  if (graphAnalysis.smurfing_detected || graphAnalysis.mule_cluster_detected) {
    sources.push("INTERNAL_GRAPH_SMURFING_MULE");
  }

  // Channel 3: Interbank SIMO flag (simulated).
  if (input.caseContext.simoFlagSimulated === true) {
    sources.push("SIMO_INTERBANK_FLAG");
  }

  return Array.from(new Set(sources));
}

export function buildPolicyQueryForCase(
  input: AgentCasePromptInput,
  graphAnalysis: GraphAnalysisResult,
): string {
  const parts: string[] = [input.title, input.subtitle];

  if (typeof input.caseContext.behavioralNoteVi === "string") {
    parts.push(input.caseContext.behavioralNoteVi);
  }
  if (graphAnalysis.smurfing_detected || graphAnalysis.mule_cluster_detected) {
    parts.push("Điều 29 phòng chống rửa tiền chia nhỏ smurfing mule ví trung gian thiết bị Phụ lục 01 ngưỡng sinh trắc học 10 triệu 20 triệu");
  }
  if (input.caseContext.simoFlagSimulated === true) {
    parts.push("SIMO NHNN liên ngân hàng tài khoản nghi vấn");
  }
  if (
    typeof input.caseContext.suspiciousUrl === "string" ||
    input.sanitizedMinute0?.scam_category === "APK_MALWARE_BAIT" ||
    (input.sanitizedMinute0?.cyber_threat_types.length ?? 0) > 0
  ) {
    parts.push("TT 77 apk accessibility mã độc an ninh mạng");
  }
  if (
    typeof input.caseContext.cleanHistoryMonths === "number" &&
    input.caseContext.cleanHistoryMonths >= 6 &&
    input.caseContext.complaintsCount === 0
  ) {
    parts.push("Luật 134 điều 4 con người can thiệp không khóa tự động TT 53 khiếu nại human review");
  }
  if (input.sanitizedMinute0) {
    parts.push(input.sanitizedMinute0.summary_vi, "Luật 91 PII che mờ");
  }

  // Always include baseline governance + MoMo transfer insurance anchors.
  parts.push("báo cáo giao dịch đáng ngờ lưu trữ 5 năm cấm tiết lộ tạm dừng giao dịch TT 40");
  return parts.filter(Boolean).join(" ");
}

function safeParseCaseContext(raw: Record<string, unknown>) {
  const parsed = GraphCaseContextSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Strip malformed transactions array if present so deterministic graph analysis still runs.
  const withoutTxs = { ...raw };
  delete withoutTxs.transactions;
  const fallback = GraphCaseContextSchema.safeParse(withoutTxs);
  return fallback.success ? fallback.data : {};
}

function enforceSynthesisGuardrail(
  rawSynthesis: DebateSynthesis,
  verifiedSources: string[],
): DebateSynthesis {
  const eligible = verifiedSources.length >= 2;
  let eligibilityReason = rawSynthesis.eligibility_reason_vi.trim();

  if (!eligible) {
    const guardrailSuffix =
      verifiedSources.length === 1
        ? "Quy tắc Lớp 2 (bắt buộc bằng mã nguồn): Hiện chỉ có 1 nguồn bằng chứng độc lập nên CHƯA đủ điều kiện ACTIVE Immunity (yêu cầu ≥ 2 nguồn); chỉ phù hợp Cảnh báo mềm 72h (SOFT_WARNING)."
        : "Quy tắc Lớp 2 (bắt buộc bằng mã nguồn): Hiện có 0 nguồn bằng chứng gian lận độc lập nên KHÔNG đủ điều kiện đưa vào Kho Miễn dịch.";
    if (
      rawSynthesis.eligible_for_active_immunity ||
      !/chưa đủ|không đủ|soft_warning|0 nguồn|1 nguồn/i.test(eligibilityReason)
    ) {
      eligibilityReason = guardrailSuffix;
    }
  }

  return DebateSynthesisSchema.parse({
    ...rawSynthesis,
    independent_sources: verifiedSources,
    eligible_for_active_immunity: eligible,
    eligibility_reason_vi: eligibilityReason,
  });
}

export async function runWarRoomInvestigation(
  input: InvestigateCaseInput,
): Promise<InvestigateCaseOutput> {
  const totalStartedAt = performance.now();
  const provider = input.provider ?? getLLMProvider();
  const timeoutMs = getWarRoomAgentTimeoutMs(input.timeoutMs);

  if (!provider.isConfigured()) {
    throw new LLMNotConfiguredError();
  }

  const parsedGraph = GraphDataSchema.parse(input.graphData);
  const safeContext = safeParseCaseContext(input.caseContext);
  const graphAnalysis = analyzeCaseGraph({
    graphData: parsedGraph,
    caseContext: safeContext,
  });
  const verifiedSources = deriveVerifiedIndependentSources(input, graphAnalysis);
  const retrievedChunks = retrievePolicyChunks(
    buildPolicyQueryForCase(input, graphAnalysis),
    5,
  );
  const retrievedById = new Map<string, PolicyChunk>(
    retrievedChunks.map((chunk) => [chunk.chunk_id, chunk]),
  );

  const usedModels = new Set<string>();
  const agentKeys: WarRoomAgentKey[] = [
    "graph_tracer",
    "evidence_correlator",
    "compliance_rag",
    "false_positive_defender",
  ];
  for (const agent of agentKeys) {
    emitEvent(input.onEvent, {
      event: "agent_started",
      agent,
      timestamp: new Date().toISOString(),
    });
  }

  // Agent 1: Graph & Smurfing Tracer (deterministic graph truth + LLM explanation)
  const runGraphTracer = async (): Promise<GraphTracerOutput> => {
    const startedAt = performance.now();
    try {
      const prompt = buildGraphTracerPrompt(input, graphAnalysis);
      const res = await withTimeout(
        provider.generateJSON(GraphTracerLlmSchema, { ...prompt, timeoutMs }),
        timeoutMs,
        "graph_tracer",
      );
      usedModels.add(res.modelUsed);

      const output = GraphTracerOutputSchema.parse({
        status: "OK",
        latency_ms: measureElapsedMs(startedAt),
        // Deterministic overrides: LLM can never hallucinate node IDs or flip smurfing/mule math.
        flagged_node_ids: graphAnalysis.flagged_node_ids,
        smurfing_detected: graphAnalysis.smurfing_detected,
        mule_cluster_detected: graphAnalysis.mule_cluster_detected,
        key_findings:
          res.data.key_findings.length > 0
            ? res.data.key_findings
            : graphAnalysis.key_findings_vi,
        risk_contribution: res.data.risk_contribution,
      });

      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "graph_tracer",
        status: output.status,
        latency_ms: output.latency_ms,
        output,
      });
      return output;
    } catch (err) {
      const degraded = GraphTracerOutputSchema.parse({
        status: "AGENT_DEGRADED",
        latency_ms: measureElapsedMs(startedAt),
        flagged_node_ids: [],
        smurfing_detected: false,
        mule_cluster_detected: false,
        key_findings: [],
        risk_contribution: 0,
        error_message: formatErrorMessage(err),
      });
      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "graph_tracer",
        status: degraded.status,
        latency_ms: degraded.latency_ms,
        output: degraded,
      });
      return degraded;
    }
  };

  // Agent 2: Pre-App Evidence Correlator
  const runEvidenceCorrelator = async (): Promise<EvidenceCorrelatorOutput> => {
    const startedAt = performance.now();
    try {
      const prompt = buildEvidenceCorrelatorPrompt(input, graphAnalysis, verifiedSources);
      const res = await withTimeout(
        provider.generateJSON(EvidenceCorrelatorLlmSchema, { ...prompt, timeoutMs }),
        timeoutMs,
        "evidence_correlator",
      );
      usedModels.add(res.modelUsed);

      const hasMinute0 =
        Boolean(input.sanitizedMinute0 && input.sanitizedMinute0.scam_category !== "LEGITIMATE") ||
        verifiedSources.some((s) => s.startsWith("MINUTE0_"));
      const hasSimo = input.caseContext.simoFlagSimulated === true;
      const hasCyber =
        verifiedSources.includes("MINUTE0_B2C_APK_SCREENSHOT") ||
        Boolean(input.caseContext.suspiciousUrl) ||
        Boolean(input.sanitizedMinute0?.cyber_threat_types.length);

      const output = EvidenceCorrelatorOutputSchema.parse({
        status: "OK",
        latency_ms: measureElapsedMs(startedAt),
        minute0_matched: hasMinute0,
        simo_flag_matched: hasSimo,
        cyber_indicator_matched: hasCyber,
        independent_sources: verifiedSources,
        key_findings: res.data.key_findings,
        risk_contribution: res.data.risk_contribution,
      });

      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "evidence_correlator",
        status: output.status,
        latency_ms: output.latency_ms,
        output,
      });
      return output;
    } catch (err) {
      const degraded = EvidenceCorrelatorOutputSchema.parse({
        status: "AGENT_DEGRADED",
        latency_ms: measureElapsedMs(startedAt),
        minute0_matched: false,
        simo_flag_matched: false,
        cyber_indicator_matched: false,
        independent_sources: [],
        key_findings: [],
        risk_contribution: 0,
        error_message: formatErrorMessage(err),
      });
      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "evidence_correlator",
        status: degraded.status,
        latency_ms: degraded.latency_ms,
        output: degraded,
      });
      return degraded;
    }
  };

  // Agent 3: Compliance & Policy RAG (strictly grounded in retrieved vnPolicies.json chunks)
  const runComplianceRag = async (): Promise<ComplianceRagOutput> => {
    const startedAt = performance.now();
    try {
      const prompt = buildComplianceRagPrompt(input, graphAnalysis, retrievedChunks);
      const res = await withTimeout(
        provider.generateJSON(ComplianceRagLlmSchema, { ...prompt, timeoutMs }),
        timeoutMs,
        "compliance_rag",
      );
      usedModels.add(res.modelUsed);

      const requestedIds = [
        ...(res.data.cited_chunk_ids ?? []),
        ...(res.data.cited_chunks?.map((c) => c.chunk_id) ?? []),
      ];
      const citedChunks: PolicyChunk[] = [];
      const seenIds = new Set<string>();
      for (const rawId of requestedIds) {
        const cleanId = rawId.trim();
        const verifiedChunk = retrievedById.get(cleanId);
        if (verifiedChunk && !seenIds.has(cleanId)) {
          seenIds.add(cleanId);
          citedChunks.push(verifiedChunk);
        }
      }

      const output = ComplianceRagOutputSchema.parse({
        status: "OK",
        latency_ms: measureElapsedMs(startedAt),
        cited_chunks: citedChunks,
        policy_notes_vi: res.data.policy_notes_vi,
        insurance_eligibility_vi: res.data.insurance_eligibility_vi,
        human_review_required: res.data.human_review_required,
      });

      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "compliance_rag",
        status: output.status,
        latency_ms: output.latency_ms,
        output,
      });
      return output;
    } catch (err) {
      const degraded = ComplianceRagOutputSchema.parse({
        status: "AGENT_DEGRADED",
        latency_ms: measureElapsedMs(startedAt),
        cited_chunks: [],
        policy_notes_vi: [],
        insurance_eligibility_vi: "",
        human_review_required: true,
        error_message: formatErrorMessage(err),
      });
      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "compliance_rag",
        status: degraded.status,
        latency_ms: degraded.latency_ms,
        output: degraded,
      });
      return degraded;
    }
  };

  // Agent 4: False-Positive Defender ("Luật sư Biện hộ Giao dịch Hợp pháp")
  const runFalsePositiveDefender = async (): Promise<FalsePositiveDefenderOutput> => {
    const startedAt = performance.now();
    try {
      const prompt = buildFalsePositiveDefenderPrompt(input, graphAnalysis);
      const res = await withTimeout(
        provider.generateJSON(FalsePositiveDefenderLlmSchema, { ...prompt, timeoutMs }),
        timeoutMs,
        "false_positive_defender",
      );
      usedModels.add(res.modelUsed);

      const output = FalsePositiveDefenderOutputSchema.parse({
        status: "OK",
        latency_ms: measureElapsedMs(startedAt),
        innocence_confidence: res.data.innocence_confidence,
        benign_signals: res.data.benign_signals,
        counter_arguments_vi: res.data.counter_arguments_vi,
        recommend_dismiss: res.data.recommend_dismiss,
      });

      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "false_positive_defender",
        status: output.status,
        latency_ms: output.latency_ms,
        output,
      });
      return output;
    } catch (err) {
      const degraded = FalsePositiveDefenderOutputSchema.parse({
        status: "AGENT_DEGRADED",
        latency_ms: measureElapsedMs(startedAt),
        innocence_confidence: 0,
        benign_signals: [],
        counter_arguments_vi: [],
        recommend_dismiss: false,
        error_message: formatErrorMessage(err),
      });
      emitEvent(input.onEvent, {
        event: "agent_completed",
        agent: "false_positive_defender",
        status: degraded.status,
        latency_ms: degraded.latency_ms,
        output: degraded,
      });
      return degraded;
    }
  };

  const settled = await Promise.allSettled([
    runGraphTracer(),
    runEvidenceCorrelator(),
    runComplianceRag(),
    runFalsePositiveDefender(),
  ]);

  const unwrapSettled = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
    result.status === "fulfilled" ? result.value : fallback;

  const agents = {
    graph_tracer: unwrapSettled(settled[0], {
      status: "AGENT_DEGRADED",
      latency_ms: 0,
      flagged_node_ids: [],
      smurfing_detected: false,
      mule_cluster_detected: false,
      key_findings: [],
      risk_contribution: 0,
      error_message: "Agent bị gián đoạn bất ngờ.",
    }),
    evidence_correlator: unwrapSettled(settled[1], {
      status: "AGENT_DEGRADED",
      latency_ms: 0,
      minute0_matched: false,
      simo_flag_matched: false,
      cyber_indicator_matched: false,
      independent_sources: [],
      key_findings: [],
      risk_contribution: 0,
      error_message: "Agent bị gián đoạn bất ngờ.",
    }),
    compliance_rag: unwrapSettled(settled[2], {
      status: "AGENT_DEGRADED",
      latency_ms: 0,
      cited_chunks: [],
      policy_notes_vi: [],
      insurance_eligibility_vi: "",
      human_review_required: true,
      error_message: "Agent bị gián đoạn bất ngờ.",
    }),
    false_positive_defender: unwrapSettled(settled[3], {
      status: "AGENT_DEGRADED",
      latency_ms: 0,
      innocence_confidence: 0,
      benign_signals: [],
      counter_arguments_vi: [],
      recommend_dismiss: false,
      error_message: "Agent bị gián đoạn bất ngờ.",
    }),
  };

  // Step 5: DebateSynthesizer + Hard Deterministic Layer-2 Guardrail (>= 2 independent sources)
  emitEvent(input.onEvent, {
    event: "synthesis_started",
    timestamp: new Date().toISOString(),
  });

  const synthPrompt = buildDebateSynthesizerPrompt(input, agents, verifiedSources);
  const synthRes = await withTimeout(
    provider.generateJSON(DebateSynthesisSchema, { ...synthPrompt, timeoutMs }),
    timeoutMs,
    "debate_synthesizer",
  );
  usedModels.add(synthRes.modelUsed);

  const synthesis = enforceSynthesisGuardrail(synthRes.data, verifiedSources);
  const totalLatencyMs = measureElapsedMs(totalStartedAt);
  const modelUsed = Array.from(usedModels)[0] ?? provider.reasoningModel;

  const debate = WarRoomDebateSchema.parse({
    agents,
    synthesis,
    retrieved_chunks: retrievedChunks,
    total_latency_ms: totalLatencyMs,
    model_used: modelUsed,
  });

  const output: InvestigateCaseOutput = {
    debate,
    annotatedGraph: graphAnalysis.annotatedGraph,
    graphAnalysis,
  };

  if (input.beforeComplete) {
    await input.beforeComplete(output);
  }

  emitEvent(input.onEvent, {
    event: "completed",
    debate,
  });

  return output;
}
