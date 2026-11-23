import type { LLMRawAdapter, RawCallParams } from "./provider";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

// Google documents 503 UNAVAILABLE ("high demand") as temporary; 429 (quota) is not retried.
// shortcut: fixed 1s/3s backoff for the demo, add jitter + Retry-After if traffic grows.
const RETRY_DELAYS_MS = [1000, 3000] as const;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createGeminiAdapter(): LLMRawAdapter {
  const visionModel = process.env.GEMINI_VISION_MODEL ?? "gemini-2.5-flash";
  const reasoningModel = process.env.GEMINI_REASONING_MODEL ?? "gemini-2.5-flash";

  return {
    backend: "gemini",
    visionModel,
    reasoningModel,
    isConfigured: () => Boolean(process.env.GEMINI_API_KEY?.trim()),
    async callRaw(params: RawCallParams): Promise<string> {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [];
      if (params.imageBase64) {
        parts.push({
          inlineData: {
            mimeType: params.imageMimeType ?? "image/png",
            data: params.imageBase64,
          },
        });
      }
      parts.push({ text: params.userPrompt });

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        params.model,
      )}:generateContent`;

      const body = JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.systemPrompt }],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      const send = () =>
        fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body,
          signal: params.signal,
        });

      let res = await send();
      for (const delay of RETRY_DELAYS_MS) {
        if (res.status !== 503) break;
        await sleep(delay);
        res = await send();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Gemini API HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const payload = (await res.json()) as GeminiResponse;
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw new Error(payload.error?.message || "Gemini returned an empty response");
      }
      return text;
    },
  };
}
