"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";
import {
  DEMO_SIMULATION_LABEL,
  type SessionResponse,
  type ShieldScanResponse,
} from "@/contracts";
import {
  B2C_PERSONAS,
  DEMO_PRESETS,
  PRIVACY_LLM_NOTICE,
  formatDateTimeVi,
  parseApiErrorMessage,
  type B2CPersonaOption,
} from "./labels";
import { ScanResultPanel } from "./ScanResultPanel";
import { TransferHoldPanel } from "./TransferHoldPanel";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function buildTextLookupPayload(userId: B2CPersonaOption["apiUserId"], rawInput: string) {
  const trimmed = rawInput.trim();
  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.includes("/") ||
    /\.(apk|example|vn|com|net|org|io|xyz)(\b|$)/i.test(trimmed);

  if (looksLikeUrl) {
    return {
      userId,
      inputType: "TEXT_LOOKUP" as const,
      url: trimmed.slice(0, 512),
      lookupText: trimmed.slice(0, 4000),
    };
  }

  if (/^[0-9A-Za-z_-]{3,64}$/.test(trimmed)) {
    return {
      userId,
      inputType: "TEXT_LOOKUP" as const,
      recipientAccount: trimmed,
    };
  }

  return {
    userId,
    inputType: "TEXT_LOOKUP" as const,
    lookupText: trimmed.slice(0, 4000),
  };
}

