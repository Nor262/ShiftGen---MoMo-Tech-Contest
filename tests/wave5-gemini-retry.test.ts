import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGeminiAdapter } from "@/lib/llm";

/** Seam: Gemini adapter callRaw — retries only transient 503 UNAVAILABLE (ticket #2). */
const OK_BODY = { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] };
const params = { model: "gemini-test", systemPrompt: "s", userPrompt: "u", signal: new AbortController().signal };

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let savedKey: string | undefined;
beforeEach(() => {
  savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (savedKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = savedKey;
});

describe("Gemini adapter retry on transient overload", () => {
  it("succeeds after a 503 by retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200, OK_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const call = createGeminiAdapter().callRaw(params);
    await vi.runAllTimersAsync();
    await expect(call).resolves.toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exactly 3 calls when 503 persists", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response(503));
    vi.stubGlobal("fetch", fetchMock);

    const call = createGeminiAdapter().callRaw(params);
    const assertion = expect(call).rejects.toThrow(/HTTP 503/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 429 quota error", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response(429));
    vi.stubGlobal("fetch", fetchMock);

    const call = createGeminiAdapter().callRaw(params);
    const assertion = expect(call).rejects.toThrow(/HTTP 429/);
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops waiting as soon as the caller's timeout aborts during backoff", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response(503));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    const call = createGeminiAdapter().callRaw({ ...params, signal: controller.signal });
    const assertion = expect(call).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(10);
    controller.abort(new Error("timeout"));
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
