import { loadScanReplay } from "@/lib/replay";
import { replayModelLabel } from "@/lib/replay-label";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  ScanResultSchema,
  ShieldScanRequestSchema,
  ShieldScanResponseSchema,
  type ImmunityIndicatorDto,
  type ScanResult,
  type ShieldScanRequest,
} from "@/contracts";
import {
  getLLMProvider,
  LLMNotConfiguredError,
  LLMTimeoutError,
} from "@/lib/llm";
import {
  MAX_UPLOAD_BYTES,
  redactScanResult,
  sanitizeInputForLlm,
  UploadValidationError,
  validateBase64Image,
  validateImageBuffer,
  type ValidatedImage,
} from "@/lib/pii";
import { prisma } from "@/lib/prisma";
import { checkDbRateLimit, extractClientIp } from "@/lib/rate-limit";
import {
  buildFallbackRuleScanResult,
  buildImmunityTier1Result,
  buildShieldSystemPrompt,
  consumeDailyLlmQuota,
  DAILY_QUOTA_FALLBACK_MODEL,
  DAILY_QUOTA_FALLBACK_NOTICE_VI,
  ensureSessionSeeded,
  extractDomainFromUrl,
  getDailyLlmUsage,
  getSessionId,
  lookupActiveImmunity,
  riskLevelFromScore,
  TIER1_IMMUNITY_MODEL,
} from "@/lib/session";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PRESET_IMAGE_FILES: Record<"CASE-01" | "CASE-02" | "CASE-03", string> = {
  "CASE-01": "zalo-fake-police.png",
  "CASE-02": "vneid-apk.png",
  "CASE-03": "livestream-merchant.png",
};

function formString(formData: FormData, key: string): string | undefined {
  const val = formData.get(key);
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function parseScanInput(request: Request): Promise<{
  req: ShieldScanRequest;
  image: ValidatedImage | null;
}> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const imageEntry = formData.get("image");
    let validatedImage: ValidatedImage | null = null;

    if (imageEntry && typeof imageEntry !== "string" && imageEntry.size > 0) {
      if (imageEntry.size > MAX_UPLOAD_BYTES) {
        throw new UploadValidationError(
          "FILE_TOO_LARGE",
          "Kích thước hình ảnh vượt quá giới hạn tối đa 5 MB.",
        );
      }
      const buf = Buffer.from(await imageEntry.arrayBuffer());
      validatedImage = validateImageBuffer(buf, imageEntry.type || undefined);
    }

    const presetCode = formString(formData, "presetCode");
    const explicitInputType = formString(formData, "inputType");
    const inferredInputType =
      explicitInputType ?? (validatedImage ? "IMAGE" : presetCode ? "DEMO_PRESET" : "TEXT_LOOKUP");

    const parsed = ShieldScanRequestSchema.safeParse({
      userId: formString(formData, "userId"),
      inputType: inferredInputType,
      presetCode,
      imageBase64: validatedImage?.base64,
      imageMimeType: validatedImage?.mimeType,
      lookupText: formString(formData, "lookupText"),
      recipientAccount: formString(formData, "recipientAccount"),
      url: formString(formData, "url"),
    });

    if (!parsed.success) {
      throw new UploadValidationError(
        "INVALID_IMAGE_FORMAT",
        parsed.error.issues[0]?.message ?? "Dữ liệu quét không hợp lệ.",
      );
    }

    return { req: parsed.data, image: validatedImage };
  }

  const body = await request.json().catch(() => null);
  const parsed = ShieldScanRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new UploadValidationError(
      "INVALID_IMAGE_FORMAT",
      parsed.error.issues[0]?.message ?? "Dữ liệu quét không hợp lệ.",
    );
  }

  let validatedImage: ValidatedImage | null = null;
  if (parsed.data.imageBase64) {
    validatedImage = validateBase64Image(parsed.data.imageBase64, parsed.data.imageMimeType);
  }

  return { req: parsed.data, image: validatedImage };
}

