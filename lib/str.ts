import type { CskhEmpatheticCard } from "@/contracts";
import { addWorkingDays } from "@/lib/working-days";

/**
 * Ticket #7 — suspicious-transaction report (STR) after a Kết luận rủi ro cao.
 * Luật PCRT Điều 26 & 37.2: within 01 working day of detection, and no later than 03 working days
 * after the transaction occurred; Điều 37.3: within 24 hours when there are signs of a crime.
 * The earliest applicable limit is the deadline.
 */
export type StrDeadlineBasis = "DETECTED_1_WORKING_DAY" | "OCCURRED_3_WORKING_DAYS" | "CRIMINAL_24_HOURS";

export const STR_BASIS_VI: Record<StrDeadlineBasis, string> = {
  DETECTED_1_WORKING_DAY: "01 ngày làm việc kể từ khi phát hiện (Luật PCRT Điều 26, 37.2)",
  OCCURRED_3_WORKING_DAYS: "03 ngày làm việc kể từ khi phát sinh giao dịch (Luật PCRT Điều 26, 37.2)",
  CRIMINAL_24_HOURS: "24 giờ vì có dấu hiệu liên quan tội phạm (Luật PCRT Điều 37.3)",
};

export function computeStrDeadline(input: { detectedAt: Date; occurredAt: Date; criminalSigns: boolean }) {
  const candidates: { basis: StrDeadlineBasis; at: Date }[] = [
    { basis: "DETECTED_1_WORKING_DAY", at: addWorkingDays(input.detectedAt, 1) },
    { basis: "OCCURRED_3_WORKING_DAYS", at: addWorkingDays(input.occurredAt, 3) },
  ];
  if (input.criminalSigns) {
    candidates.push({ basis: "CRIMINAL_24_HOURS", at: new Date(input.detectedAt.getTime() + 24 * 60 * 60 * 1000) });
  }
  // on a tie the more specific basis (listed later: crime > occurrence > detection) is reported
  const earliest = candidates.reduce((a, b) => (b.at.getTime() <= a.at.getTime() ? b : a));
  return {
    deadline: earliest.at,
    basis: earliest.basis,
    isOverdue: (now: Date) => now.getTime() > earliest.at.getTime(),
  };
}

// Điều 40.2: nothing shown to the customer or CSKH may reveal that a report was (or will be) filed.
const REPORTING_PATTERN =
  /báo cáo (giao dịch )?(đáng ngờ|lên|cho|tới) ?(nhnn|ngân hàng nhà nước|cơ quan|cục)?|giao dịch đáng ngờ|cục phòng,? chống rửa tiền|\bSTR\b|đã báo cáo|rửa tiền/i;

export function mentionsReporting(text: string): boolean {
  return REPORTING_PATTERN.test(text);
}

const NO_TIPPING_OFF_RULE_VI = "Không nhắc tới việc báo cáo cơ quan chức năng hay báo cáo giao dịch đáng ngờ (Luật PCRT Điều 40.2).";

/** Removes anything that reveals reporting from the CSKH card and reminds agents of the rule. */
export function scrubTippingOff(card: CskhEmpatheticCard): CskhEmpatheticCard {
  const openers = card.empathetic_openers_vi.filter((line) => !mentionsReporting(line));
  return {
    ...card,
    funds_status_vi: mentionsReporting(card.funds_status_vi)
      ? "Giao dịch đang được xử lý an toàn; tiền chưa rời ví của khách hàng."
      : card.funds_status_vi,
    empathetic_openers_vi: openers.length > 0 ? openers : ["Bác/anh/chị yên tâm, bên em đang hỗ trợ kiểm tra giao dịch."],
    do_not_say_vi: card.do_not_say_vi.includes(NO_TIPPING_OFF_RULE_VI)
      ? card.do_not_say_vi
      : [...card.do_not_say_vi, NO_TIPPING_OFF_RULE_VI],
  };
}
