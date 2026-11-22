import { z } from "zod";
import { ScanResultSchema, type LlmBackend, type ScanResult } from "@/contracts";

export class LLMNotConfiguredError extends Error {
  readonly statusCode = 503 as const;
  readonly code = "LLM_NOT_CONFIGURED" as const;

  constructor(message = "Chưa cấu hình khóa API LLM (GEMINI_API_KEY / OPENAI_API_KEY / AWS Bedrock).") {
    super(message);
    this.name = "LLMNotConfiguredError";
  }
}

export class LLMQuotaExceededError extends Error {
  readonly statusCode = 429 as const;
  readonly code = "LLM_DAILY_QUOTA_EXCEEDED" as const;

  constructor(message = "Đã đạt giới hạn lượt gọi AI trong ngày của bản demo.") {
    super(message);
    this.name = "LLMQuotaExceededError";
  }
}

export class LLMTimeoutError extends Error {
  readonly statusCode = 504 as const;
  readonly code = "LLM_TIMEOUT" as const;

  constructor(message = "Yêu cầu phân tích AI vượt quá thời gian chờ cho phép.") {
    super(message);
    this.name = "LLMTimeoutError";
  }
}

export interface LLMCallResult<T> {
  data: T;
  modelUsed: string;
  backend: LlmBackend;
  measuredLatencyMs: number;
  repaired: boolean;
  usedFallback: boolean;
}

export interface AnalyzeImageInput {
  systemPrompt: string;
  userPrompt: string;
  imageBase64?: string;
  imageMimeType?: "image/jpeg" | "image/png" | "image/webp";
  timeoutMs?: number;
}

export interface GenerateJsonInput {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

export interface RawCallParams {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  imageBase64?: string;
  imageMimeType?: "image/jpeg" | "image/png" | "image/webp";
  signal: AbortSignal;
}

export interface LLMRawAdapter {
  readonly backend: LlmBackend;
  readonly visionModel: string;
  readonly reasoningModel: string;
  isConfigured(): boolean;
  callRaw(params: RawCallParams): Promise<string>;
}

export type AnyZodSchema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

export interface LLMProvider {
  readonly backend: LlmBackend;
  readonly visionModel: string;
  readonly reasoningModel: string;
  isConfigured(): boolean;
  analyzeImage(input: AnalyzeImageInput): Promise<LLMCallResult<ScanResult>>;
  analyzeImage<T>(input: AnalyzeImageInput, schema: AnyZodSchema<T>): Promise<LLMCallResult<T>>;
  generateJSON<T>(schema: AnyZodSchema<T>, input: GenerateJsonInput): Promise<LLMCallResult<T>>;
}

export function getLlmTimeoutMs(override?: number): number {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.round(override);
  }
  const parsed = Number.parseInt(process.env.LLM_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25_000;
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty LLM response");
  }

  // Strip optional markdown code fences first.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall through to balanced brace scanner for prose-wrapped JSON.
  }

  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in LLM response");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        return JSON.parse(slice);
      }
    }
  }

  throw new Error("Unterminated JSON object in LLM response");
}

function isAbortLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "TimeoutError" ||
    err.name === "AbortError" ||
    /timed?\s*out|aborted/i.test(err.message)
  );
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}

