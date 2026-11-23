"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  FileCheck2,
  History,
  RefreshCw,
  RotateCcw,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  TimerOff,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  DEMO_SIMULATION_LABEL,
  IMMUNITY_TTL_HOURS,
  type ActorRole,
  type AppealStatus,
  type AuditAction,
  type ImmunityIndicatorDto,
  type ImmunityListResponse,
  type ImmunityStatus,
} from "@/contracts";
import { B2cLiveProbeCard } from "./B2cLiveProbeCard";

interface RolePersona {
  // shortcut: RISK_CHECKER_LAN is a UI-only persona (not in contracts PERSONA_IDS), add to contracts when Orchestrator reopens the freeze
  id: "RISK_MAKER_HUYEN" | "RISK_CHECKER_TUAN" | "RISK_CHECKER_LAN";
  role: ActorRole;
  displayName: string;
  titleVi: string;
  hintVi: string;
}

const PERSONAS: readonly RolePersona[] = [
  {
    id: "RISK_CHECKER_TUAN",
    role: "RISK_CHECKER",
    displayName: "Anh Tuấn",
    titleVi: "Risk Checker (Người phê duyệt độc lập)",
    hintVi: "Có quyền duyệt Lớp 2 (≥2 nguồn khác loại, khác Maker — thiết kế quản trị riêng), xét khiếu nại người thật, Thu hồi & Giả lập hết hạn.",
  },
  {
    id: "RISK_CHECKER_LAN",
    role: "RISK_CHECKER",
    displayName: "Chị Lan",
    titleVi: "Risk Checker (Người xét khiếu nại độc lập)",
    hintVi: "Xét khiếu nại cho chỉ báo do Checker khác kích hoạt; máy chủ trả 403 nếu người xét trùng người đã duyệt.",
  },
  {
    id: "RISK_MAKER_HUYEN",
    role: "RISK_MAKER",
    displayName: "Chị Huyền",
    titleVi: "Risk Maker (Chuyên viên đề xuất)",
    hintVi: "Dùng để kiểm chứng trực tiếp chặn HTTP 403 Maker≠Checker từ máy chủ khi tự bấm phê duyệt.",
  },
] as const;

