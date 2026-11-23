import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type ImageFormat,
} from "@aws-sdk/client-bedrock-runtime";
import type { LLMRawAdapter, RawCallParams } from "./provider";

function mimeToBedrockFormat(mime?: string): ImageFormat {
  if (mime === "image/jpeg") return "jpeg";
  if (mime === "image/webp") return "webp";
  return "png";
}

export function createBedrockAdapter(): LLMRawAdapter {
  const region = process.env.BEDROCK_REGION ?? "ap-southeast-2";
  const visionModel = process.env.BEDROCK_VISION_MODEL ?? "apac.amazon.nova-pro-v1:0";
  const reasoningModel =
    process.env.BEDROCK_REASONING_MODEL ?? "apac.anthropic.claude-sonnet-4-20250514-v1:0";

  let client: BedrockRuntimeClient | null = null;
  const getClient = () => {
    if (!client) {
      client = new BedrockRuntimeClient({ region });
    }
    return client;
  };

  return {
    backend: "bedrock",
    visionModel,
    reasoningModel,
    isConfigured: () =>
      Boolean(process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim()),
    async callRaw(params: RawCallParams): Promise<string> {
      const content: ContentBlock[] = [];
      if (params.imageBase64) {
        content.push({
          image: {
            format: mimeToBedrockFormat(params.imageMimeType),
            source: {
              bytes: Buffer.from(params.imageBase64, "base64"),
            },
          },
        });
      }
      content.push({ text: params.userPrompt });

      const guardrailId = process.env.BEDROCK_GUARDRAIL_ID?.trim();
      const guardrailVersion = process.env.BEDROCK_GUARDRAIL_VERSION?.trim();

      const command = new ConverseCommand({
        modelId: params.model,
        system: [{ text: params.systemPrompt }],
        messages: [{ role: "user", content }],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 2048,
        },
        ...(guardrailId && guardrailVersion
          ? {
              guardrailConfig: {
                guardrailIdentifier: guardrailId,
                guardrailVersion,
              },
            }
          : {}),
      });

      const response = await getClient().send(command, { abortSignal: params.signal });
      const blocks = response.output?.message?.content ?? [];
      const text = blocks
        .map((b) => ("text" in b && typeof b.text === "string" ? b.text : ""))
        .join("")
        .trim();

      if (!text) {
        throw new Error("Bedrock Converse returned an empty response");
      }
      return text;
    },
  };
}
