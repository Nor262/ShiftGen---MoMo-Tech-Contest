import { DEMO_SIMULATION_LABEL, type HeldTxStatus, type RiskLevel, type ScanResult } from "@/contracts";
import { redactText } from "@/lib/pii/redactor";

/**
 * Ticket #8: how to report to the police, and an evidence pack to take along.
 * Legal basis (docs/RESEARCH_LEGAL.md, "Luật thành tính năng" #1): BLTTHS Điều 144.4, 145.1, 145.4,
 * 146.3 (sửa bởi Luật 99/2025), 147.1. No hotline is printed: none has an official source yet.
 */
export const POLICE_GUIDE = {
  title: "Bạn có thể trình báo với công an",
  steps: [
    "Đến Công an xã/phường hoặc Đồn Công an gần nhất. Nơi đây có trách nhiệm tiếp nhận tố giác và không được từ chối tiếp nhận.",
    "Bạn có thể trình báo bằng lời hoặc bằng văn bản. Mang theo giấy tờ tùy thân của chính bạn, điện thoại có tin nhắn, và gói bằng chứng tải ở dưới.",
    "Kể lại theo thứ tự: bạn nhận tin nhắn lúc nào, kẻ gian yêu cầu gì, bạn đã hoặc định chuyển bao nhiêu tiền, tới tài khoản nào.",
  ],
  rights: [
    "Cơ quan điều tra phải ra quyết định trong 20 ngày (vụ phức tạp có thể lâu hơn).",
    "Bạn có quyền được thông báo kết quả giải quyết.",
  ],
  secondScamWarning:
    "Cẩn thận lừa đảo lần hai: không ai được thu phí để \"giúp lấy lại tiền\". Người tự xưng công an, luật sư hay ngân hàng hứa lấy lại tiền qua điện thoại là dấu hiệu lừa đảo.",
} as const;

export function shouldOfferPoliceGuide(input: { riskLevel?: RiskLevel; txStatus?: HeldTxStatus }): boolean {
  return (
    input.riskLevel === "HIGH" ||
    input.riskLevel === "CRITICAL" ||
    input.txStatus === "CANCELLED_BY_USER" ||
    input.txStatus === "CANCELLED_BY_B2E"
  );
}

const TX_STATUS_VI: Partial<Record<HeldTxStatus, string>> = {
  ON_HOLD_24H: "Giao dịch đang được tạm giữ, tiền chưa rời ví.",
  ESCALATED_TO_B2E: "Giao dịch đang tạm giữ và đã chuyển cho đội Risk xem xét.",
  CANCELLED_BY_USER: "Bạn đã tự hủy giao dịch, tiền vẫn ở trong ví.",
  CANCELLED_BY_B2E: "Đội Risk đã hủy giao dịch, tiền vẫn ở trong ví.",
};

const mask = (account: string) => `•••• ${account.replace(/\D/g, "").slice(-4)}`;

/** Plain-text evidence pack: analysis only (no image, no raw message), PII-redacted, labelled. */
export function buildEvidencePack(input: {
  result: ScanResult;
  modelUsed: string;
  scannedAt: string;
  txStatus?: HeldTxStatus;
}): string {
  const { result } = input;
  const e = result.extracted_entities;
  const lines = [
    `GÓI BẰNG CHỨNG — ${DEMO_SIMULATION_LABEL}`,
    `Kết quả do AI tạo (model ${input.modelUsed}); cần người thật kiểm tra lại.`,
    `Thời điểm phân tích: ${input.scannedAt}`,
    "",
    `Mức rủi ro: ${result.risk_level} (${result.risk_score}/100)`,
    `Loại lừa đảo nghi ngờ: ${result.scam_category}`,
    e.recipient_account ? `Tài khoản nhận (đã che): ${mask(e.recipient_account)}` : null,
    e.amount_vnd ? `Số tiền được yêu cầu: ${e.amount_vnd.toLocaleString("vi-VN")}đ` : null,
    input.txStatus && TX_STATUS_VI[input.txStatus] ? `Tình trạng giao dịch: ${TX_STATUS_VI[input.txStatus]}` : null,
    "",
    "Dấu hiệu thao túng tâm lý:",
    ...result.psych_manipulation_cues.map((c) => `- ${c.explanation_vi} (trích: "${c.quote_vi}")`),
    ...(result.visual_tampering_flags.length ? ["", "Dấu hiệu giả mạo trên ảnh:"] : []),
    ...result.visual_tampering_flags.map((f) => `- ${f}`),
    ...(e.urls.length ? ["", "Đường link trong tin nhắn:", ...e.urls.map((u) => `- ${u}`)] : []),
    "",
    "Gói này không chứa ảnh gốc hay số giấy tờ, số điện thoại của bạn.",
  ].filter((l): l is string => l !== null);
  // defence in depth: whatever slipped into the AI text is redacted before it leaves the device
  return redactText(lines.join("\n")).redacted;
}
