import {
  PiiDiffSchema,
  SanitizedEvidenceSchema,
  type PiiDiff,
  type PiiFieldType,
  type PiiRedactionItem,
  type SanitizedEvidence,
  type ScanResult,
} from "@/contracts";

export const CCCD_TOKEN = "[CCCD_ĐÃ_ẨN]" as const;
export const PHONE_TOKEN = "[SĐT_ĐÃ_ẨN]" as const;
export const BALANCE_TOKEN = "[SỐ_DƯ_ĐÃ_ẨN]" as const;
export const SPENDING_TOKEN = "[LỊCH_SỬ_CHI_TIÊU_ĐÃ_ẨN]" as const;

const URL_REGEX = /https?:\/\/[^\s<>"'`]+/gi;
const LABELED_CCCD_REGEX =
  /((?:cccd|cmnd|căn\s*cước(?:\s+công\s+dân)?)\s*[:#-]?\s*)(\d{9,12})\b/gi;
const BARE_CCCD_REGEX = /\b(0\d{11})\b/g;
const PHONE_REGEX = /(?<!\d)((?:\+?84|0)[\s.-]?(?:3|5|7|8|9)(?:[\s.-]?\d){8})\b/g;
const LABELED_PHONE_REGEX =
  /((?:sđt|sdt|số\s+điện\s+thoại|điện\s+thoại|hotline\s+cá\s+nhân)\s*[:#-]?\s*)(\+?\d[\d\s.-]{7,13}\d)\b/gi;
const LABELED_BALANCE_REGEX =
  /((?:số\s+dư(?:\s+ví|\s+khả\s+dụng|\s+tài\s+khoản)?|balance|ví\s+hiện\s+có|tổng\s+số\s+dư)\s*[:=-]?\s*)(\d{1,3}(?:[.,]\d{3})+(?:\s*(?:vnđ|vnd|đ|₫))?|\d+(?:[.,]\d+)?\s*(?:triệu|tr|tỷ|k|vnđ|vnd|đ|₫)|\d{4,})/gi;
const SPENDING_HISTORY_REGEX =
  /((?:lịch\s+sử\s+(?:chi\s+tiêu|giao\s+dịch)|chi\s+tiêu\s+gần\s+đây|spending\s+history)\s*[:=-]?\s*)([^\n.;]{3,240})/gi;

const ACCOUNT_CONTEXT_LOOKBEHIND_REGEX =
  /(?:stk|số\s+tài\s+khoản|tài\s+khoản|tk|chuyển\s+vào|account)\s*[:#-]?\s*$/i;

const UNTRUSTED_TAG_REGEX = /<\/?\s*untrusted_user_content\s*>/gi;

interface RedactionHit {
  fieldType: PiiFieldType;
  token: string;
  masked: string;
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function maskOriginal(fieldType: PiiFieldType, raw: string): string {
  const digits = normalizeDigits(raw);
  if (fieldType === "CCCD") {
    return digits.length >= 6
      ? `${digits.slice(0, 3)}${"*".repeat(Math.max(3, digits.length - 6))}${digits.slice(-3)}`
      : "***";
  }
  if (fieldType === "PHONE") {
    return digits.length >= 6 ? `${digits.slice(0, 3)}****${digits.slice(-3)}` : "***";
  }
  if (fieldType === "BALANCE") {
    return "***đ";
  }
  return "[đã lược bỏ]";
}

export function escapeUntrustedTags(text: string): string {
  return text.replace(UNTRUSTED_TAG_REGEX, (tag) =>
    tag.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
  );
}

export function wrapUntrustedUserContent(text: string): string {
  return `<untrusted_user_content>\n${escapeUntrustedTags(text)}\n</untrusted_user_content>`;
}

export interface RedactTextResult {
  redacted: string;
  hits: RedactionHit[];
}

export function redactText(
  input: string,
  options?: { preserveAccounts?: string[] },
): RedactTextResult {
  if (!input) {
    return { redacted: input, hits: [] };
  }

  const preserveSet = new Set(
    (options?.preserveAccounts ?? [])
      .map((a) => normalizeDigits(a))
      .filter((a) => a.length >= 6),
  );

  // Protect URLs so numeric segments inside suspicious links are never corrupted.
  const urlPlaceholders: string[] = [];
  let working = input.replace(URL_REGEX, (url) => {
    const idx = urlPlaceholders.length;
    urlPlaceholders.push(url);
    return `__URL_KEEP_${idx}__`;
  });

  const hits: RedactionHit[] = [];

  // 1. Spending history clauses
  working = working.replace(SPENDING_HISTORY_REGEX, (_full, prefix: string, body: string) => {
    hits.push({
      fieldType: "SPENDING_HISTORY",
      token: SPENDING_TOKEN,
      masked: maskOriginal("SPENDING_HISTORY", body),
    });
    return `${prefix}${SPENDING_TOKEN}`;
  });

  // 2. Labeled wallet balances
  working = working.replace(LABELED_BALANCE_REGEX, (_full, prefix: string, amount: string) => {
    hits.push({
      fieldType: "BALANCE",
      token: BALANCE_TOKEN,
      masked: maskOriginal("BALANCE", amount),
    });
    return `${prefix}${BALANCE_TOKEN}`;
  });

  // 3. Labeled CCCD/CMND
  working = working.replace(LABELED_CCCD_REGEX, (full, prefix: string, digits: string) => {
    if (preserveSet.has(normalizeDigits(digits))) {
      return full;
    }
    hits.push({
      fieldType: "CCCD",
      token: CCCD_TOKEN,
      masked: maskOriginal("CCCD", digits),
    });
    return `${prefix}${CCCD_TOKEN}`;
  });

  // 4. Unlabeled 12-digit Vietnamese CCCD (always starts with 0) unless explicitly a suspect bank account
  working = working.replace(BARE_CCCD_REGEX, (full, digits: string, offset: number, src: string) => {
    if (preserveSet.has(digits)) {
      return full;
    }
    const before = src.slice(Math.max(0, offset - 32), offset);
    if (ACCOUNT_CONTEXT_LOOKBEHIND_REGEX.test(before)) {
      return full;
    }
    hits.push({
      fieldType: "CCCD",
      token: CCCD_TOKEN,
      masked: maskOriginal("CCCD", digits),
    });
    return CCCD_TOKEN;
  });

  // 5. Labeled phone numbers
  working = working.replace(LABELED_PHONE_REGEX, (full, prefix: string, phone: string) => {
    if (preserveSet.has(normalizeDigits(phone))) {
      return full;
    }
    hits.push({
      fieldType: "PHONE",
      token: PHONE_TOKEN,
      masked: maskOriginal("PHONE", phone),
    });
    return `${prefix}${PHONE_TOKEN}`;
  });

  // 6. Unlabeled Vietnamese mobile phone numbers
  working = working.replace(PHONE_REGEX, (full, phone: string, offset: number, src: string) => {
    const normalized = normalizeDigits(phone);
    if (preserveSet.has(normalized)) {
      return full;
    }
    const before = src.slice(Math.max(0, offset - 32), offset);
    if (ACCOUNT_CONTEXT_LOOKBEHIND_REGEX.test(before)) {
      return full;
    }
    hits.push({
      fieldType: "PHONE",
      token: PHONE_TOKEN,
      masked: maskOriginal("PHONE", phone),
    });
    return PHONE_TOKEN;
  });

  // Restore protected URLs verbatim.
  working = working.replace(/__URL_KEEP_(\d+)__/g, (_m, idxStr: string) => {
    const idx = Number.parseInt(idxStr, 10);
    return urlPlaceholders[idx] ?? "";
  });

  return { redacted: working, hits };
}

export function sanitizeInputForLlm(
  rawText: string,
  preserveAccounts?: string[],
): { wrapped: string; redacted: string; hits: RedactionHit[] } {
  const { redacted, hits } = redactText(rawText, { preserveAccounts });
  return {
    wrapped: wrapUntrustedUserContent(redacted),
    redacted,
    hits,
  };
}

function summarizeRedactions(allHits: RedactionHit[]): PiiRedactionItem[] {
  const grouped = new Map<PiiFieldType, { token: string; masked: string; count: number }>();
  for (const h of allHits) {
    const existing = grouped.get(h.fieldType);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(h.fieldType, { token: h.token, masked: h.masked, count: 1 });
    }
  }

  return Array.from(grouped.entries()).map(([field_type, info]) => ({
    field_type,
    token: info.token,
    original_masked: info.masked,
    count: info.count,
  }));
}

export function redactScanResult(
  result: ScanResult,
  options?: { rawUserText?: string; inputHits?: RedactionHit[] },
): {
  sanitizedResult: ScanResult;
  piiDiff: PiiDiff;
  sanitizedEvidence: SanitizedEvidence;
} {
  const preserveAccounts = [result.extracted_entities.recipient_account].filter(
    (v): v is string => Boolean(v && v.trim()),
  );
  const allHits: RedactionHit[] = [...(options?.inputHits ?? [])];

  const clean = (text: string): string => {
    const { redacted, hits } = redactText(text, { preserveAccounts });
    allHits.push(...hits);
    return redacted;
  };

  const sanitizedResult: ScanResult = {
    ...result,
    visual_tampering_flags: result.visual_tampering_flags.map(clean),
    psych_manipulation_cues: result.psych_manipulation_cues.map((cue) => ({
      ...cue,
      quote_vi: clean(cue.quote_vi),
      explanation_vi: clean(cue.explanation_vi),
    })),
    cyber_threat_flags: result.cyber_threat_flags.map((flag) => ({
      ...flag,
      indicator: /^https?:\/\//i.test(flag.indicator) ? flag.indicator : clean(flag.indicator),
      detail_vi: clean(flag.detail_vi),
    })),
    extracted_entities: {
      ...result.extracted_entities,
      // Explicitly preserve suspect recipient_account, urls, domains, apk_filenames for B2E & Immunity matching.
      recipient_bank: result.extracted_entities.recipient_bank
        ? clean(result.extracted_entities.recipient_bank)
        : null,
    },
    calm_guidance_vi: clean(result.calm_guidance_vi),
    deescalation_questions_vi: result.deescalation_questions_vi.map(clean),
  };

  const rawQuotes = result.psych_manipulation_cues.map((c) => c.quote_vi).filter(Boolean);
  const rawSampleSource =
    [options?.rawUserText?.trim(), ...rawQuotes, result.calm_guidance_vi]
      .filter((s): s is string => Boolean(s))
      .join(" | ")
      .slice(0, 320) || "Không có văn bản trích xuất.";

  const { redacted: afterSample } = redactText(rawSampleSource, { preserveAccounts });
  const redactions = summarizeRedactions(allHits);
  const totalRedacted = redactions.reduce((sum, item) => sum + item.count, 0);

  const piiDiff = PiiDiffSchema.parse({
    redactions,
    total_redacted: totalRedacted,
    before_sample: rawSampleSource,
    after_sample: afterSample,
  });

  const psychCueTypes = Array.from(
    new Set(sanitizedResult.psych_manipulation_cues.map((c) => c.type)),
  );
  const cyberThreatTypes = Array.from(
    new Set(sanitizedResult.cyber_threat_flags.map((f) => f.type)),
  );

  const sanitizedExcerpt = [
    ...sanitizedResult.psych_manipulation_cues.map((c) => c.quote_vi),
    ...sanitizedResult.cyber_threat_flags.map((f) => `${f.type}: ${f.indicator}`),
    ...(options?.rawUserText ? [redactText(options.rawUserText, { preserveAccounts }).redacted] : []),
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 500);

  const summaryVi =
    sanitizedResult.calm_guidance_vi.slice(0, 280) ||
    `Phân loại ${sanitizedResult.scam_category} (${sanitizedResult.risk_level}, ${sanitizedResult.risk_score}/100).`;

  const sanitizedEvidence = SanitizedEvidenceSchema.parse({
    summary_vi: summaryVi,
    scam_category: sanitizedResult.scam_category,
    risk_score: sanitizedResult.risk_score,
    risk_level: sanitizedResult.risk_level,
    psych_cue_types: psychCueTypes,
    cyber_threat_types: cyberThreatTypes,
    recipient_account: sanitizedResult.extracted_entities.recipient_account,
    recipient_bank: sanitizedResult.extracted_entities.recipient_bank,
    suspicious_urls: sanitizedResult.extracted_entities.urls,
    sanitized_excerpt: sanitizedExcerpt,
    contains_raw_image: false,
    created_at: new Date().toISOString(),
  });

  return { sanitizedResult, piiDiff, sanitizedEvidence };
}
