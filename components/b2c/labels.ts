import {
  type CyberThreatType,
  type HeldTxStatus,
  type PersonaId,
  type PsychCueType,
  type RiskLevel,
  type ScamCategory,
} from "@/contracts";

export const PRIVACY_LLM_NOTICE =
  "Lưu ý quyền riêng tư: Ảnh tải lên được gửi tới nhà cung cấp LLM đang cấu hình (Gemini API / AWS Bedrock) để phân tích và sẽ bị xóa sau phiên/vài giờ (không lưu ảnh gốc trong CSDL, không chuyển ảnh sang Family/B2E). Khi chạy trên gói Gemini API miễn phí, vui lòng không tải ảnh chứa CCCD/giấy tờ/sao kê thật." as const;

export interface B2CPersonaOption {
  key: "HUNG" | "MINH_ANH" | "NEW_USER";
  apiUserId: PersonaId;
  shortLabel: string;
  badgeLabel: string;
  senderLabel: string;
  description: string;
}

// shortcut: Minh Anh shares USER_B2C_NEW consent slot in frozen PersonaId enum, expand enum if separate consent row is needed
export const B2C_PERSONAS: readonly B2CPersonaOption[] = [
  {
    key: "HUNG",
    apiUserId: "USER_B2C_HUNG",
    shortLabel: "Bác Hùng (62t)",
    badgeLabel: "USER_B2C_HUNG",
    senderLabel: "Bác Hùng (62 tuổi)",
    description: "Tình huống chính: Zalo giả cán bộ điều tra, thúc ép chuyển 4×9,5 triệu.",
  },
  {
    key: "MINH_ANH",
    apiUserId: "USER_B2C_NEW",
    shortLabel: "Minh Anh (21t)",
    badgeLabel: "CASE-02",
    senderLabel: "Minh Anh (21 tuổi — Mô phỏng)",
    description: "Tình huống an ninh mạng: tin nhắn giả shipper/dịch vụ công chứa link .apk.",
  },
  {
    key: "NEW_USER",
    apiUserId: "USER_B2C_NEW",
    shortLabel: "Người dùng mới",
    badgeLabel: "USER_B2C_NEW · Kiểm chứng Miễn dịch",
    senderLabel: "Người dùng mới (Mô phỏng)",
    description: "Kiểm chứng vòng lặp Miễn dịch Cộng đồng khi tra cứu TK/URL vừa bị cảnh báo.",
  },
] as const;

export interface DemoPresetOption {
  code: "CASE-01" | "CASE-02" | "CASE-03";
  label: string;
  imagePath: string;
  hint: string;
}

export const DEMO_PRESETS: readonly DemoPresetOption[] = [
  {
    code: "CASE-01",
    label: "CASE-01: Zalo giả Công an — Bác Hùng",
    imagePath: "/demo-images/zalo-fake-police.png",
    hint: "Ảnh chat đòi chuyển 4×9,5M sang TK 990123456789",
  },
  {
    code: "CASE-02",
    label: "CASE-02: Shipper/APK — Minh Anh",
    imagePath: "/demo-images/shipper-apk.png",
    hint: "Link .apk & hướng dẫn bật Accessibility Services",
  },
  {
    code: "CASE-03",
    label: "CASE-03: Tiểu thương Livestream — Chị Hoa",
    imagePath: "/demo-images/livestream-merchant.png",
    hint: "Ảnh đơn hàng bán livestream hợp lệ (kiểm chứng chống chặn oan)",
  },
] as const;

export const RISK_LEVEL_META: Record<
  RiskLevel,
  { labelVi: string; badgeClass: string; barClass: string; borderClass: string }
> = {
  LOW: {
    labelVi: "THẤP",
    badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
    barClass: "bg-emerald-600",
    borderClass: "border-emerald-200",
  },
  MEDIUM: {
    labelVi: "TRUNG BÌNH",
    badgeClass: "border-amber-300 bg-amber-50 text-amber-900",
    barClass: "bg-amber-500",
    borderClass: "border-amber-200",
  },
  HIGH: {
    labelVi: "CAO",
    badgeClass: "border-red-200 bg-red-50 text-red-800",
    barClass: "bg-red-500",
    borderClass: "border-red-200",
  },
  CRITICAL: {
    labelVi: "NGHIÊM TRỌNG",
    badgeClass: "border-red-300 bg-red-50 text-red-900",
    barClass: "bg-red-600",
    borderClass: "border-red-300",
  },
};

