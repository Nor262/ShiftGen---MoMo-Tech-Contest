import { describe, expect, it } from "vitest";
import { initialStoryState, isBeatLocked, STORY_BEATS, storyReducer, type StoryState } from "@/lib/story/machine";

/** Seam: the story stage's beat state machine (ticket #19). Pure, no React. */
function succeed(s: StoryState, result: unknown = { ok: true }): StoryState {
  return storyReducer(storyReducer(s, { type: "beatStarted" }), { type: "beatSucceeded", result });
}
/** Run the beat on stage, then move on to the next one (the presenter's two clicks). */
function play(s: StoryState): StoryState {
  return storyReducer(succeed(s), { type: "next" });
}

describe("story beats", () => {
  it("are the 10 beats of the spec (chapter 1: each consent on its own, guardian accepts), each with an actor and copy", () => {
    expect(STORY_BEATS.map((b) => b.id)).toEqual(["1.1", "1.2", "1.3", "1.4", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2"]);
    expect(STORY_BEATS.map((b) => b.actor)).toEqual([
      "USER_B2C_HUNG",
      "FAMILY_MINH",
      "USER_B2C_HUNG",
      "USER_B2C_HUNG",
      "USER_B2C_HUNG",
      "FAMILY_MINH",
      "RISK_MAKER_HUYEN",
      "RISK_MAKER_HUYEN",
      "RISK_CHECKER_TUAN",
      "USER_B2C_NEW",
    ]);
    for (const beat of STORY_BEATS) {
      expect(beat.buttonLabel.length).toBeGreaterThan(0);
      expect(beat.lockedReason.length).toBeGreaterThan(0);
      expect(beat.narration.length).toBeGreaterThan(0);
    }
  });
});

describe("story state machine", () => {
  it("starts at beat 1.1 with everything after it locked", () => {
    const s = initialStoryState();
    expect(s.current).toBe("1.1");
    expect(s.done).toEqual([]);
    expect(isBeatLocked(s, "1.1")).toBe(false);
    expect(isBeatLocked(s, "1.2")).toBe(true);
  });

  it("advances only when a beat succeeds, keeping its result", () => {
    const s = succeed(initialStoryState(), { scanId: "x" });
    expect(s.current).toBe("1.2");
    expect(s.done).toEqual(["1.1"]);
    expect(s.results["1.1"]).toEqual({ scanId: "x" });
    expect(s.running).toBe(false);
    expect(s.error).toBeNull();
    expect(isBeatLocked(s, "1.2")).toBe(false);
  });

  it("holds the stage on the finished beat so its effect can be shown, then moves on with 'next'", () => {
    let s = succeed(initialStoryState()); // 1.1 done
    s = storyReducer(s, { type: "next" });
    s = storyReducer(succeed(s), { type: "next" }); // 1.2 guardian accepts
    s = storyReducer(succeed(s), { type: "next" }); // 1.3 scan consent
    s = succeed(s); // 1.4 (scan) done → next beat is in chapter 2
    expect(s.shown).toBe("1.4");
    expect(s.viewing).toBe(1);
    const moved = storyReducer(s, { type: "next" });
    expect(moved.shown).toBe("2.1");
    expect(moved.viewing).toBe(2);
  });

  it("only runs the beat that is on stage", () => {
    const s = succeed(initialStoryState()); // shown 1.1 (done), current 1.2
    expect(storyReducer(s, { type: "beatStarted" })).toBe(s);
  });

  it("ignores a second start while a beat is running (double click = one call)", () => {
    const running = storyReducer(initialStoryState(), { type: "beatStarted" });
    expect(storyReducer(running, { type: "beatStarted" })).toBe(running);
  });

  it("stays on the beat and keeps the real error when the API fails, so it can be retried", () => {
    const running = storyReducer(initialStoryState(), { type: "beatStarted" });
    const failed = storyReducer(running, { type: "beatFailed", message: "Đã đạt hạn mức lượt gọi AI trong ngày" });
    expect(failed.current).toBe("1.1");
    expect(failed.running).toBe(false);
    expect(failed.error).toBe("Đã đạt hạn mức lượt gọi AI trong ngày");
    const retried = succeed(failed);
    expect(retried.current).toBe("1.2");
    expect(retried.error).toBeNull();
  });

  it("ignores success/failure that arrives when nothing is running", () => {
    const s = initialStoryState();
    expect(storyReducer(s, { type: "beatSucceeded", result: 1 })).toBe(s);
    expect(storyReducer(s, { type: "beatFailed", message: "x" })).toBe(s);
  });

  it("ends as done after beat 4.2", () => {
    let s = initialStoryState();
    for (let i = 0; i < STORY_BEATS.length; i++) s = play(s);
    expect(s.current).toBe("done");
    expect(s.done).toHaveLength(STORY_BEATS.length);
    expect(s.shown).toBe("4.2");
    expect(storyReducer(s, { type: "beatStarted" })).toBe(s);
    expect(storyReducer(s, { type: "next" })).toBe(s);
  });

  it("lets the presenter look back at a chapter without rerunning, then return", () => {
    let s = initialStoryState();
    expect(s.viewing).toBe(1);
    for (let i = 0; i < 6; i++) s = play(s); // on stage: 3.1
    expect(s.viewing).toBe(3);
    const back = storyReducer(s, { type: "viewChapter", chapter: 1 });
    expect(back.viewing).toBe(1);
    expect(back.shown).toBe("1.4");
    expect(back.current).toBe("3.1");
    expect(storyReducer(back, { type: "beatStarted" })).toBe(back); // looking back never reruns
    const returned = storyReducer(back, { type: "viewChapter", chapter: 3 });
    expect(returned.shown).toBe("3.1");
    expect(storyReducer(s, { type: "viewChapter", chapter: 4 })).toBe(s); // not reached yet
  });
});

describe("chapter 1 asks for each consent on its own (#5, Luật 91/2025 Điều 9.4.a)", () => {
  it("has a 24h-protection beat, the guardian's own acceptance (#6), a separate scan-consent beat, then the scan", () => {
    expect(STORY_BEATS.filter((b) => b.chapter === 1).map((b) => b.id)).toEqual(["1.1", "1.2", "1.3", "1.4"]);
    expect(STORY_BEATS.find((b) => b.id === "1.1")!.buttonLabel).toMatch(/Bảo vệ 24h/);
    expect(STORY_BEATS.find((b) => b.id === "1.2")!).toMatchObject({ actor: "FAMILY_MINH", phoneOwner: "FAMILY_MINH" });
    expect(STORY_BEATS.find((b) => b.id === "1.3")!.buttonLabel).toMatch(/AI phân tích/);
  });
});