export function B2CShieldWorkspace() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [activePersonaKey, setActivePersonaKey] =
    useState<B2CPersonaOption["key"]>("HUNG");

  const [consentDraftChecked, setConsentDraftChecked] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentFeedback, setConsentFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lookupInput, setLookupInput] = useState("");
  const [brokenPresets, setBrokenPresets] = useState<Record<string, boolean>>({});

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResponse, setScanResponse] = useState<ShieldScanResponse | null>(null);
  const [lastPresetCode, setLastPresetCode] = useState<"CASE-01" | "CASE-02" | "CASE-03" | null>(null);

  const activePersona =
    B2C_PERSONAS.find((p) => p.key === activePersonaKey) ?? B2C_PERSONAS[0];

  const activeConsent =
    session?.consents.find((c) => c.userId === activePersona.apiUserId) ?? null;
  const savedOptIn = activeConsent?.optIn24hHold ?? false;

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/session", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as SessionResponse;
      setSession(data);
    } catch {
      // Keep current session state on transient network glitch.
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    setConsentDraftChecked(savedOptIn);
  }, [savedOptIn, activePersona.apiUserId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleSelectPersona(key: B2CPersonaOption["key"]) {
    setActivePersonaKey(key);
    setScanError(null);
    setConsentFeedback(null);
    if (key === "NEW_USER" && !lookupInput) {
      setLookupInput("990123456789");
    }
  }

  function handlePickedFile(file: File | null) {
    setScanError(null);
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setScanError("Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setScanError("Kích thước ảnh vượt quá giới hạn 5 MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function saveConsent(optInValue: boolean): Promise<boolean> {
    setConsentSaving(true);
    setConsentFeedback(null);
    try {
      const res = await fetch("/api/shield/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activePersona.apiUserId,
          optIn24hHold: optInValue,
          guardianId: optInValue ? "FAMILY_MINH" : null,
          consentVersion: "v1.0-law91-2025",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setConsentFeedback({ ok: false, text: parseApiErrorMessage(res.status, data) });
        return false;
      }
      await refreshSession();
      setConsentFeedback({
        ok: true,
        text: optInValue
          ? "Đã lưu đồng ý: Chế độ Bảo vệ 24h ĐANG BẬT và liên kết Chị Minh (FAMILY_MINH)."
          : "Đã cập nhật: Chế độ Bảo vệ 24h ĐANG TẮT (thu hồi đồng ý thành công).",
      });
      return true;
    } catch {
      setConsentFeedback({
        ok: false,
        text: "Không thể kết nối máy chủ để lưu lựa chọn Bảo vệ 24h.",
      });
      return false;
    } finally {
      setConsentSaving(false);
    }
  }

  async function handleUploadScan() {
    if (!selectedFile) {
      setScanError("Vui lòng chọn hoặc kéo thả ảnh chụp màn hình trước khi quét.");
      return;
    }
    setScanning(true);
    setScanError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("userId", activePersona.apiUserId);
      formData.append("inputType", "IMAGE");

      const res = await fetch("/api/shield/scan", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setScanError(parseApiErrorMessage(res.status, data));
        return;
      }
      setScanResponse(data as ShieldScanResponse);
      await refreshSession();
    } catch {
      setScanError("Lỗi kết nối mạng khi gửi ảnh phân tích Phút 00. Vui lòng thử lại.");
    } finally {
      setScanning(false);
    }
  }

  async function handlePresetScan(presetCode: "CASE-01" | "CASE-02" | "CASE-03") {
    setLastPresetCode(presetCode);
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch("/api/shield/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activePersona.apiUserId,
          inputType: "DEMO_PRESET",
          presetCode,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setScanError(parseApiErrorMessage(res.status, data));
        return;
      }
      setScanResponse(data as ShieldScanResponse);
      await refreshSession();
    } catch {
      setScanError("Lỗi kết nối mạng khi chạy kịch bản mẫu.");
    } finally {
      setScanning(false);
    }
  }

  async function handleLookupScan(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = lookupInput.trim();
    if (!trimmed) {
      setScanError("Vui lòng nhập số tài khoản hoặc đường dẫn cần tra cứu.");
      return;
    }
    setScanning(true);
    setScanError(null);

    try {
      const payload = buildTextLookupPayload(activePersona.apiUserId, trimmed);
      const res = await fetch("/api/shield/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setScanError(parseApiErrorMessage(res.status, data));
        return;
      }
      setScanResponse(data as ShieldScanResponse);
      await refreshSession();
    } catch {
      setScanError("Lỗi kết nối mạng khi tra cứu nhanh tài khoản / URL.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl bg-slate-50 p-4 sm:p-6">
      {/* Warm MoMo TrustLoop Header + Persona Switcher */}
      <section
        aria-labelledby="b2c-shield-title"
        className="space-y-4 rounded-2xl border border-momo-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-momo-600 text-white shadow-sm">
              <ShieldCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="b2c-shield-title" className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                  Lá chắn Phút 00 — Bảo vệ Trước Khi Chuyển Tiền
                </h1>
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {DEMO_SIMULATION_LABEL}
                </span>
              </div>
              <p className="text-sm text-slate-600 sm:text-base">
                Kiểm tra ảnh chụp tin nhắn, link <code>.apk</code> hoặc số tài khoản trước khi
                chuyển tiền — chữ lớn dễ đọc, giữ chậm minh bạch, tuyệt đối không giả danh cơ quan
                chức năng.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg border border-momo-200 bg-momo-50 px-3 py-1.5 font-semibold text-momo-800">
              Phiên: <code className="font-mono">{session?.sessionId ?? "..."}</code>
            </span>
            <Link
              href="/family"
              className="inline-flex min-h-[48px] items-center rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-momo-50 hover:text-momo-700"
            >
              Mở màn hình Người giám hộ →
            </Link>
          </div>
        </div>

        {/* B2C Persona Switcher */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Chọn vai trò trải nghiệm B2C:
          </p>
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Chuyển đổi nhân vật B2C">
            {B2C_PERSONAS.map((persona) => {
              const selected = persona.key === activePersona.key;
              return (
                <button
                  key={persona.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleSelectPersona(persona.key)}
                  className={`min-h-[56px] rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 ${
                    selected
                      ? "border-momo-600 bg-momo-50/90 text-momo-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-800 hover:border-momo-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold">{persona.shortLabel}</span>
                    <span className="rounded bg-white/90 px-2 py-0.5 font-mono text-xs font-semibold text-momo-700">
                      {persona.badgeLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{persona.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Opt-in 24h Hold Consent Card (Law 91/2025) */}
      <section
        aria-labelledby="consent-heading"
        className="rounded-2xl border border-momo-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-0.5 h-6 w-6 shrink-0 text-momo-600" aria-hidden="true" />
            <div className="space-y-1">
              <h2 id="consent-heading" className="text-lg font-bold text-slate-900">
                Chế độ Bảo vệ 24h Chủ động (Opt-in · Luật BVDLCN 91/2025)
              </h2>
              <p className="text-sm text-slate-600">
                Mặc định luôn <strong>TẮT</strong>. Khi bạn tự nguyện bật, các giao dịch rủi ro cao
                (&ge;75 điểm hoặc khớp chỉ báo cộng đồng) sẽ tạm giữ 24 giờ và chỉ gửi{" "}
                <strong>tóm tắt đã ẩn CCCD/SĐT/số dư</strong> cho người thân{" "}
                <strong>Chị Minh (FAMILY_MINH)</strong>. Bạn có quyền thu hồi bất kỳ lúc nào.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
              savedOptIn
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-300 bg-slate-100 text-slate-700"
            }`}
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            {sessionLoading
              ? "Đang kiểm tra..."
              : savedOptIn
                ? "Trạng thái: ĐANG BẬT (Chị Minh)"
                : "Trạng thái: ĐANG TẮT (Mặc định)"}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-start gap-3 text-base text-slate-900">
            <input
              type="checkbox"
              checked={consentDraftChecked}
              onChange={(e) => setConsentDraftChecked(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 text-momo-600 focus:ring-momo-500"
            />
            <span>
              <strong>Tôi tự nguyện đồng ý</strong> bật quy tắc tạm giữ xác minh 24 giờ cho giao
              dịch rủi ro cao và liên kết người thân giám hộ <strong>Chị Minh (FAMILY_MINH)</strong>
              {activeConsent?.consentedAt && savedOptIn ? (
                <span className="mt-0.5 block text-xs text-slate-500">
                  Cập nhật gần nhất: {formatDateTimeVi(activeConsent.consentedAt)} (
                  {activeConsent.consentVersion})
                </span>
              ) : null}
            </span>
          </label>

          <button
            type="button"
            disabled={consentSaving}
            onClick={() => void saveConsent(consentDraftChecked)}
            className="min-h-[48px] shrink-0 rounded-lg bg-momo-600 px-5 py-2.5 text-base font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
          >
            {consentSaving
              ? "Đang lưu..."
              : consentDraftChecked
                ? "Xác nhận Bật Bảo vệ 24h"
                : savedOptIn
                  ? "Thu hồi / Tắt Bảo vệ 24h"
                  : "Lưu trạng thái TẮT"}
          </button>
        </div>

        {consentFeedback && (
          <p
            role={consentFeedback.ok ? "status" : "alert"}
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium ${
              consentFeedback.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {consentFeedback.ok ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            )}
            {consentFeedback.text}
          </p>
        )}
      </section>

      {/* Minute-00 Scanner Card */}
      <section
        aria-labelledby="scanner-heading"
        className="space-y-5 rounded-2xl border border-momo-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-momo-600" aria-hidden="true" />
            <div>
              <h2 id="scanner-heading" className="text-lg font-bold text-slate-900">
                Máy quét Phút 00 — Kiểm tra Ảnh Chat, Link .APK &amp; Số Tài khoản
              </h2>
              <p className="text-sm text-slate-600">
                Tầng 1 tra Kho Miễn dịch trước, Tầng 2 phân tích AI đa phương thức &amp; ẩn PII tự
                động.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Privacy & LLM Data Notice */}
        <div
          role="note"
          className="rounded-xl border border-momo-200 bg-momo-50/80 p-4 text-sm leading-relaxed text-momo-900"
        >
          {PRIVACY_LLM_NOTICE}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Real File Upload + Drag & Drop */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-base font-bold text-slate-900">
              1. Tải ảnh chụp màn hình thật (JPG / PNG / WEBP · tối đa 5 MB)
            </h3>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handlePickedFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 text-center transition ${
                isDragging
                  ? "border-momo-600 bg-momo-50"
                  : "border-slate-300 bg-white hover:border-momo-400"
              }`}
            >
              <Upload className="h-8 w-8 text-momo-600" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Kéo thả ảnh vào đây hoặc chọn tệp từ thiết bị
                </p>
                <p className="text-xs text-slate-500">
                  Ảnh chỉ xử lý trong bộ nhớ cho phiên hiện tại, không lưu ảnh gốc vào CSDL.
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Chọn ảnh chụp màn hình để phân tích"
                onChange={(e) => handlePickedFile(e.target.files?.[0] ?? null)}
                className="block w-full max-w-xs text-sm text-slate-700 file:mr-3 file:min-h-[40px] file:cursor-pointer file:rounded-lg file:border-0 file:bg-momo-100 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-momo-800 hover:file:bg-momo-200"
              />
            </div>

            {previewUrl && selectedFile && (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Xem trước ảnh tải lên"
                  className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-bold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type}
                  </p>
                  <button
                    type="button"
                    disabled={scanning}
                    onClick={() => void handleUploadScan()}
                    className="mt-1 min-h-[48px] rounded-lg bg-momo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-momo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
                  >
                    {scanning ? "Đang phân tích Phút 00..." : "Quét ảnh vừa tải lên"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3 One-Click Demo Presets + Quick Account/URL Lookup */}
          <div className="space-y-4">
            <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h3 className="text-base font-bold text-slate-900">
                2. Chạy nhanh 3 Kịch bản {DEMO_SIMULATION_LABEL} (1 chạm)
              </h3>
              <div className="space-y-2">
                {DEMO_PRESETS.map((preset) => {
                  const imgBroken = Boolean(brokenPresets[preset.code]);
                  return (
                    <button
                      key={preset.code}
                      type="button"
                      disabled={scanning}
                      onClick={() => void handlePresetScan(preset.code)}
                      className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-momo-400 hover:bg-momo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
                    >
                      {imgBroken ? (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-momo-100 text-momo-700">
                          <ImageIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={preset.imagePath}
                          alt={preset.label}
                          onError={() =>
                            setBrokenPresets((prev) => ({ ...prev, [preset.code]: true }))
                          }
                          className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{preset.label}</p>
                        <p className="truncate text-xs text-slate-600">{preset.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Account / URL Lookup Bar */}
            <form
              onSubmit={(e) => void handleLookupScan(e)}
              className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <h3 className="text-base font-bold text-slate-900">
                3. Tra cứu nhanh Số tài khoản / Link nghi vấn
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="Nhập STK (vd: 990123456789) hoặc URL .apk..."
                  aria-label="Số tài khoản hoặc đường dẫn cần tra cứu"
                  className="min-h-[48px] flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500"
                />
                <button
                  type="submit"
                  disabled={scanning}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-momo-500 disabled:opacity-60"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {scanning ? "Đang tra..." : "Kiểm tra ngay"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">Điền nhanh:</span>
                <button
                  type="button"
                  onClick={() => setLookupInput("990123456789")}
                  className="inline-flex min-h-[48px] items-center rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono font-semibold text-slate-800 hover:bg-momo-50"
                >
                  990123456789
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLookupInput("https://dichvucong-xacminh-hoso.example/capnhat.apk")
                  }
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-slate-800 hover:bg-momo-50"
                >
                  dichvucong-xacminh-hoso.example/capnhat.apk
                </button>
              </div>
            </form>
          </div>
        </div>

        {scanning && (
          <div
            role="status"
            className="rounded-xl border border-momo-200 bg-momo-50 px-4 py-3 text-base font-semibold text-momo-900"
          >
            Đang đối chiếu Kho Miễn dịch Tầng 1 và phân tích nội dung Phút 00...
          </div>
        )}

        {scanError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-900 sm:text-base"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            <span>{scanError}</span>
          </div>
        )}
      </section>

      {scanResponse && (
        <ScanResultPanel
          scan={scanResponse}
          activeUserId={activePersona.apiUserId}
          onRunLive={lastPresetCode && !scanning ? () => void handlePresetScan(lastPresetCode) : undefined}
          onCyberReported={() => {
            void refreshSession();
          }}
        />
      )}

      <TransferHoldPanel
        activeUserId={activePersona.apiUserId}
        senderLabel={activePersona.senderLabel}
        optIn24hHold={savedOptIn}
        latestScan={scanResponse}
        holds={session?.holds ?? []}
        onEnableOptInNow={() => saveConsent(true)}
        onHoldsChanged={refreshSession}
      />
    </div>
  );
}