const STATUS_META: Record<ImmunityStatus, { label: string; className: string }> = {
  PENDING_CHECKER: {
    label: "Chờ Checker duyệt",
    className: "border-indigo-300 bg-indigo-50 text-indigo-900",
  },
  SOFT_WARNING: {
    label: "Cảnh báo mềm (Lớp 1)",
    className: "border-amber-300 bg-amber-50 text-amber-950",
  },
  ACTIVE: {
    label: "Kích hoạt (Lớp 2)",
    className: "border-signal-300 bg-signal-50 text-signal-900",
  },
  EXPIRED: {
    label: "Hết hạn (Lớp 3)",
    className: "border-slate-300 bg-slate-100 text-slate-700",
  },
  ROLLED_BACK: {
    label: "Thu hồi (Lớp 4)",
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
};

const APPEAL_STATUS_META: Record<AppealStatus, { label: string; className: string }> = {
  PENDING_HUMAN_REVIEW: {
    label: "Chờ người thật xem xét",
    className: "border-amber-300 bg-amber-50 text-amber-950",
  },
  UPHELD: {
    label: "Giữ nguyên cảnh báo",
    className: "border-slate-300 bg-slate-100 text-slate-800",
  },
  OVERTURNED_ROLLBACK: {
    label: "Chấp nhận — đã Thu hồi",
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
};

const AUDIT_ACTION_BADGE: Partial<Record<AuditAction, string>> = {
  IMMUNITY_PROPOSED: "border-indigo-200 bg-indigo-50 text-indigo-800",
  IMMUNITY_APPROVED: "border-signal-200 bg-signal-50 text-signal-800",
  APPEAL_SUBMITTED: "border-amber-200 bg-amber-50 text-amber-900",
  APPEAL_RESOLVED: "border-sky-200 bg-sky-50 text-sky-900",
  IMMUNITY_ROLLED_BACK: "border-emerald-200 bg-emerald-50 text-emerald-900",
  IMMUNITY_EXPIRED_DEMO: "border-slate-300 bg-slate-100 text-slate-800",
};

function formatViTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

interface FeedbackBanner {
  type: "success" | "error";
  title: string;
  message: string;
}

export function CheckerWorkspace() {
  const [activePersona, setActivePersona] = useState<RolePersona>(PERSONAS[0]);
  const [registry, setRegistry] = useState<ImmunityListResponse>({
    indicators: [],
    appeals: [],
    auditLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [banner, setBanner] = useState<FeedbackBanner | null>(null);

  // Per-indicator form state
  const [ttlSelection, setTtlSelection] = useState<Record<string, number>>({});
  const [approveRationale, setApproveRationale] = useState<Record<string, string>>({});
  const [rollbackReason, setRollbackReason] = useState<Record<string, string>>({});

  // Per-appeal resolution note state
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  // Inline demo appeal form state (Layer 4)
  const [appealFormOpen, setAppealFormOpen] = useState(false);
  const [appealIndicatorId, setAppealIndicatorId] = useState("");
  const [appellantName, setAppellantName] = useState("Chủ tài khoản mô phỏng (Hộ kinh doanh)");
  const [appellantNote, setAppellantNote] = useState(
    "Đề nghị người thật rà soát lại cảnh báo theo Thông tư 53/2026/TT-NHNN (MẪU MÔ PHỎNG).",
  );

  // Live probe sync
  const [probeTarget, setProbeTarget] = useState<string>("990123456789");
  const [probeNonce, setProbeNonce] = useState(0);

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/immunity", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setBanner({
          type: "error",
          title: `HTTP ${res.status}`,
          message:
            (data as { error?: string } | null)?.error ??
            "Không thể tải Danh mục Miễn dịch Cộng đồng.",
        });
        return;
      }
      const typed = data as ImmunityListResponse;
      setRegistry(typed);
      const appealable = typed.indicators.find(
        (i) => i.status === "ACTIVE" || i.status === "SOFT_WARNING",
      );
      setAppealIndicatorId((prev) =>
        typed.indicators.some(
          (i) => i.indicatorId === prev && (i.status === "ACTIVE" || i.status === "SOFT_WARNING"),
        )
          ? prev
          : (appealable?.indicatorId ?? ""),
      );
    } catch {
      setBanner({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể kết nối tới GET /api/immunity.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  async function callGovernanceApi(
    key: string,
    url: string,
    payload: Record<string, unknown>,
    successTitle: string,
    successMessage: string,
  ) {
    setBusyKey(key);
    setBanner(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = data as { code?: string; error?: string } | null;
        setBanner({
          type: "error",
          title: `HTTP ${res.status} · ${err?.code ?? "REQUEST_REJECTED"}`,
          message: err?.error ?? "Máy chủ đã từ chối thao tác quản trị.",
        });
        return false;
      }
      setBanner({
        type: "success",
        title: successTitle,
        message: successMessage,
      });
      await loadRegistry();
      return true;
    } catch {
      setBanner({
        type: "error",
        title: "Lỗi kết nối",
        message: `Không thể gửi yêu cầu tới ${url}.`,
      });
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function handleApprove(indicator: ImmunityIndicatorDto) {
    const ttlHours = ttlSelection[indicator.indicatorId] ?? IMMUNITY_TTL_HOURS.ACTIVE;
    const rationale =
      (approveRationale[indicator.indicatorId] ?? "").trim() ||
      `Đã kiểm tra đối chứng ${indicator.evidenceSources.length} nguồn độc lập và phê duyệt kích hoạt Lớp 2 (${ttlHours}h).`;

    await callGovernanceApi(
      `approve-${indicator.indicatorId}`,
      `/api/immunity/${indicator.indicatorId}/approve`,
      {
        checkerId: activePersona.id,
        checkerRole: activePersona.role,
        rationale,
        ttlHours,
      },
      "Đã phê duyệt Miễn dịch Cộng đồng (Lớp 2 — ACTIVE)",
      `Chỉ báo ${indicator.indicatorValue} đã được kích hoạt với TTL ${ttlHours} giờ và ghi nhận vào Nhật ký Kiểm toán.`,
    );
  }

  async function handleRollback(indicator: ImmunityIndicatorDto) {
    const reason =
      (rollbackReason[indicator.indicatorId] ?? "").trim() ||
      "Thu hồi tức thì theo quy trình Lớp 4 để chống chặn oan (False Positive).";

    await callGovernanceApi(
      `rollback-${indicator.indicatorId}`,
      `/api/immunity/${indicator.indicatorId}/rollback`,
      {
        checkerId: activePersona.id,
        checkerRole: activePersona.role,
        reason,
      },
      "Đã thu hồi tức thì (Lớp 4 — ROLLED_BACK)",
      `Chỉ báo ${indicator.indicatorValue} đã bị gỡ khỏi Danh mục Miễn dịch đang hoạt động.`,
    );
  }

  async function handleExpireDemo(indicator: ImmunityIndicatorDto) {
    await callGovernanceApi(
      `expire-${indicator.indicatorId}`,
      `/api/immunity/${indicator.indicatorId}/expire-demo`,
      {
        checkerId: activePersona.id,
        checkerRole: activePersona.role,
        rationale: `Kiểm chứng Lớp 3 TTL tự động hết hạn (${DEMO_SIMULATION_LABEL})`,
      },
      `Đã giả lập hết hạn TTL (Lớp 3 — EXPIRED · ${DEMO_SIMULATION_LABEL})`,
      `Chỉ báo ${indicator.indicatorValue} đã chuyển sang EXPIRED và ngừng kích hoạt cảnh báo B2C.`,
    );
  }

  async function handleSubmitDemoAppeal(e: React.FormEvent) {
    e.preventDefault();
    if (!appealIndicatorId) return;
    const ok = await callGovernanceApi(
      "submit-appeal",
      `/api/immunity/${appealIndicatorId}/appeal`,
      {
        appellantName: appellantName.trim(),
        appellantNote: appellantNote.trim(),
        actorId: "USER_B2C_NEW",
      },
      "Đã tiếp nhận Khiếu nại Người thật (TT 53/2026)",
      "Hồ sơ khiếu nại đã được chuyển vào Hàng đợi Rà soát của Risk Checker với trạng thái PENDING_HUMAN_REVIEW.",
    );
    if (ok) {
      setAppealFormOpen(false);
    }
  }

  async function handleResolveAppeal(
    indicatorId: string,
    appealId: string,
    resolution: "UPHELD" | "OVERTURNED_ROLLBACK",
  ) {
    const resolutionNote =
      (resolutionNotes[appealId] ?? "").trim() ||
      (resolution === "OVERTURNED_ROLLBACK"
        ? "Chấp nhận khiếu nại sau khi đối soát hồ sơ người thật (TT 53/2026) — thu hồi cảnh báo tức thì."
        : "Giữ nguyên cảnh báo Miễn dịch sau khi rà soát đầy đủ bằng chứng đa nguồn.");

    await callGovernanceApi(
      `resolve-${appealId}-${resolution}`,
      `/api/immunity/${indicatorId}/resolve-appeal`,
      {
        appealId,
        reviewerId: activePersona.id,
        reviewerRole: activePersona.role,
        resolution,
        resolutionNote,
      },
      resolution === "OVERTURNED_ROLLBACK"
        ? "Đã chấp nhận khiếu nại & Rollback tức thì"
        : "Đã giữ nguyên cảnh báo (UPHELD)",
      resolution === "OVERTURNED_ROLLBACK"
        ? "Khiếu nại được chấp nhận (OVERTURNED_ROLLBACK) và chỉ báo liên quan đã chuyển sang ROLLED_BACK."
        : "Khiếu nại đã được kết luận giữ nguyên cảnh báo và lưu Nhật ký Kiểm toán.",
    );
  }

  const counts = {
    softWarning: registry.indicators.filter((i) => i.status === "SOFT_WARNING").length,
    pendingChecker: registry.indicators.filter((i) => i.status === "PENDING_CHECKER").length,
    active: registry.indicators.filter((i) => i.status === "ACTIVE").length,
    expired: registry.indicators.filter((i) => i.status === "EXPIRED").length,
    rolledBack: registry.indicators.filter((i) => i.status === "ROLLED_BACK").length,
    pendingAppeals: registry.appeals.filter((a) => a.status === "PENDING_HUMAN_REVIEW").length,
    // shortcut: Minh oan count reads the 100 latest audit logs; add a server-side count if sessions grow long
    dismissedFp: registry.auditLogs.filter((l) => l.action === "CASE_DISMISSED_FP").length,
    overturnedAppeals: registry.appeals.filter((a) => a.status === "OVERTURNED_ROLLBACK").length,
  };

  const appealableIndicators = registry.indicators.filter(
    (i) => i.status === "ACTIVE" || i.status === "SOFT_WARNING",
  );
  const indicatorById = new Map(registry.indicators.map((i) => [i.indicatorId, i]));

  return (
    <div className="space-y-6">
      {/* Header + Built-in Maker / Checker Role Switcher */}
      <section
        aria-labelledby="checker-title"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 id="checker-title" className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                Checker &amp; Quản trị Miễn dịch Cộng đồng 4 Lớp
              </h1>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                {DEMO_SIMULATION_LABEL}
              </span>
            </div>
            <p className="max-w-3xl text-sm text-slate-600">
              Cổng kiểm duyệt độc lập Risk Checker: thực thi nguyên tắc <strong>Maker ≠ Checker</strong>,
              ngưỡng <strong>≥ 2 nguồn bằng chứng độc lập</strong>, cơ chế <strong>TTL tự hết hạn</strong>,
              hàng đợi <strong>Khiếu nại Người thật (TT 53/2026)</strong> và{" "}
              <strong>Rollback tức thì</strong> trên Nhật ký Kiểm toán bất biến.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/warroom"
              className="inline-flex min-h-[40px] items-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            >
              ← B2E War-Room
            </Link>
            <button
              type="button"
              onClick={() => void loadRegistry()}
              disabled={loading}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Built-in Maker / Checker Role Switcher */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Chuyển vai trò kiểm chứng phân quyền (Maker ≠ Checker)
            </span>
            <span className="tech-only text-xs font-semibold text-slate-600">
              Vai trò đang gửi lên máy chủ:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-momo-700">
                {activePersona.id} ({activePersona.role})
              </code>
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Chọn vai trò Maker hoặc Checker">
            {PERSONAS.map((persona) => {
              const selected = activePersona.id === persona.id;
              const isChecker = persona.role === "RISK_CHECKER";
              return (
                <button
                  key={persona.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setActivePersona(persona);
                    setBanner(null);
                  }}
                  className={`flex min-h-[56px] items-start gap-3 rounded-xl border-2 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 ${
                    selected
                      ? isChecker
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-950"
                        : "border-amber-500 bg-amber-50/80 text-amber-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {isChecker ? (
                    <UserCheck
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        selected ? "text-emerald-700" : "text-slate-500"
                      }`}
                      aria-hidden="true"
                    />
                  ) : (
                    <UserX
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        selected ? "text-amber-700" : "text-slate-500"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">
                      {persona.displayName}{" "}
                      <span className="tech-only font-mono text-xs font-normal">({persona.id})</span>
                    </p>
                    <p className="text-xs font-semibold opacity-90">{persona.titleVi}</p>
                    <p className="text-xs opacity-80">{persona.hintVi}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Server Feedback Banner */}
        {banner && (
          <div
            role={banner.type === "error" ? "alert" : "status"}
            className={`mt-4 flex items-start gap-3 rounded-xl border-2 p-4 ${
              banner.type === "error"
                ? "border-red-400 bg-red-50 text-red-950"
                : "border-emerald-400 bg-emerald-50 text-emerald-950"
            }`}
          >
            {banner.type === "error" ? (
              <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            ) : (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            )}
            <div className="space-y-0.5 text-sm">
              <p className="font-extrabold">{banner.title}</p>
              <p>{banner.message}</p>
            </div>
          </div>
        )}
      </section>

      {/* 4-Layer Governance Summary Bar */}
      {/* Q24: honest false-positive accounting — raw demo counts only, no percentages. */}
      <section
        aria-label="Số đếm minh oan và thu hồi trong phiên demo"
        className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800"
      >
        <h2 className="text-base font-bold text-slate-900">
          Ghi nhận báo nhầm trong phiên này <span className="text-xs font-semibold text-slate-500">({DEMO_SIMULATION_LABEL})</span>
        </h2>
        <dl className="mt-2 grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-600">Vụ được Minh oan</dt>
            <dd className="text-2xl font-bold">{counts.dismissedFp}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Khiếu nại được chấp nhận</dt>
            <dd className="text-2xl font-bold">{counts.overturnedAppeals}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Chỉ báo bị Thu hồi</dt>
            <dd className="text-2xl font-bold">{counts.rolledBack}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-600">
          Số đếm thô trên dữ liệu mô phỏng, không phải tỷ lệ báo nhầm của hệ thống thật.
        </p>
      </section>

      <section aria-label="Tóm tắt 4 Lớp Quản trị Miễn dịch" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-amber-800">
              Lớp 1 · Soft Warning 72h
            </span>
            <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{counts.softWarning}</p>
          <p className="mt-1 text-xs text-slate-600">
            1 nguồn độc lập — cảnh báo mềm, không chặn cứng, tự động hết hạn sau 72h.
          </p>
        </div>

        <div className="rounded-2xl border border-signal-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-signal-800">
              Lớp 2 · Active (≥2 nguồn)
            </span>
            <FileCheck2 className="h-4 w-4 text-signal-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {counts.active}{" "}
            <span className="text-sm font-semibold text-indigo-700">
              ({counts.pendingChecker} chờ duyệt)
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Bắt buộc ≥2 nguồn độc lập + Maker ≠ Checker phê duyệt để phát cảnh báo toàn cộng đồng.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Lớp 3 · TTL &amp; Hết hạn
            </span>
            <Clock className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{counts.expired}</p>
          <p className="mt-1 text-xs text-slate-600">
            Tự động chuyển EXPIRED khi hết TTL + hỗ trợ nút Giả lập hết hạn Demo ({DEMO_SIMULATION_LABEL}).
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">
              Lớp 4 · Khiếu nại &amp; Rollback
            </span>
            <Scale className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {counts.rolledBack}{" "}
            <span className="text-sm font-semibold text-amber-800">
              ({counts.pendingAppeals} khiếu nại chờ)
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Người thật rà soát khiếu nại (TT 53/2026) và Rollback tức thì gỡ cảnh báo B2C.
          </p>
        </div>
      </section>

      {/* Closed-Loop B2C Live Probe Card */}
      <B2cLiveProbeCard
        indicators={registry.indicators}
        externalQuery={probeTarget}
        externalQueryNonce={probeNonce}
      />

      {/* Immunity Registry Panel */}
      <section
        aria-labelledby="registry-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 id="registry-heading" className="text-lg font-bold text-slate-900">
              Danh mục Chỉ báo Miễn dịch Cộng đồng ({registry.indicators.length})
            </h2>
            <p className="text-sm text-slate-600">
              Mọi thay đổi trạng thái đều được thực thi nguyên tử trong CSDL và ghi vào Nhật ký Kiểm
              toán bất biến.
            </p>
          </div>
        </div>

        {loading && registry.indicators.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Đang tải danh mục Miễn dịch...</p>
        ) : registry.indicators.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Chưa có chỉ báo Miễn dịch nào được đề xuất trong phiên demo này.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Hãy vào <strong>B2E War-Room</strong>, chạy điều tra 4 Agent cho CASE-01 hoặc CASE-02
              và bấm <strong>Đề xuất Miễn dịch</strong> để chuyển hồ sơ sang Checker.
            </p>
            <Link
              href="/warroom"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-momo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
            >
              Mở B2E War-Room để đề xuất chỉ báo →
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {registry.indicators.map((ind) => {
              const statusMeta = STATUS_META[ind.status];
              const canApprove =
                ind.status === "PENDING_CHECKER" || ind.status === "SOFT_WARNING";
              const canRollback = ind.status !== "ROLLED_BACK";
              const canExpireDemo =
                ind.status === "ACTIVE" ||
                ind.status === "SOFT_WARNING" ||
                ind.status === "PENDING_CHECKER";
              const hasEnoughSources = ind.evidenceSources.length >= 2;
              const selectedTtl =
                ttlSelection[ind.indicatorId] ?? IMMUNITY_TTL_HOURS.ACTIVE;

              return (
                <article
                  key={ind.indicatorId}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-0.5 text-xs font-extrabold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
                          {ind.indicatorType}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          Mức: {ind.severity}
                        </span>
                      </div>

                      <p className="break-all font-mono text-base font-extrabold text-slate-900 sm:text-lg">
                        {ind.indicatorValue}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProbeTarget(ind.indicatorValue);
                        setProbeNonce((n) => n + 1);
                      }}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-momo-300 bg-white px-3 py-1.5 text-xs font-bold text-momo-700 transition hover:bg-momo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                    >
                      Đưa lên B2C Live Probe ↑
                    </button>
                  </div>

                  {/* Metadata Grid */}
                  <dl className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="font-semibold text-slate-500">Maker đề xuất</dt>
                      <dd className="mt-0.5 font-mono font-bold text-slate-900">{ind.makerId}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Checker phê duyệt</dt>
                      <dd className="mt-0.5 font-mono font-bold text-slate-900">
                        {ind.checkerId ?? "Chưa phê duyệt"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Hiệu lực TTL</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900">
                        {ind.ttlHours} giờ · Hết hạn {formatViTime(ind.expiresAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">
                        Nguồn bằng chứng độc lập ({ind.evidenceSources.length})
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-1">
                        {ind.evidenceSources.map((src) => (
                          <span
                            key={src}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800"
                          >
                            {src}
                          </span>
                        ))}
                        {!hasEnoughSources && (
                          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                            &lt; 2 nguồn (Chặn Lớp 2 — HTTP 400)
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {ind.rollbackReason && (
                    <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                      <strong>Lý do thu hồi (Rollback):</strong> {ind.rollbackReason}
                    </p>
                  )}

                  {/* Governance Action Controls */}
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {/* Layer 2 Approve Box */}
                    {canApprove && (
                      <div className="space-y-2.5 rounded-xl border border-indigo-200 bg-white p-3.5">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-900">
                          Lớp 2 · Phê duyệt Phát hành (Maker ≠ Checker &amp; ≥2 nguồn)
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="block space-y-1 text-xs">
                            <span className="font-semibold text-slate-700">Thời hạn TTL</span>
                            <select
                              value={selectedTtl}
                              onChange={(e) =>
                                setTtlSelection((prev) => ({
                                  ...prev,
                                  [ind.indicatorId]: Number(e.target.value),
                                }))
                              }
                              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                            >
                              <option value={IMMUNITY_TTL_HOURS.ACTIVE}>
                                720 giờ (30 ngày — ACTIVE chuẩn)
                              </option>
                              <option value={IMMUNITY_TTL_HOURS.SOFT_WARNING}>
                                72 giờ (3 ngày — Ngắn hạn)
                              </option>
                            </select>
                          </label>
                          <label className="block space-y-1 text-xs">
                            <span className="font-semibold text-slate-700">Lý do phê duyệt</span>
                            <input
                              type="text"
                              value={approveRationale[ind.indicatorId] ?? ""}
                              onChange={(e) =>
                                setApproveRationale((prev) => ({
                                  ...prev,
                                  [ind.indicatorId]: e.target.value,
                                }))
                              }
                              placeholder="Đã đối chứng ≥2 nguồn độc lập..."
                              className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleApprove(ind)}
                          disabled={busyKey === `approve-${ind.indicatorId}`}
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-momo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
                        >
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          {busyKey === `approve-${ind.indicatorId}`
                            ? "Đang gửi phê duyệt..."
                            : `Phê duyệt Kích hoạt (Lớp 2) — ${activePersona.displayName}`}
                        </button>
                      </div>
                    )}

                    {/* Layer 3 Expire-Demo & Layer 4 Rollback Box */}
                    {(canRollback || canExpireDemo) && (
                      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                          Lớp 3 &amp; Lớp 4 · Thu hồi tức thì (Rollback) &amp; Giả lập hết hạn TTL
                        </p>
                        {canRollback && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <label className="sr-only" htmlFor={`rollback-${ind.indicatorId}`}>
                              Lý do thu hồi chỉ báo {ind.indicatorValue}
                            </label>
                            <input
                              id={`rollback-${ind.indicatorId}`}
                              type="text"
                              value={rollbackReason[ind.indicatorId] ?? ""}
                              onChange={(e) =>
                                setRollbackReason((prev) => ({
                                  ...prev,
                                  [ind.indicatorId]: e.target.value,
                                }))
                              }
                              placeholder="Lý do Rollback (VD: Chống chặn oan / xác minh hợp lệ)..."
                              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                            />
                            <button
                              type="button"
                              onClick={() => void handleRollback(ind)}
                              disabled={busyKey === `rollback-${ind.indicatorId}`}
                              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden="true" />
                              Thu hồi tức thì — Rollback (Lớp 4)
                            </button>
                          </div>
                        )}

                        {canExpireDemo && (
                          <button
                            type="button"
                            onClick={() => void handleExpireDemo(ind)}
                            disabled={busyKey === `expire-${ind.indicatorId}`}
                            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
                          >
                            <TimerOff className="h-4 w-4" aria-hidden="true" />
                            Giả lập hết hạn TTL (Demo — Lớp 3 · {DEMO_SIMULATION_LABEL})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Human Appeal Queue (TT 53/2026) */}
      <section
        aria-labelledby="appeals-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 id="appeals-heading" className="text-lg font-bold text-slate-900">
              Hàng đợi Khiếu nại Người thật Rà soát (TT 53/2026) · {registry.appeals.length} hồ sơ
            </h2>
            <p className="text-sm text-slate-600">
              Bảo đảm quyền khiếu nại để con người rà soát lại quyết định tự động theo Thông tư
              53/2026/TT-NHNN. Khi chấp nhận khiếu nại (<code>OVERTURNED_ROLLBACK</code>), hệ thống
              tự động thu hồi chỉ báo ngay lập tức.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAppealFormOpen((prev) => !prev)}
            disabled={appealableIndicators.length === 0}
            className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-momo-300 bg-momo-50 px-4 py-2 text-sm font-bold text-momo-700 transition hover:bg-momo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {appealFormOpen ? "Ẩn biểu mẫu" : `Tạo khiếu nại thử (${DEMO_SIMULATION_LABEL})`}
          </button>
        </div>

        {appealFormOpen && appealableIndicators.length > 0 && (
          <form
            onSubmit={(e) => void handleSubmitDemoAppeal(e)}
            className="mt-4 space-y-3 rounded-xl border border-momo-200 bg-momo-50/50 p-4"
          >
            <p className="text-sm font-bold text-momo-900">
              Gửi hồ sơ khiếu nại mô phỏng ({DEMO_SIMULATION_LABEL}) vào hàng đợi Người thật
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-slate-700">Chỉ báo cần khiếu nại</span>
                <select
                  value={appealIndicatorId}
                  onChange={(e) => setAppealIndicatorId(e.target.value)}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                >
                  {appealableIndicators.map((i) => (
                    <option key={i.indicatorId} value={i.indicatorId}>
                      {i.indicatorValue}<span className="tech-only"> ({i.status})</span>
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-slate-700">Tên người khiếu nại</span>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={appellantName}
                  onChange={(e) => setAppellantName(e.target.value)}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                />
              </label>

              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-slate-700">Nội dung &amp; căn cứ đối soát</span>
                <input
                  type="text"
                  required
                  minLength={5}
                  value={appellantNote}
                  onChange={(e) => setAppellantNote(e.target.value)}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busyKey === "submit-appeal"}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-momo-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
            >
              Gửi khiếu nại (POST /api/immunity/[id]/appeal)
            </button>
          </form>
        )}

        {registry.appeals.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
            Chưa có khiếu nại nào trong phiên hiện tại. Người dùng có thể gửi khiếu nại trực tiếp từ
            cảnh báo Miễn dịch tại <strong>/shield</strong> hoặc nhấn{" "}
            <strong>Tạo khiếu nại thử</strong> ở trên khi có chỉ báo <code>ACTIVE</code> /{" "}
            <code>SOFT_WARNING</code>.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {registry.appeals.map((appeal) => {
              const linked = indicatorById.get(appeal.indicatorId);
              const statusMeta = APPEAL_STATUS_META[appeal.status];
              const isPending = appeal.status === "PENDING_HUMAN_REVIEW";

              return (
                <article
                  key={appeal.appealId}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {appeal.appealId}
                        </span>
                        {linked && (
                          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                            Chỉ báo: {linked.indicatorValue}<span className="tech-only"> ({linked.status})</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        Người khiếu nại: {appeal.appellantName}
                      </p>
                      <p className="text-sm text-slate-700">{appeal.appellantNote}</p>
                    </div>
                    <span className="text-xs text-slate-500">{formatViTime(appeal.createdAt)}</span>
                  </div>

                  {appeal.resolutionNote && (
                    <p className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800">
                      <strong>Kết luận bởi {appeal.reviewerId ?? "Checker"}:</strong>{" "}
                      {appeal.resolutionNote}
                    </p>
                  )}

                  {isPending && (
                    <div className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
                      <label className="block space-y-1 text-xs">
                        <span className="font-semibold text-slate-700">
                          Ghi chú rà soát người thật (bắt buộc lưu Audit Log)
                        </span>
                        <input
                          type="text"
                          value={resolutionNotes[appeal.appealId] ?? ""}
                          onChange={(e) =>
                            setResolutionNotes((prev) => ({
                              ...prev,
                              [appeal.appealId]: e.target.value,
                            }))
                          }
                          placeholder="VD: Đã đối soát chứng từ hợp lệ, chấp nhận khiếu nại và gỡ cảnh báo..."
                          className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleResolveAppeal(appeal.indicatorId, appeal.appealId, "UPHELD")
                          }
                          disabled={busyKey === `resolve-${appeal.appealId}-UPHELD`}
                          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
                        >
                          Giữ nguyên cảnh báo (UPHELD)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleResolveAppeal(
                              appeal.indicatorId,
                              appeal.appealId,
                              "OVERTURNED_ROLLBACK",
                            )
                          }
                          disabled={busyKey === `resolve-${appeal.appealId}-OVERTURNED_ROLLBACK`}
                          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Chấp nhận khiếu nại &amp; Rollback tức thì (OVERTURNED_ROLLBACK)
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Immutable Audit Log Table */}
      <section
        aria-labelledby="audit-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <History className="h-5 w-5 text-momo-600" aria-hidden="true" />
          <div>
            <h2 id="audit-heading" className="text-lg font-bold text-slate-900">
              Nhật ký Kiểm toán Bất biến (<code className="tech-only">audit_logs · </code>{registry.auditLogs.length} bản ghi)
            </h2>
            <p className="text-sm text-slate-600">
              Chỉ ghi thêm (append-only) theo trình tự thời gian, phục vụ truy vết toàn bộ vòng đời
              Miễn dịch và giải trình tuân thủ.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Thời gian
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Tác nhân (Actor)
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Hành động
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Đối tượng (targetId)
                </th>
                <th scope="col" className="px-3 py-2.5 font-bold">
                  Lý do / Diễn giải
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registry.auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Chưa có bản ghi kiểm toán nào trong phiên này.
                  </td>
                </tr>
              ) : (
                registry.auditLogs.map((log) => {
                  const badgeClass =
                    AUDIT_ACTION_BADGE[log.action] ??
                    "border-slate-200 bg-slate-50 text-slate-700";
                  return (
                    <tr key={log.logId} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">
                        {formatViTime(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="block font-mono font-bold text-slate-900">
                          {log.actorId}
                        </span>
                        <span className="text-[11px] text-slate-500">{log.actorRole}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${badgeClass}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2.5 font-mono text-slate-700">
                        {log.targetId}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800">{log.rationale}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
