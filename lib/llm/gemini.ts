import type { LLMRawAdapter, RawCallParams } from "./provider";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

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

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: params.systemPrompt }],
          },
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
        signal: params.signal,
      });

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