export const SCAM_CATEGORY_VI: Record<ScamCategory, string> = {
  POLICE_IMPERSONATION: "Giả danh cơ quan chức năng",
  APK_MALWARE_BAIT: "Dụ cài file .APK độc hại",
  BANK_IMPERSONATION: "Giả danh ngân hàng / CSKH",
  INVESTMENT_SCAM: "Dụ đầu tư / việc nhẹ lương cao",
  SOCIAL_ENGINEERING: "Thao túng tâm lý chuyển tiền",
  LEGITIMATE: "Giao dịch bình thường / Hợp lệ",
  OTHER: "Dấu hiệu bất thường khác",
};

export const PSYCH_CUE_META: Record<
  PsychCueType,
  { labelVi: string; descriptionVi: string }
> = {
  FEAR_THREAT: {
    labelVi: "Gây sợ hãi / Đe dọa",
    descriptionVi: "Dọa khởi tố, phong tỏa tài khoản hoặc phạt nặng",
  },
  URGENCY_PRESSURE: {
    labelVi: "Thúc ép khẩn cấp",
    descriptionVi: "Ép chuyển tiền ngay trong 15–30 phút không kịp kiểm chứng",
  },
  SECRECY_ISOLATION: {
    labelVi: "Cô lập người thân",
    descriptionVi: "Cấm kể với gia đình, con cái hoặc nhân viên ngân hàng",
  },
  APK_PHISHING_BAIT: {
    labelVi: "Dụ cài APK / Chiếm quyền",
    descriptionVi: "Dụ tải file .apk ngoài kho và bật Accessibility Services",
  },
};

export const CYBER_THREAT_VI: Record<CyberThreatType, string> = {
  APK_ACCESSIBILITY_BAIT: "Cài đặt .APK & lạm dụng Accessibility Services",
  SUSPICIOUS_URL: "Đường dẫn web đáng ngờ",
  FAKE_GOV_DOMAIN: "Tên miền giả mạo dịch vụ công",
  REMOTE_CONTROL_APP: "Ứng dụng điều khiển thiết bị từ xa",
  CREDENTIAL_PHISHING: "Trang đánh cắp thông tin đăng nhập / OTP",
};

export const TX_STATUS_META: Record<
  HeldTxStatus,
  { labelVi: string; badgeClass: string }
> = {
  COMPLETED: {
    labelVi: "Đã hoàn tất (Mô phỏng)",
    badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  ON_HOLD_24H: {
    labelVi: "Đang tạm giữ bảo mật 24h",
    badgeClass: "border-amber-300 bg-amber-50 text-amber-900",
  },
  ESCALATED_TO_B2E: {
    labelVi: "Đã chuyển MoMo Risk (War-Room)",
    badgeClass: "border-momo-300 bg-momo-50 text-momo-800",
  },
  CANCELLED_BY_USER: {
    labelVi: "Đã hủy — Hoàn tiền về ví",
    badgeClass: "border-slate-300 bg-slate-100 text-slate-800",
  },
  CANCELLED_BY_B2E: {
    labelVi: "Đã hủy sau xác minh bảo mật — Tiền vẫn trong ví",
    badgeClass: "border-slate-300 bg-slate-100 text-slate-800",
  },
  RELEASED: {
    labelVi: "Đã giải tỏa xác minh",
    badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
};

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(amount))} đ`;
}

export function formatDateTimeVi(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function parseApiErrorMessage(status: number, body: unknown): string {
  const errObj =
    body && typeof body === "object"
      ? (body as { code?: unknown; error?: unknown })
      : null;
  const code = typeof errObj?.code === "string" ? errObj.code : "";
  const message = typeof errObj?.error === "string" ? errObj.error : "";

  if (status === 503 && code === "LLM_NOT_CONFIGURED") {
    return "Chưa cấu hình API Key cho nhà cung cấp AI (GEMINI_API_KEY / OPENAI_API_KEY / AWS Bedrock) trong .env. Hệ thống luôn trung thực và không tự bịa kết quả AI.";
  }
  if (status === 429) {
    return "Phiên của bạn vừa gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng đợi vài giây rồi thử lại.";
  }
  if (message) return message;
  return `Yêu cầu không thành công (HTTP ${status}). Vui lòng thử lại.`;
}
