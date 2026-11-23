import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as postScan } from "@/app/api/shield/scan/route";
import { createBedrockAdapter, setLLMProviderForTest } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { getLlmStatus, SESSION_HEADER_NAME } from "@/lib/session";

/** Seam: LLM configuration status derived from environment (ticket #2). */
const ENV_KEYS = [
  "LLM_BACKEND",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "BEDROCK_VISION_MODEL",
  "BEDROCK_REASONING_MODEL",
] as const;
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  process.env.LLM_BACKEND = "bedrock";
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("Bedrock configuration status", () => {
  it("is configured with Sandbox temporary keys and reports env model IDs", () => {
    process.env.AWS_ACCESS_KEY_ID = "ASIATESTKEY";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.AWS_SESSION_TOKEN = "token";
    process.env.BEDROCK_VISION_MODEL = "vision-model-x";
    process.env.BEDROCK_REASONING_MODEL = "reasoning-model-y";

    expect(getLlmStatus()).toEqual({
      backend: "bedrock",
      configured: true,
      vision_model: "vision-model-x",
      reasoning_model: "reasoning-model-y",
    });
  });

  it("health status never disagrees with the adapter that actually serves calls", () => {
    process.env.AWS_ACCESS_KEY_ID = "   ";
    process.env.AWS_SECRET_ACCESS_KEY = "   ";

    const adapter = createBedrockAdapter();
    const status = getLlmStatus();
    expect(adapter.isConfigured()).toBe(false);
    expect(status.configured).toBe(adapter.isConfigured());
    expect(status.vision_model).toBe(adapter.visionModel);
    expect(status.reasoning_model).toBe(adapter.reasoningModel);
  });
});

describe("Bedrock without credentials", () => {
  const sessionId = `w5-bedrock-${Date.now()}`;
  afterAll(async () => {
    await prisma.$transaction([
      prisma.appeal.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.immunityIndicator.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.investigationCase.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.heldTransaction.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.scanSession.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.userConsent.deleteMany({ where: { demoSessionId: sessionId } }),
      prisma.auditLog.deleteMany({ where: { demoSessionId: sessionId } }),
    ]);
  });

  it("scan returns 503 LLM_NOT_CONFIGURED instead of fabricating an AI result", async () => {
    setLLMProviderForTest(null);
    const res = await postScan(
      new Request("http://localhost:3000/api/shield/scan", {
        method: "POST",
        headers: { "content-type": "application/json", [SESSION_HEADER_NAME]: sessionId },
        body: JSON.stringify({
          userId: "USER_B2C_HUNG",
          inputType: "TEXT_LOOKUP",
          lookupText: "Kiểm tra tin nhắn không có trong danh mục miễn dịch",
        }),
      }),
    );
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("LLM_NOT_CONFIGURED");
  });
});
