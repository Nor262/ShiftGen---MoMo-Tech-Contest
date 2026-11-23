import { describe, expect, it } from "vitest";
import { initialStoryState, isBeatLocked, STORY_BEATS, storyReducer, type StoryState } from "@/lib/story/machine";

/** Seam: the story stage's beat state machine (ticket #19). Pure, no React. */
function succeed(s: StoryState, result: unknown = { ok: true }): StoryState {
  return storyReducer(storyReducer(s, { type: "beatStarted" }), { type: "beatSucceeded", result });
}

describe("story beats", () => {
  it("are the 8 beats of the spec, in order, each with an actor and copy", () => {
    expect(STORY_BEATS.map((b) => b.id)).toEqual(["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2"]);
    expect(STORY_BEATS.map((b) => b.actor)).toEqual([
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
    for (let i = 0; i < STORY_BEATS.length; i++) s = succeed(s);
    expect(s.current).toBe("done");
    expect(s.done).toHaveLength(8);
    expect(storyReducer(s, { type: "beatStarted" })).toBe(s);
  });

  it("follows the current chapter and lets the presenter look back without rerunning", () => {
    let s = initialStoryState();
    expect(s.viewing).toBe(1);
    for (let i = 0; i < 4; i++) s = succeed(s); // now at 3.1
    expect(s.viewing).toBe(3);
    const back = storyReducer(s, { type: "viewChapter", chapter: 1 });
    expect(back.viewing).toBe(1);
    expect(back.current).toBe("3.1");
    expect(storyReducer(s, { type: "viewChapter", chapter: 4 })).toBe(s); // not reached yet
  });
});