export async function POST(request: Request) {
  const startedAt = performance.now();

  try {
    const demoSessionId = getSessionId(request);
    const clientIp = extractClientIp(request);

    const rateLimit = await checkDbRateLimit(clientIp, demoSessionId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Bạn đã gửi quá nhiều yêu cầu quét trong thời gian ngắn. Vui lòng thử lại sau.",
          code: "RATE_LIMIT_EXCEEDED",
          details: { retryAfterSec: rateLimit.retryAfterSec },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec) },
        },
      );
    }

    await ensureSessionSeeded(demoSessionId);

    const { req, image: uploadedImage } = await parseScanInput(request);
    let activeImage = uploadedImage;

    // Resolve DEMO_PRESET PNG if no inline imageBase64 was provided.
    if (req.inputType === "DEMO_PRESET" && !activeImage) {
      const presetCode = req.presetCode;
      if (!presetCode) {
        return NextResponse.json(
          { error: "Thiếu mã kịch bản mô phỏng (CASE-01 / CASE-02 / CASE-03).", code: "VALIDATION_ERROR" },
          { status: 400 },
        );
      }
      const filename = PRESET_IMAGE_FILES[presetCode];
      const filePath = path.join(process.cwd(), "public", "demo-images", filename);
      let presetBuffer: Buffer;
      try {
        presetBuffer = await readFile(filePath);
      } catch {
        return NextResponse.json(
          {
            error: `Không tìm thấy ảnh mô phỏng "${filename}" trong public/demo-images/.`,
            code: "PRESET_IMAGE_NOT_FOUND",
          },
          { status: 400 },
        );
      }
      activeImage = validateImageBuffer(presetBuffer, "image/png");
    }

    const imageHash = activeImage?.sha256 ?? null;

    // Tier 1 (Pre-Vision) Immunity Lookup.
    const tier1Hit = await lookupActiveImmunity(demoSessionId, {
      accounts: [req.recipientAccount],
      urls: [req.url],
      hashes: [imageHash],
      rawText: req.lookupText,
    });

    const preserveAccounts = [req.recipientAccount].filter((v): v is string => Boolean(v));
    const sanitizedInput = req.lookupText
      ? sanitizeInputForLlm(req.lookupText, preserveAccounts)
      : null;

    // A demo preset with a recorded REAL run is replayed (labelled) instead of rule-only fallback,
    // which cannot read the preset image.
    const presetReplay =
      req.inputType === "DEMO_PRESET" && req.presetCode ? loadScanReplay(req.presetCode) : null;
    const replayOutcome = () =>
      presetReplay && {
        rawResult: presetReplay.result,
        modelUsed: replayModelLabel(presetReplay.modelUsed),
        fallbackMode: true,
        fallbackNoticeVi: presetReplay.noticeVi,
      };

    const makeFallbackOutcome = (): {
      rawResult: ScanResult;
      modelUsed: string;
      fallbackMode: boolean;
      fallbackNoticeVi: string;
    } => replayOutcome() ?? ({
      rawResult: buildFallbackRuleScanResult(
        {
          lookupText: req.lookupText,
          recipientAccount: req.recipientAccount,
          url: req.url,
        },
        tier1Hit,
      ),
      modelUsed: DAILY_QUOTA_FALLBACK_MODEL,
      fallbackMode: true,
      fallbackNoticeVi: DAILY_QUOTA_FALLBACK_NOTICE_VI,
    });

    let rawResult: ScanResult;
    let modelUsed: string;
    let fallbackMode = false;
    let fallbackNoticeVi: string | undefined;

    if (req.inputType === "TEXT_LOOKUP" && !activeImage && tier1Hit) {
      rawResult = buildImmunityTier1Result(tier1Hit, {
        recipientAccount: req.recipientAccount,
        url: req.url,
        lookupText: req.lookupText,
      });
      modelUsed = TIER1_IMMUNITY_MODEL;
    } else {
      const currentUsage = await getDailyLlmUsage();
      if (!currentUsage.allowed) {
        const fb = makeFallbackOutcome();
        rawResult = fb.rawResult;
        modelUsed = fb.modelUsed;
        fallbackMode = fb.fallbackMode;
        fallbackNoticeVi = fb.fallbackNoticeVi;
      } else {
        const provider = getLLMProvider();
        if (!provider.isConfigured()) {
          throw new LLMNotConfiguredError();
        }

        const consumed = await consumeDailyLlmQuota();
        if (!consumed.allowed) {
          const fb = makeFallbackOutcome();
          rawResult = fb.rawResult;
          modelUsed = fb.modelUsed;
          fallbackMode = fb.fallbackMode;
          fallbackNoticeVi = fb.fallbackNoticeVi;
        } else {
          const systemPrompt = buildShieldSystemPrompt();
          const promptParts: string[] = [
            `Loại đầu vào: ${req.inputType}${req.presetCode ? ` (${req.presetCode})` : ""}`,
          ];
          if (req.recipientAccount) {
            promptParts.push(`Số tài khoản người nhận nghi vấn: ${req.recipientAccount}`);
          }
          if (req.url) {
            promptParts.push(`Liên kết cần kiểm tra: ${req.url}`);
          }
          if (sanitizedInput) {
            promptParts.push(`Nội dung văn bản do người dùng cung cấp (đã ẩn PII nhạy cảm):`);
            promptParts.push(sanitizedInput.wrapped);
          }
          if (activeImage) {
            promptParts.push(
              "Hãy phân tích kỹ ảnh chụp màn hình đính kèm (dấu hiệu giả mạo văn bản/dấu đỏ, thao túng tâm lý, yêu cầu cài .apk/quyền Trợ năng, số tài khoản, số tiền, liên kết).",
            );
          }
          const userPrompt = promptParts.join("\n");

          try {
            const llmRes = activeImage
              ? await provider.analyzeImage({
                  systemPrompt,
                  userPrompt,
                  imageBase64: activeImage.base64,
                  imageMimeType: activeImage.mimeType,
                })
              : await provider.generateJSON(ScanResultSchema, {
                  systemPrompt,
                  userPrompt,
                });
            rawResult = llmRes.data;
            modelUsed = llmRes.modelUsed;
          } catch (llmErr) {
            // Runtime LLM failure on a demo preset: show the recorded REAL run, always labelled as a
            // replay. Never invented; missing credentials never reach this point (503 above).
            const replay = replayOutcome();
            if (!replay) throw llmErr;
            ({ rawResult, modelUsed, fallbackMode, fallbackNoticeVi } = replay);
          }
        }
      }
    }

    // Release in-memory image bytes immediately after Vision inference.
    activeImage = null;

    // Backfill explicitly supplied recipientAccount / URL if missing from model extraction.
    const mergedUrls = Array.from(
      new Set([
        ...rawResult.extracted_entities.urls,
        ...(req.url ? [req.url] : []),
      ]),
    );
    const mergedDomains = Array.from(
      new Set([
        ...rawResult.extracted_entities.domains,
        ...mergedUrls
          .map((u) => extractDomainFromUrl(u))
          .filter((d): d is string => Boolean(d)),
      ]),
    );

    const enrichedResult: ScanResult = {
      ...rawResult,
      extracted_entities: {
        ...rawResult.extracted_entities,
        recipient_account:
          rawResult.extracted_entities.recipient_account ?? req.recipientAccount ?? null,
        urls: mergedUrls,
        domains: mergedDomains,
      },
    };

    // Bidirectional PII redaction (output pass + combined diff).
    const { sanitizedResult, piiDiff, sanitizedEvidence } = redactScanResult(enrichedResult, {
      rawUserText: req.lookupText,
      inputHits: sanitizedInput?.hits,
    });

    // Tier 2 (Post-Vision) Immunity Lookup on extracted entities if Tier 1 did not already match.
    let immunityHit: ImmunityIndicatorDto | null = tier1Hit;
    let immunityTierMatched: "NONE" | "TIER_1_PRE_VISION" | "TIER_2_POST_VISION" = tier1Hit
      ? "TIER_1_PRE_VISION"
      : "NONE";

    if (!immunityHit) {
      const tier2Hit = await lookupActiveImmunity(demoSessionId, {
        accounts: [sanitizedResult.extracted_entities.recipient_account],
        urls: sanitizedResult.extracted_entities.urls,
        domains: sanitizedResult.extracted_entities.domains,
        hashes: sanitizedResult.extracted_entities.apk_filenames,
      });
      if (tier2Hit) {
        immunityHit = tier2Hit;
        immunityTierMatched = "TIER_2_POST_VISION";
      }
    }

    // Elevate score/level consistently when Community Immunity matches.
    if (immunityHit) {
      const floorScore = immunityHit.status === "ACTIVE" ? 92 : 66;
      if (sanitizedResult.risk_score < floorScore) {
        sanitizedResult.risk_score = floorScore;
        sanitizedResult.risk_level = riskLevelFromScore(floorScore);
        sanitizedEvidence.risk_score = floorScore;
        sanitizedEvidence.risk_level = sanitizedResult.risk_level;
      }
    }

    const measuredLatencyMs = Math.max(0, Math.round(performance.now() - startedAt));

    const persistedPiiDiff = {
      ...piiDiff,
      before_sample: "[REDACTED_NOT_PERSISTED]",
    };

    const scanRecord = await prisma.scanSession.create({
      data: {
        demoSessionId,
        userId: req.userId,
        inputType: req.inputType,
        imageHash,
        riskScore: sanitizedResult.risk_score,
        riskLevel: sanitizedResult.risk_level,
        resultJson: JSON.stringify(sanitizedResult),
        sanitizedEvidenceJson: JSON.stringify(sanitizedEvidence),
        piiDiffJson: JSON.stringify(persistedPiiDiff),
        immunityHitId: immunityHit?.indicatorId ?? null,
        modelUsed,
        measuredLatencyMs,
      },
    });

    await prisma.auditLog.create({
      data: {
        demoSessionId,
        actorId: req.userId,
        actorRole: "USER_B2C",
        action: "SCAN_COMPLETED",
        targetId: scanRecord.scanId,
        rationale: `Quét Phút 00 hoàn tất (${sanitizedResult.scam_category}, điểm rủi ro ${sanitizedResult.risk_score}/100, mô hình ${modelUsed}).`,
        metadataJson: JSON.stringify({
          inputType: req.inputType,
          immunityTierMatched,
          immunityHitId: immunityHit?.indicatorId ?? null,
          piiRedactedCount: piiDiff.total_redacted,
          fallbackMode,
          measuredLatencyMs,
        }),
      },
    });

    const responsePayload = ShieldScanResponseSchema.parse({
      scanId: scanRecord.scanId,
      result: sanitizedResult,
      sanitizedEvidence,
      piiDiff,
      immunityHit,
      immunityTierMatched,
      modelUsed,
      measuredLatencyMs,
      ...(fallbackMode ? { fallbackMode: true, fallbackNoticeVi } : {}),
    });

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    if (err instanceof LLMNotConfiguredError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }
    if (err instanceof LLMTimeoutError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.statusCode },
      );
    }

    console.error("[POST /api/shield/scan]", err);
    return NextResponse.json(
      {
        error: "Không thể hoàn tất phân tích rủi ro lúc này.",
        code: "SCAN_FAILED",
      },
      { status: 502 },
    );
  }
}
