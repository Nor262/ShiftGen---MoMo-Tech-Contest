import { LlmBackendSchema, type LlmBackend, type LlmStatus } from "@/contracts";
import { createBedrockAdapter } from "./bedrock";
import { createGeminiAdapter } from "./gemini";
import { createOpenAIAdapter } from "./openai";
import {
  createResilientProvider,
  type LLMProvider,
  type LLMRawAdapter,
} from "./provider";

export * from "./provider";
export { createGeminiAdapter } from "./gemini";
export { createBedrockAdapter } from "./bedrock";
export { createOpenAIAdapter } from "./openai";

let testProviderOverride: LLMProvider | null = null;

export function setLLMProviderForTest(mock: LLMProvider | null): void {
  testProviderOverride = mock;
}

function buildAdapter(backend: LlmBackend): LLMRawAdapter {
  switch (backend) {
    case "bedrock":
      return createBedrockAdapter();
    case "openai":
      return createOpenAIAdapter();
    case "gemini":
    default:
      return createGeminiAdapter();
  }
}

function resolvePrimaryBackend(): LlmBackend {
  const parsed = LlmBackendSchema.safeParse((process.env.LLM_BACKEND ?? "gemini").trim().toLowerCase());
  return parsed.success ? parsed.data : "gemini";
}

/** What /api/health reports — read from the very adapter that serves calls, so they never disagree. */
export function getPrimaryLlmStatus(): LlmStatus {
  const adapter = buildAdapter(resolvePrimaryBackend());
  return {
    backend: adapter.backend,
    configured: adapter.isConfigured(),
    vision_model: adapter.visionModel,
    reasoning_model: adapter.reasoningModel,
  };
}

export function getLLMProvider(): LLMProvider {
  if (testProviderOverride) {
    return testProviderOverride;
  }

  const primaryBackend = resolvePrimaryBackend();
  const primary = buildAdapter(primaryBackend);

  const fallbackRaw = process.env.LLM_FALLBACK_BACKEND?.trim().toLowerCase();
  const parsedFallback = fallbackRaw ? LlmBackendSchema.safeParse(fallbackRaw) : null;
  const fallback =
    parsedFallback?.success && parsedFallback.data !== primaryBackend
      ? buildAdapter(parsedFallback.data)
      : null;

  return createResilientProvider(primary, fallback);
}
