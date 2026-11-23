"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  GitBranch,
  Link2,
  ShieldCheck,
} from "lucide-react";
import {
  type ComplianceRagOutput,
  type EvidenceCorrelatorOutput,
  type FalsePositiveDefenderOutput,
  type GraphTracerOutput,
  type PolicyChunk,
  type WarRoomAgentKey,
} from "@/contracts";

export type AgentPhase = "IDLE" | "RUNNING" | "DONE";

export interface WarRoomAgentsState {
  graph_tracer: { phase: AgentPhase; output: GraphTracerOutput | null };
  evidence_correlator: { phase: AgentPhase; output: EvidenceCorrelatorOutput | null };
  compliance_rag: { phase: AgentPhase; output: ComplianceRagOutput | null };
  false_positive_defender: {
    phase: AgentPhase;
    output: FalsePositiveDefenderOutput | null;
  };
}

export function createIdleAgentsState(): WarRoomAgentsState {
  return {
    graph_tracer: { phase: "IDLE", output: null },
    evidence_correlator: { phase: "IDLE", output: null },
    compliance_rag: { phase: "IDLE", output: null },
    false_positive_defender: { phase: "IDLE", output: null },
  };
}

function AgentHeader({
  title,
  subtitle,
  icon,
  phase,
  status,
  latencyMs,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  phase: AgentPhase;
  status?: "OK" | "AGENT_DEGRADED";
  latencyMs?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-momo-300">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {phase === "RUNNING" && (
          <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-momo-400/50 bg-momo-500/20 px-2 py-0.5 text-xs font-semibold text-momo-200">
            <Activity className="h-3 w-3" aria-hidden="true" />
            Đang chạy...
          </span>
        )}
        {phase === "IDLE" && (
          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
            Chờ kích hoạt
          </span>
        )}
        {phase === "DONE" && status === "OK" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-200">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            OK
          </span>
        )}
        {phase === "DONE" && status === "AGENT_DEGRADED" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            AGENT_DEGRADED
          </span>
        )}
        {typeof latencyMs === "number" && (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-300">
            <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
            {Math.round(latencyMs)} ms
          </span>
        )}
      </div>
    </div>
  );
}

function DegradedNotice({
  agentKey,
  errorMessage,
}: {
  agentKey: WarRoomAgentKey;
  errorMessage?: string;
}) {
  return (
    <div
      data-testid={`agent-degraded-${agentKey}`}
      className="rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-100"
    >
      <p className="font-semibold text-amber-200">Chưa có kết quả (AGENT_DEGRADED)</p>
      <p className="mt-1 text-amber-100/90">
        {errorMessage ||
          "Agent này tạm thời gián đoạn; các Agent còn lại vẫn hoàn tất độc lập."}
      </p>
    </div>
  );
}

function IdleOrRunningBody({ phase }: { phase: AgentPhase }) {
  if (phase === "RUNNING") {
    return (
      <div className="space-y-2 py-4 text-xs text-momo-200">
        <div className="h-2.5 w-3/4 animate-pulse rounded bg-slate-800" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-800" />
        <p className="pt-1 text-slate-300">Đang phân tích tín hiệu song song...</p>
      </div>
    );
  }
  return (
    <p className="py-4 text-xs text-slate-400">
      Chưa có dữ liệu điều tra. Nhấn{" "}
      <strong className="text-slate-200">Chạy Điều tra 4 Agent</strong> để bắt đầu.
    </p>
  );
}

function PolicyChunkChip({ chunk }: { chunk: PolicyChunk }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/70">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs font-medium text-sky-200 transition hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-400"
      >
        <span className="truncate">
          <code className="mr-1.5 rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-xs text-sky-200">
            {chunk.chunk_id}
          </code>
          <span>{chunk.document_code}</span>
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-slate-800 px-3 py-2 text-xs text-slate-200">
          <p className="font-semibold text-white">{chunk.title}</p>
          <p className="leading-relaxed text-slate-300">{chunk.content_vi}</p>
        </div>
      )}
    </div>
  );
}

