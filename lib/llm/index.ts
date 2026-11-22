import { LlmBackendSchema, type LlmBackend } from "@/contracts";
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

export function getLLMProvider(): LLMProvider {
  if (testProviderOverride) {
    return testProviderOverride;
  }

  const parsedPrimary = LlmBackendSchema.safeParse(
    (process.env.LLM_BACKEND ?? "gemini").trim().toLowerCase(),
  );
  const primaryBackend: LlmBackend = parsedPrimary.success ? parsedPrimary.data : "gemini";
  const primary = buildAdapter(primaryBackend);

  const fallbackRaw = process.env.LLM_FALLBACK_BACKEND?.trim().toLowerCase();
  const parsedFallback = fallbackRaw ? LlmBackendSchema.safeParse(fallbackRaw) : null;
  const fallback =
    parsedFallback?.success && parsedFallback.data !== primaryBackend
      ? buildAdapter(parsedFallback.data)
      : null;

  return createResilientProvider(primary, fallback);
}