async function runAdapterWithRepair<T>(
  adapter: LLMRawAdapter,
  schema: AnyZodSchema<T>,
  params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    imageBase64?: string;
    imageMimeType?: "image/jpeg" | "image/png" | "image/webp";
    timeoutMs: number;
  },
): Promise<{ data: T; repaired: boolean }> {
  const invoke = async (userPrompt: string, includeImage: boolean): Promise<string> => {
    try {
      return await adapter.callRaw({
        model: params.model,
        systemPrompt: params.systemPrompt,
        userPrompt,
        imageBase64: includeImage ? params.imageBase64 : undefined,
        imageMimeType: includeImage ? params.imageMimeType : undefined,
        signal: AbortSignal.timeout(params.timeoutMs),
      });
    } catch (err) {
      if (isAbortLikeError(err)) {
        throw new LLMTimeoutError(
          `LLM (${adapter.backend}/${params.model}) vượt quá giới hạn ${params.timeoutMs}ms.`,
        );
      }
      throw err;
    }
  };

  const firstRaw = await invoke(params.userPrompt, true);
  let firstErrorMsg = "";
  try {
    const parsed = extractJsonObject(firstRaw);
    const validated = schema.safeParse(parsed);
    if (validated.success) {
      return { data: validated.data, repaired: false };
    }
    firstErrorMsg = formatZodIssues(validated.error);
  } catch (err) {
    firstErrorMsg = err instanceof Error ? err.message : String(err);
  }

  // 1x automatic JSON schema repair retry.
  const repairPrompt = [
    "Your previous output failed strict JSON schema validation.",
    `Validation errors: ${firstErrorMsg}`,
    "Return ONLY a single valid JSON object that fixes all schema errors while preserving the analysis.",
    "Previous invalid output:",
    firstRaw.slice(0, 3500),
  ].join("\n");

  const repairedRaw = await invoke(repairPrompt, false);
  const repairedParsed = extractJsonObject(repairedRaw);
  const repairedValidated = schema.safeParse(repairedParsed);
  if (!repairedValidated.success) {
    throw new Error(
      `LLM JSON repair failed (${adapter.backend}/${params.model}): ${formatZodIssues(repairedValidated.error)}`,
    );
  }

  return { data: repairedValidated.data, repaired: true };
}

export function createResilientProvider(
  primary: LLMRawAdapter,
  fallback?: LLMRawAdapter | null,
): LLMProvider {
  const hasSecondary = Boolean(fallback && fallback.backend !== primary.backend);

  async function execute<T>(
    mode: "vision" | "reasoning",
    schema: AnyZodSchema<T>,
    input: AnalyzeImageInput | GenerateJsonInput,
  ): Promise<LLMCallResult<T>> {
    const startedAt = performance.now();
    const timeoutMs = getLlmTimeoutMs(input.timeoutMs);

    const primaryReady = primary.isConfigured();
    const fallbackReady = Boolean(hasSecondary && fallback?.isConfigured());

    if (!primaryReady && !fallbackReady) {
      throw new LLMNotConfiguredError(
        `Nhà cung cấp LLM "${primary.backend}" chưa có thông tin xác thực trong biến môi trường.`,
      );
    }

    const attempts: Array<{ adapter: LLMRawAdapter; usedFallback: boolean }> = [];
    if (primaryReady) {
      attempts.push({ adapter: primary, usedFallback: false });
    }
    if (fallbackReady && fallback) {
      attempts.push({ adapter: fallback, usedFallback: true });
    }

    let lastError: unknown;
    for (const attempt of attempts) {
      const model =
        mode === "vision" ? attempt.adapter.visionModel : attempt.adapter.reasoningModel;
      try {
        const imgInput = input as AnalyzeImageInput;
        const { data, repaired } = await runAdapterWithRepair(attempt.adapter, schema, {
          model,
          systemPrompt: input.systemPrompt,
          userPrompt: input.userPrompt,
          imageBase64: imgInput.imageBase64,
          imageMimeType: imgInput.imageMimeType,
          timeoutMs,
        });

        return {
          data,
          modelUsed: model,
          backend: attempt.adapter.backend,
          measuredLatencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
          repaired,
          usedFallback: attempt.usedFallback,
        };
      } catch (err) {
        lastError = err;
        // Continue to secondary fallback adapter if configured.
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  function analyzeImage(input: AnalyzeImageInput): Promise<LLMCallResult<ScanResult>>;
  function analyzeImage<T>(
    input: AnalyzeImageInput,
    schema: AnyZodSchema<T>,
  ): Promise<LLMCallResult<T>>;
  function analyzeImage<T = ScanResult>(
    input: AnalyzeImageInput,
    schema?: AnyZodSchema<T>,
  ): Promise<LLMCallResult<T>> {
    const targetSchema = (schema ?? ScanResultSchema) as AnyZodSchema<T>;
    return execute("vision", targetSchema, input);
  }

  return {
    backend: primary.backend,
    visionModel: primary.visionModel,
    reasoningModel: primary.reasoningModel,
    isConfigured: () => primary.isConfigured() || Boolean(hasSecondary && fallback?.isConfigured()),
    analyzeImage,
    generateJSON: <T>(schema: AnyZodSchema<T>, input: GenerateJsonInput) =>
      execute("reasoning", schema, input),
  };
}