export function AgentCardsGrid({ agentsState }: { agentsState: WarRoomAgentsState }) {
  const gt = agentsState.graph_tracer;
  const ec = agentsState.evidence_correlator;
  const cr = agentsState.compliance_rag;
  const fpd = agentsState.false_positive_defender;

  return (
    <section aria-label="4 AI Agent điều tra song song" className="grid gap-4 md:grid-cols-2">
      {/* 1. Graph & Smurfing Tracer */}
      <article className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <AgentHeader
          title="1. Graph & Smurfing Tracer"
          subtitle="Phân tích chia nhỏ <10M/lần, cụm ví mule & thiết bị chung"
          icon={<GitBranch className="h-4 w-4" aria-hidden="true" />}
          phase={gt.phase}
          status={gt.output?.status}
          latencyMs={gt.output?.latency_ms}
        />

        {gt.phase !== "DONE" || !gt.output ? (
          <IdleOrRunningBody phase={gt.phase} />
        ) : gt.output.status === "AGENT_DEGRADED" ? (
          <DegradedNotice agentKey="graph_tracer" errorMessage={gt.output.error_message} />
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 font-semibold ${
                  gt.output.smurfing_detected
                    ? "border-red-500/50 bg-red-500/20 text-red-200"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                }`}
              >
                {gt.output.smurfing_detected ? "Smurfing: PHÁT HIỆN" : "Smurfing: Không"}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 font-semibold ${
                  gt.output.mule_cluster_detected
                    ? "border-red-500/50 bg-red-500/20 text-red-200"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                }`}
              >
                {gt.output.mule_cluster_detected ? "Cụm Mule: PHÁT HIỆN" : "Cụm Mule: Không"}
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono font-semibold text-slate-200">
                Đóng góp rủi ro: {gt.output.risk_contribution}/100
              </span>
            </div>

            {gt.output.flagged_node_ids.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Nút bị đánh dấu
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {gt.output.flagged_node_ids.map((nodeId) => (
                    <code
                      key={nodeId}
                      className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 font-mono text-xs text-red-200"
                    >
                      {nodeId}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <ul className="list-disc space-y-1 pl-4 text-slate-200">
              {gt.output.key_findings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* 2. Pre-App Evidence Correlator */}
      <article className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <AgentHeader
          title="2. Pre-App Evidence Correlator"
          subtitle="Đối chiếu bằng chứng Phút 00, cờ SIMO & chỉ báo Cyber độc lập"
          icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
          phase={ec.phase}
          status={ec.output?.status}
          latencyMs={ec.output?.latency_ms}
        />

        {ec.phase !== "DONE" || !ec.output ? (
          <IdleOrRunningBody phase={ec.phase} />
        ) : ec.output.status === "AGENT_DEGRADED" ? (
          <DegradedNotice
            agentKey="evidence_correlator"
            errorMessage={ec.output.error_message}
          />
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 font-semibold ${
                  ec.output.minute0_matched
                    ? "border-red-500/50 bg-red-500/20 text-red-200"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                {ec.output.minute0_matched ? "Phút 00: KHỚP" : "Phút 00: Không"}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 font-semibold ${
                  ec.output.simo_flag_matched
                    ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                {ec.output.simo_flag_matched ? "Cờ SIMO: CÓ" : "Cờ SIMO: Không"}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 font-semibold ${
                  ec.output.cyber_indicator_matched
                    ? "border-red-500/50 bg-red-500/20 text-red-200"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                {ec.output.cyber_indicator_matched ? "Chỉ báo Cyber: CÓ" : "Chỉ báo Cyber: Không"}
              </span>
              <span className="rounded-md border border-momo-400/50 bg-momo-500/20 px-2 py-0.5 font-semibold text-momo-200">
                {ec.output.independent_sources.length} nguồn độc lập
              </span>
            </div>

            {ec.output.independent_sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ec.output.independent_sources.map((src) => (
                  <code
                    key={src}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-xs text-slate-200"
                  >
                    {src}
                  </code>
                ))}
              </div>
            )}

            <ul className="list-disc space-y-1 pl-4 text-slate-200">
              {ec.output.key_findings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* 3. Compliance & Policy RAG */}
      <article className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <AgentHeader
          title="3. Compliance & Policy RAG"
          subtitle="Trích dẫn Luật PCRT, TT 40/2024, Luật 91/2025, Luật AI 134/2025, TT 77 & TT 53"
          icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
          phase={cr.phase}
          status={cr.output?.status}
          latencyMs={cr.output?.latency_ms}
        />

        {cr.phase !== "DONE" || !cr.output ? (
          <IdleOrRunningBody phase={cr.phase} />
        ) : cr.output.status === "AGENT_DEGRADED" ? (
          <DegradedNotice agentKey="compliance_rag" errorMessage={cr.output.error_message} />
        ) : (
          <div className="space-y-3 text-xs">
            {cr.output.cited_chunks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Điều khoản trích dẫn (Nhấp để xem nguyên văn)
                </p>
                <div className="space-y-1.5">
                  {cr.output.cited_chunks.map((chunk) => (
                    <PolicyChunkChip key={chunk.chunk_id} chunk={chunk} />
                  ))}
                </div>
              </div>
            )}

            {cr.output.policy_notes_vi.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-slate-200">
                {cr.output.policy_notes_vi.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            )}

            <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-slate-200">
              <span className="font-semibold text-white">Đối chiếu Bảo hiểm chuyển tiền: </span>
              <span>{cr.output.insurance_eligibility_vi}</span>
            </div>
          </div>
        )}
      </article>

      {/* 4. False-Positive Defender */}
      <article className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
        <AgentHeader
          title="4. False-Positive Defender"
          subtitle="Phản biện bảo vệ khách hàng thật & tiểu thương hợp lệ"
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          phase={fpd.phase}
          status={fpd.output?.status}
          latencyMs={fpd.output?.latency_ms}
        />

        {fpd.phase !== "DONE" || !fpd.output ? (
          <IdleOrRunningBody phase={fpd.phase} />
        ) : fpd.output.status === "AGENT_DEGRADED" ? (
          <DegradedNotice
            agentKey="false_positive_defender"
            errorMessage={fpd.output.error_message}
          />
        ) : (
          <div className="space-y-3 text-xs">
            <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">
                  Độ tin cậy vô tội (Innocence Confidence)
                </span>
                <span className="font-mono text-sm font-bold text-emerald-300">
                  {fpd.output.innocence_confidence}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Độ tin cậy vô tội"
                aria-valuenow={fpd.output.innocence_confidence}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-3 w-full overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${fpd.output.innocence_confidence}%` }}
                />
              </div>
              <div className="pt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                    fpd.output.recommend_dismiss
                      ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                      : "border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  {fpd.output.recommend_dismiss
                    ? "Đề xuất: Minh oan (đóng cảnh báo giả)"
                    : "Không đủ cơ sở đóng cảnh báo giả"}
                </span>
              </div>
            </div>

            {fpd.output.benign_signals.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Tín hiệu hành vi lành mạnh
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {fpd.output.benign_signals.map((sig, idx) => (
                    <span
                      key={idx}
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-emerald-200"
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <ul className="list-disc space-y-1 pl-4 text-slate-200">
              {fpd.output.counter_arguments_vi.map((arg, idx) => (
                <li key={idx}>{arg}</li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </section>
  );
}
