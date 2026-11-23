"use client";

import { isReplayModel } from "@/lib/replay-label";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CAST, castName, modelDisplayName } from "@/lib/cast";
import { addWorkingDays, ESCALATION_DECISION_WORKING_DAYS } from "@/lib/working-days";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  FileText,
  History,
  Play,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import {
  DEMO_SIMULATION_LABEL,
  InvestigateCaseResponseSchema,
  WarRoomCasesResponseSchema,
  WarRoomSseEventSchema,
  type AuditLogDto,
  type InvestigationCaseDto,
  type LlmStatus,
  type SessionResponse,
  type WarRoomDebate,
} from "@/contracts";
import {
  AgentCardsGrid,
  createIdleAgentsState,
  type WarRoomAgentsState,
} from "./AgentCardsGrid";
import { DebateAndDecisionPanel } from "./DebateAndDecisionPanel";
import { MoneyFlowGraph } from "./MoneyFlowGraph";
import {
  CASE_STATUS_META,
  CYBER_THREAT_VI,
  PSYCH_CUE_VI,
  SCAM_CATEGORY_VI,
  formatDateTimeVi,
  parseWarRoomApiError,
} from "./labels";

function agentsStateFromDebate(debate: WarRoomDebate): WarRoomAgentsState {
  return {
    graph_tracer: { phase: "DONE", output: debate.agents.graph_tracer },
    evidence_correlator: { phase: "DONE", output: debate.agents.evidence_correlator },
    compliance_rag: { phase: "DONE", output: debate.agents.compliance_rag },
    false_positive_defender: {
      phase: "DONE",
      output: debate.agents.false_positive_defender,
    },
  };
}

function resetRunningAgentsToIdle(prev: WarRoomAgentsState): WarRoomAgentsState {
  return {
    graph_tracer:
      prev.graph_tracer.phase === "RUNNING"
        ? { phase: "IDLE", output: null }
        : prev.graph_tracer,
    evidence_correlator:
      prev.evidence_correlator.phase === "RUNNING"
        ? { phase: "IDLE", output: null }
        : prev.evidence_correlator,
    compliance_rag:
      prev.compliance_rag.phase === "RUNNING"
        ? { phase: "IDLE", output: null }
        : prev.compliance_rag,
    false_positive_defender:
      prev.false_positive_defender.phase === "RUNNING"
        ? { phase: "IDLE", output: null }
        : prev.false_positive_defender,
  };
}

