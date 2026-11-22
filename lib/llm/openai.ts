import type { LLMRawAdapter, RawCallParams } from "./provider";

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
}

export function createOpenAIAdapter(): LLMRawAdapter {
  const visionModel = process.env.LLM_VISION_MODEL ?? "gpt-4o-mini";
  const reasoningModel = process.env.LLM_REASONING_MODEL ?? "gpt-4o-mini";

  const getApiKey = () =>
    process.env.OPENAI_API_KEY?.trim() || process.env.LLM_API_KEY?.trim() || "";

  return {
    backend: "openai",
    visionModel,
    reasoningModel,
    isConfigured: () => Boolean(getApiKey()),
    async callRaw(params: RawCallParams): Promise<string> {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY / LLM_API_KEY is not configured");
      }

      const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(
        /\/+$/,
        "",
      );

      const userContent = params.imageBase64
        ? [
            {
              type: "image_url",
              image_url: {
                url: `data:${params.imageMimeType ?? "image/png"};base64,${params.imageBase64}`,
              },
            },
            { type: "text", text: params.userPrompt },
          ]
        : params.userPrompt;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
        signal: params.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenAI-compatible API HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const payload = (await res.json()) as OpenAIChatResponse;
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error(payload.error?.message || "OpenAI-compatible API returned an empty response");
      }
      return text;
    },
  };
}
