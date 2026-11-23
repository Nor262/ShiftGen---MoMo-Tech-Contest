import {
  type CaseStatus,
  type CyberThreatType,
  type DebateRecommendation,
  type GraphNodeType,
  type ImmunityIndicatorType,
  type PsychCueType,
  type ScamCategory,
} from "@/contracts";

export const CASE_STATUS_META: Record<
  CaseStatus,
  { labelVi: string; badgeClass: string }
> = {
  OPEN: {
    labelVi: "Chờ điều tra",
    badgeClass: "border-sky-500/40 bg-sky-500/15 text-sky-200",
  },
  INVESTIGATING: {
    labelVi: "Đang điều tra",
    badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  },
  PENDING_DECISION: {
    labelVi: "Chờ Maker quyết định",
    badgeClass: "border-momo-400/50 bg-momo-500/20 text-momo-200",
  },
  IMMUNITY_PROPOSED: {
    labelVi: "Đã đề xuất Miễn dịch",
    badgeClass: "border-red-500/40 bg-red-500/15 text-red-200",
  },
  DISMISSED_FP: {
    labelVi: "Đã đóng (Cảnh báo giả)",
    badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  },
  CLOSED: {
    labelVi: "Đã đóng hồ sơ",
    badgeClass: "border-slate-600 bg-slate-800 text-slate-300",
  },
};

export const NODE_TYPE_META: Record<
  GraphNodeType,
  { labelVi: string; shortCode: string }
> = {
  VICTIM: { labelVi: "Nạn nhân", shortCode: "VICTIM" },
  MULE: { labelVi: "Ví Mule nghi vấn", shortCode: "MULE" },
  SCAMMER: { labelVi: "Kẻ gian / Độc hại", shortCode: "SCAMMER" },
  MERCHANT: { labelVi: "Tiểu thương", shortCode: "MERCHANT" },
  DEVICE: { labelVi: "Thiết bị", shortCode: "DEVICE" },
  IP: { labelVi: "Địa chỉ IP", shortCode: "IP" },
  BANK_ACCOUNT: { labelVi: "Tài khoản / Cụm KH", shortCode: "BANK" },
};

export const INDICATOR_TYPE_LABELS: Record<ImmunityIndicatorType, string> = {
  BANK_ACCOUNT: "Tài khoản ngân hàng / Ví (BANK_ACCOUNT)",
  URL_DOMAIN: "Tên miền / Đường dẫn (URL_DOMAIN)",
  APK_HASH: "Mã băm tệp APK (APK_HASH)",
  PHONE_NUMBER: "Số điện thoại (PHONE_NUMBER)",
  DEVICE_ID: "Mã thiết bị (DEVICE_ID)",
};

export const RECOMMENDATION_META: Record<
  DebateRecommendation,
  { labelVi: string; badgeClass: string }
> = {
  RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY: {
    labelVi: "Đề xuất Giữ chậm & Đưa vào Miễn dịch",
    badgeClass: "border-red-500/50 bg-red-500/20 text-red-200",
  },
  RECOMMEND_DISMISS_FP: {
    labelVi: "Đề xuất Minh oan (Khách hàng thật)",
    badgeClass: "border-emerald-500/50 bg-emerald-500/20 text-emerald-200",
  },
  NEED_MORE_EVIDENCE: {
    labelVi: "Cần bổ sung bằng chứng (Chưa đủ kết luận)",
    badgeClass: "border-amber-500/50 bg-amber-500/20 text-amber-200",
  },
};

export const ANXIETY_LEVEL_META: Record<
  "LOW" | "MEDIUM" | "HIGH",
  { labelVi: string; badgeClass: string }
> = {
  LOW: {
    labelVi: "Lo âu thấp",
    badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
  },
  MEDIUM: {
    labelVi: "Lo âu trung bình",
    badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-200",
  },
  HIGH: {
    labelVi: "Lo âu cao — Cần trấn an ngay",
    badgeClass: "border-red-500/40 bg-red-500/15 text-red-200",
  },
};

export const SCAM_CATEGORY_VI: Record<ScamCategory, string> = {
  POLICE_IMPERSONATION: "Giả danh cơ quan chức năng",
  APK_MALWARE_BAIT: "Dụ cài tệp .APK độc hại",
  BANK_IMPERSONATION: "Giả danh ngân hàng / CSKH",
  INVESTMENT_SCAM: "Dụ đầu tư / việc nhẹ lương cao",
  SOCIAL_ENGINEERING: "Thao túng tâm lý chuyển tiền",
  LEGITIMATE: "Giao dịch bình thường / Hợp lệ",
  OTHER: "Dấu hiệu bất thường khác",
};

export const PSYCH_CUE_VI: Record<PsychCueType, string> = {
  FEAR_THREAT: "Gây sợ hãi / Đe dọa",
  URGENCY_PRESSURE: "Thúc ép khẩn cấp",
  SECRECY_ISOLATION: "Cô lập người thân",
  APK_PHISHING_BAIT: "Dụ cài APK / Chiếm quyền",
};

export const CYBER_THREAT_VI: Record<CyberThreatType, string> = {
  APK_ACCESSIBILITY_BAIT: "Cài .APK & bật Accessibility",
  SUSPICIOUS_URL: "Đường dẫn đáng ngờ",
  FAKE_GOV_DOMAIN: "Tên miền giả dịch vụ công",
  REMOTE_CONTROL_APP: "Ứng dụng điều khiển từ xa",
  CREDENTIAL_PHISHING: "Đánh cắp đăng nhập / OTP",
};

export const METADATA_KEY_LABELS: Record<string, string> = {
  simulationLabel: "Nhãn mô phỏng",
  persona: "Persona",
  accountNumber: "Số tài khoản",
  accountAgeDays: "Tuổi tài khoản (ngày)",
  sharedDevice: "Thiết bị dùng chung",
  sharedIp: "IP dùng chung",
  simoFlagSimulated: "Cờ SIMO (Mô phỏng)",
  cleanHistoryMonths: "Lịch sử sạch (tháng)",
  complaints: "Số khiếu nại",
  livestreamWindow: "Khung giờ livestream",
  buyerCount: "Số khách trong cụm",
  url: "Đường dẫn nghi vấn",
  threat: "Dấu hiệu an ninh mạng",
  accessibilityRisk: "Nguy cơ Accessibility",
};

export function formatMetadataValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") return new Intl.NumberFormat("vi-VN").format(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(amount))} đ`;
}

export function formatDateTimeVi(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function parseWarRoomApiError(status: number, body: unknown): string {
  const errObj =
    body && typeof body === "object"
      ? (body as { code?: unknown; error?: unknown; message?: unknown })
      : null;
  const code = typeof errObj?.code === "string" ? errObj.code : "";
  const message =
    typeof errObj?.error === "string"
      ? errObj.error
      : typeof errObj?.message === "string"
        ? errObj.message
        : "";

  if (status === 503 && code === "LLM_NOT_CONFIGURED") {
    return "Chưa cấu hình API Key cho nhà cung cấp AI (GEMINI_API_KEY / OPENAI_API_KEY / AWS Bedrock) trong .env. Hệ thống luôn trung thực và không tự bịa kết quả AI.";
  }
  if (status === 429) {
    return "Phiên của bạn vừa gửi quá nhiều yêu cầu. Vui lòng đợi vài giây rồi thử lại.";
  }
  if (status === 404) {
    return message || "Không tìm thấy hồ sơ hoặc API War-Room chưa sẵn sàng.";
  }
  if (message) return message;
  return `Yêu cầu thất bại (HTTP ${status}). Vui lòng thử lại.`;
}