export function WarRoomWorkspace() {
  const [cases, setCases] = useState<InvestigationCaseDto[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("default");
  const [auditLogs, setAuditLogs] = useState<AuditLogDto[]>([]);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [investigatingCaseId, setInvestigatingCaseId] = useState<string | null>(null);
  const [agentsState, setAgentsState] = useState<WarRoomAgentsState>(() =>
    createIdleAgentsState(),
  );
  const [synthesizing, setSynthesizing] = useState(false);
  const [liveDebate, setLiveDebate] = useState<WarRoomDebate | null>(null);
  const [investigateError, setInvestigateError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [auditExpanded, setAuditExpanded] = useState(true);

  const timerStartRef = useRef<number | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    setLoadError(null);
    try {
      const [casesRes, sessionRes] = await Promise.all([
        fetch("/api/warroom/cases", { cache: "no-store" }),
        fetch("/api/session", { cache: "no-store" }),
      ]);

      let sessionCases: InvestigationCaseDto[] = [];
      if (sessionRes.ok) {
        const sessionData = (await sessionRes.json()) as SessionResponse;
        setSessionId(sessionData.sessionId);
        setAuditLogs(sessionData.auditLogs);
        setLlmStatus(sessionData.llmStatus);
        sessionCases = sessionData.cases;
      }

      let loadedCases: InvestigationCaseDto[] = [];
      if (casesRes.ok) {
        const rawCases = (await casesRes.json()) as unknown;
        const parsed = WarRoomCasesResponseSchema.safeParse(rawCases);
        if (parsed.success) {
          loadedCases = parsed.data.cases;
        } else if (
          rawCases &&
          typeof rawCases === "object" &&
          Array.isArray((rawCases as { cases?: unknown }).cases)
        ) {
          loadedCases = (rawCases as { cases: InvestigationCaseDto[] }).cases;
        }
      } else if (casesRes.status === 404 && sessionCases.length > 0) {
        // Fallback to /api/session cases until /api/warroom/cases route is active
        loadedCases = sessionCases;
      } else if (!casesRes.ok) {
        const errBody = (await casesRes.json().catch(() => null)) as unknown;
        if (sessionCases.length > 0) {
          loadedCases = sessionCases;
        } else {
          setLoadError(parseWarRoomApiError(casesRes.status, errBody));
        }
      }

      setCases(loadedCases);
      setSelectedCaseId((prev) => {
        if (prev && loadedCases.some((c) => c.caseId === prev)) return prev;
        const escalated = loadedCases
          .filter((c) => typeof c.caseContext.escalatedAt === "string")
          .sort((a, b) => String(b.caseContext.escalatedAt).localeCompare(String(a.caseContext.escalatedAt)));
        return (escalated[0] ?? loadedCases[0])?.caseId ?? null;
      });
    } catch {
      setLoadError("Không thể tải hàng đợi hồ sơ FinCrime War-Room.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.caseId === selectedCaseId) ?? null,
    [cases, selectedCaseId],
  );

  // Reset transient investigation state only when switching cases (never on investigatingCaseId -> null)
  useEffect(() => {
    setInvestigateError(null);
    setSynthesizing(false);
    setLiveDebate(null);

    const current = cases.find((c) => c.caseId === selectedCaseId);
    if (current?.agentDebate) {
      setAgentsState(agentsStateFromDebate(current.agentDebate));
    } else {
      setAgentsState(createIdleAgentsState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCaseId]);

  // Live running stopwatch while agents execute
  useEffect(() => {
    if (!investigatingCaseId) return;
    timerStartRef.current = performance.now();
    setElapsedMs(0);

    const interval = window.setInterval(() => {
      if (timerStartRef.current !== null) {
        setElapsedMs(Math.round(performance.now() - timerStartRef.current));
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [investigatingCaseId]);

  const activeDebate = liveDebate ?? selectedCase?.agentDebate ?? null;

  const activeAgentsState = useMemo(() => {
    if (investigatingCaseId) return agentsState;
    if (activeDebate) return agentsStateFromDebate(activeDebate);
    return agentsState;
  }, [activeDebate, agentsState, investigatingCaseId]);

  const flaggedNodeIds = useMemo(() => {
    const gt = activeAgentsState.graph_tracer.output ?? activeDebate?.agents.graph_tracer;
    if (gt && gt.status === "OK") return gt.flagged_node_ids;
    return undefined;
  }, [activeAgentsState.graph_tracer.output, activeDebate]);

  async function handleInvestigate() {
    if (!selectedCase || investigatingCaseId) return;

    const targetCaseId = selectedCase.caseId;
    setInvestigateError(null);
    setLiveDebate(null);
    setSynthesizing(false);
    setInvestigatingCaseId(targetCaseId);
    setAgentsState({
      graph_tracer: { phase: "RUNNING", output: null },
      evidence_correlator: { phase: "RUNNING", output: null },
      compliance_rag: { phase: "RUNNING", output: null },
      false_positive_defender: { phase: "RUNNING", output: null },
    });

    try {
      const res = await fetch(
        `/api/warroom/cases/${encodeURIComponent(targetCaseId)}/investigate?stream=1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            actorId: "RISK_MAKER_HUYEN",
            actorRole: "RISK_MAKER",
          }),
        },
      );

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as unknown;
        setInvestigateError(parseWarRoomApiError(res.status, errBody));
        setAgentsState(createIdleAgentsState());
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const processLine = (rawLine: string) => {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) return;
          const jsonText = line.slice(5).trim();
          if (!jsonText || jsonText === "[DONE]") return;

          let parsedJson: unknown;
          try {
            parsedJson = JSON.parse(jsonText);
          } catch {
            return;
          }

          const evt = WarRoomSseEventSchema.safeParse(parsedJson);
          if (!evt.success) return;

          const event = evt.data;
          switch (event.event) {
            case "agent_started":
              setAgentsState((prev) => ({
                ...prev,
                [event.agent]: { phase: "RUNNING", output: null },
              }));
              break;
            case "agent_completed":
              setAgentsState((prev) => ({
                ...prev,
                [event.agent]: { phase: "DONE", output: event.output },
              }));
              break;
            case "synthesis_started":
              setSynthesizing(true);
              break;
            case "completed":
              setSynthesizing(false);
              setLiveDebate(event.debate);
              setAgentsState(agentsStateFromDebate(event.debate));
              break;
            case "error":
              setSynthesizing(false);
              setAgentsState(resetRunningAgentsToIdle);
              setInvestigateError(
                event.code === "LLM_NOT_CONFIGURED"
                  ? parseWarRoomApiError(503, event)
                  : event.message,
              );
              break;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            processLine(line);
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) {
          for (const line of buffer.split(/\r?\n/)) {
            processLine(line);
          }
        }
      } else {
        const rawJson = (await res.json()) as unknown;
        const parsed = InvestigateCaseResponseSchema.safeParse(rawJson);
        if (!parsed.success) {
          setInvestigateError("Phản hồi từ API điều tra không đúng định dạng hợp đồng.");
          setAgentsState(createIdleAgentsState());
          return;
        }
        setLiveDebate(parsed.data.debate);
        setAgentsState(agentsStateFromDebate(parsed.data.debate));
      }

      await loadWorkspaceData();
    } catch {
      setInvestigateError("Lỗi kết nối trong quá trình điều tra 4 Agent. Vui lòng thử lại.");
      setAgentsState(createIdleAgentsState());
    } finally {
      setSynthesizing(false);
      setInvestigatingCaseId(null);
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-xl sm:p-6">
      {/* Command Center Top Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-200">
              {DEMO_SIMULATION_LABEL}
            </span>
            <span className="rounded-full border border-momo-400/50 bg-momo-500/20 px-2.5 py-0.5 text-xs font-semibold text-momo-200">
              {CAST.RISK_MAKER_HUYEN.name} · {CAST.RISK_MAKER_HUYEN.role}<span className="tech-only"> (RISK_MAKER)</span>
            </span>
            <span className="tech-only rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs text-slate-300">
              Session: {sessionId}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            B2E FinCrime War-Room — Điều phối 4 Agent &amp; Phản biện
          </h1>
          <p className="text-xs text-slate-300">
            Phân tích đồ thị dòng tiền, đối chiếu Phút 00, trích dẫn pháp lý Việt Nam, phản biện
            chống chặn oan và Thẻ Bàn giao CSKH Thấu cảm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {llmStatus && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                llmStatus.configured
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-200"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {llmStatus.configured
                  ? `${llmStatus.backend.toUpperCase()} · ${llmStatus.reasoning_model}`
                  : "LLM chưa cấu hình API Key"}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadWorkspaceData()}
            disabled={Boolean(investigatingCaseId)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-400 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Làm mới hàng đợi</span>
          </button>
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/50 bg-red-950/60 p-3 text-xs text-red-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Main Split: Left Queue Sidebar + Right Investigation Workspace */}
      <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
        {/* Left Queue Sidebar */}
        <aside aria-label="Hàng đợi hồ sơ điều tra" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Hàng đợi Hồ sơ ({cases.length})
            </h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-900/70"
                />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-400">
              Chưa có hồ sơ điều tra nào trong phiên này.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {cases.map((item) => {
                const isSelected = item.caseId === selectedCase?.caseId;
                const statusMeta = CASE_STATUS_META[item.status];
                return (
                  <li key={item.caseId}>
                    <button
                      type="button"
                      disabled={Boolean(investigatingCaseId) && !isSelected}
                      onClick={() => setSelectedCaseId(item.caseId)}
                      className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-400 disabled:opacity-60 ${
                        isSelected
                          ? "border-momo-500 bg-slate-900 shadow-[0_0_16px_rgba(216,45,139,0.22)]"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-mono text-xs font-bold text-momo-300">
                          {item.scenarioCode}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.labelVi}
                        </span>
                      </div>

                      <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-snug text-white">
                        {item.title}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {item.sanitizedMinute0 && (
                          <span className="inline-flex items-center gap-1 rounded border border-sky-500/40 bg-sky-500/15 px-1.5 py-0.5 text-xs font-semibold text-sky-200">
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                            Có Phút 00 (Đã ẩn PII)
                          </span>
                        )}
                        {item.agentDebate && (
                          <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                            {Math.round(item.agentDebate.total_latency_ms)} ms
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Main Investigation Pane */}
        <div className="min-w-0 space-y-5">
          {selectedCase ? (
            <>
              {/* Case Header + Action Bar */}
              <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/90 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-momo-500/50 bg-momo-500/20 px-2 py-0.5 font-mono text-xs font-bold text-momo-200">
                        {selectedCase.scenarioCode}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          CASE_STATUS_META[selectedCase.status].badgeClass
                        }`}
                      >
                        {CASE_STATUS_META[selectedCase.status].labelVi}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">{selectedCase.title}</h2>
                    <p className="text-xs text-slate-300">{selectedCase.subtitle}</p>
                    <EscalationDeadline
                      escalatedAt={selectedCase.caseContext.escalatedAt}
                      decided={selectedCase.status === "DISMISSED_FP" || selectedCase.status === "CLOSED"}
                    />
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <button
                      type="button"
                      disabled={Boolean(investigatingCaseId)}
                      onClick={() => void handleInvestigate()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-momo-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-momo-900/40 transition hover:bg-momo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                      <span>
                        {investigatingCaseId
                          ? "Đang điều tra 4 Agent..."
                          : "Chạy Điều tra 4 Agent"}
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center justify-end gap-3 font-mono text-xs text-slate-300">
                      {investigatingCaseId ? (
                        <span className="inline-flex items-center gap-1 text-momo-200">
                          <Clock className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Đang đo: {elapsedMs} ms
                        </span>
                      ) : activeDebate ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {isReplayModel(activeDebate.model_used)
                              ? "Thời gian của lần chạy thật đã ghi"
                              : "Tổng thời gian thực"}
                            : {Math.round(activeDebate.total_latency_ms)} ms
                          </span>
                          <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-xs text-slate-300">
                            Model: {modelDisplayName(activeDebate.model_used)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">Chưa có phiên chạy điều tra</span>
                      )}
                    </div>
                  </div>
                </div>

                {investigateError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-500/50 bg-red-950/60 px-3.5 py-2.5 text-xs text-red-100"
                  >
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-300"
                      aria-hidden="true"
                    />
                    <span>{investigateError}</span>
                  </div>
                )}

                {/* Sanitized Minute-00 Evidence Viewer */}
                {selectedCase.sanitizedMinute0 ? (
                  <div className="space-y-2.5 rounded-xl border border-sky-500/35 bg-slate-950/80 p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-bold text-sky-200">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        Bằng chứng Phút 00 đã lọc PII (Sanitized Evidence)
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                        <ShieldOff className="h-3 w-3" aria-hidden="true" />
                        contains_raw_image: {String(selectedCase.sanitizedMinute0.contains_raw_image)} (Không chuyển ảnh gốc)
                      </span>
                    </div>

                    <p className="leading-relaxed text-slate-200">
                      {selectedCase.sanitizedMinute0.summary_vi}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-200">
                        Phân loại:{" "}
                        <strong>
                          {SCAM_CATEGORY_VI[selectedCase.sanitizedMinute0.scam_category]}
                        </strong>
                      </span>
                      <span className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 font-mono text-red-200">
                        Risk Score: {selectedCase.sanitizedMinute0.risk_score}/100 (
                        {selectedCase.sanitizedMinute0.risk_level})
                      </span>
                      {selectedCase.sanitizedMinute0.recipient_account && (
                        <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-slate-200">
                          TK nhận: {selectedCase.sanitizedMinute0.recipient_account}
                          {selectedCase.sanitizedMinute0.recipient_bank
                            ? ` (${selectedCase.sanitizedMinute0.recipient_bank})`
                            : ""}
                        </span>
                      )}
                      {selectedCase.sanitizedMinute0.suspicious_urls.map((url) => (
                        <span
                          key={url}
                          className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-amber-200"
                        >
                          URL: {url}
                        </span>
                      ))}
                    </div>

                    {(selectedCase.sanitizedMinute0.psych_cue_types.length > 0 ||
                      selectedCase.sanitizedMinute0.cyber_threat_types.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCase.sanitizedMinute0.psych_cue_types.map((cue) => (
                          <span
                            key={cue}
                            className="rounded border border-momo-500/40 bg-momo-500/15 px-2 py-0.5 text-xs text-momo-200"
                          >
                            Tâm lý: {PSYCH_CUE_VI[cue]}
                          </span>
                        ))}
                        {selectedCase.sanitizedMinute0.cyber_threat_types.map((threat) => (
                          <span
                            key={threat}
                            className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs text-red-200"
                          >
                            Cyber: {CYBER_THREAT_VI[threat]}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedCase.sanitizedMinute0.sanitized_excerpt && (
                      <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 font-mono text-xs text-slate-300">
                        {selectedCase.sanitizedMinute0.sanitized_excerpt}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
                    Không có ảnh/báo cáo Phút 00 từ khách hàng — Hồ sơ được kích hoạt từ hệ thống
                    giám sát hành vi dòng tiền.
                  </div>
                )}
              </section>

              {/* Interactive Money Flow Graph */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-5">
                <MoneyFlowGraph
                  key={selectedCase.caseId}
                  graphData={selectedCase.graphData}
                  flaggedNodeIds={flaggedNodeIds}
                  dismissedFp={selectedCase.status === "DISMISSED_FP"}
                />
              </section>

              {/* 4 Parallel Agents Grid */}
              <AgentCardsGrid agentsState={activeAgentsState} />

              {/* 2-Column Debate, Empathetic CSKH Handover Card & Maker Decisions */}
              <DebateAndDecisionPanel
                caseRecord={selectedCase}
                debate={activeDebate}
                synthesizing={synthesizing}
                onDecisionRecorded={loadWorkspaceData}
              />
            </>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">
              Chọn một hồ sơ ở hàng đợi bên trái để bắt đầu điều tra.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Collapsible Audit Log */}
      <section
        aria-label="Nhật ký Kiểm toán Phiên"
        className="rounded-xl border border-slate-800 bg-slate-900/90"
      >
        <button
          type="button"
          aria-expanded={auditExpanded}
          onClick={() => setAuditExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-400"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-white">
            <History className="h-4 w-4 text-momo-400" aria-hidden="true" />
            <span>Nhật ký Kiểm toán Phiên (<span className="tech-only">audit_logs · </span>{auditLogs.length} bản ghi)</span>
          </span>
          {auditExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          )}
        </button>

        {auditExpanded && (
          <div className="border-t border-slate-800 p-4">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400">
                Chưa có sự kiện kiểm toán nào được ghi nhận trong phiên này.
              </p>
            ) : (
              <div className="max-h-72 overflow-x-auto overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                      <th className="py-2 pr-3">Thời gian</th>
                      <th className="py-2 pr-3">Hành động</th>
                      <th className="py-2 pr-3">Chủ thể</th>
                      <th className="py-2 pr-3">Đối tượng</th>
                      <th className="py-2">Giải trình / Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {auditLogs.map((log) => (
                      <tr key={log.logId} className="hover:bg-slate-950/60">
                        <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-slate-400">
                          {formatDateTimeVi(log.createdAt)}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3">
                          <code className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-momo-300">
                            {log.action}
                          </code>
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">
                          {castName(log.actorId)}<span className="tech-only font-mono"> · {log.actorId}</span>
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-slate-300">
                          {log.targetId}
                        </td>
                        <td className="py-2 text-slate-200">{log.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/** Q39: show the 3-working-day decision deadline for an escalated hold; flag overdue, never auto-act. */
function EscalationDeadline({ escalatedAt, decided }: { escalatedAt: unknown; decided: boolean }) {
  if (typeof escalatedAt !== "string" || decided) return null;
  const deadline = addWorkingDays(new Date(escalatedAt), ESCALATION_DECISION_WORKING_DAYS);
  const overdue = Date.now() > deadline.getTime();
  return (
    <p
      role={overdue ? "alert" : undefined}
      className={`text-xs font-semibold ${overdue ? "text-red-300" : "text-amber-200"}`}
    >
      {overdue ? "QUÁ HẠN — " : ""}Hạn ra phán quyết giao dịch tạm giữ:{" "}
      {deadline.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (
      {ESCALATION_DECISION_WORKING_DAYS} ngày làm việc kể từ khi Chuyển cấp)
    </p>
  );
}
