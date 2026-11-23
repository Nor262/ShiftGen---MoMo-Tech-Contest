import { CAST, type CastId } from "@/lib/cast";

const { USER_B2C_HUNG: hung, FAMILY_MINH: minh, RISK_MAKER_HUYEN: huyen, RISK_CHECKER_TUAN: tuan } = CAST;

/** The story stage (/story): 4 chapters × 2 beats, one primary action at a time (spec §5.2). */
export type BeatId = "1.1" | "1.2" | "2.1" | "2.2" | "3.1" | "3.2" | "4.1" | "4.2";
export type Chapter = 1 | 2 | 3 | 4;

export interface StoryBeat {
  id: BeatId;
  chapter: Chapter;
  actor: CastId;
  buttonLabel: string;
  lockedReason: string;
  narration: string;
}

export const STORY_BEATS: readonly StoryBeat[] = [
  {
    id: "1.1",
    chapter: 1,
    actor: "USER_B2C_HUNG",
    buttonLabel: "Bật Bảo vệ 24h",
    lockedReason: "Mở ngay từ đầu",
    narration: `Phút 00 — ${hung.name} bật Bảo vệ 24h và chọn con gái là ${minh.name} làm người giám hộ.`,
  },
  {
    id: "1.2",
    chapter: 1,
    actor: "USER_B2C_HUNG",
    buttonLabel: "Quét tin nhắn này",
    lockedReason: "Mở sau khi bật Bảo vệ 24h",
    narration: `Phút 00 — ${hung.name} nhận tin nhắn Zalo tự xưng công an, dọa bắt giam, và quét thử.`,
  },
  {
    id: "2.1",
    chapter: 2,
    actor: "USER_B2C_HUNG",
    buttonLabel: "Chuyển 9.500.000đ",
    lockedReason: "Mở sau khi quét tin nhắn",
    narration: `Phút 89 — Hoảng sợ, ${hung.name} mở app định chuyển lệnh đầu tiên 9,5 triệu.`,
  },
  {
    id: "2.2",
    chapter: 2,
    actor: "FAMILY_MINH",
    buttonLabel: "Chuyển cấp cho đội Risk",
    lockedReason: "Mở sau khi tiền được tạm giữ",
    narration: `Phút 89 — ${minh.name} nhận thẻ báo (đã ẩn thông tin cá nhân) và chuyển cấp cho đội Risk.`,
  },
  {
    id: "3.1",
    chapter: 3,
    actor: "RISK_MAKER_HUYEN",
    buttonLabel: "Chạy War-Room 4 agent",
    lockedReason: "Mở sau khi vụ được chuyển cho đội Risk",
    narration: "Phút 90+ — Đội Risk cho 4 agent đọc dòng tiền, bằng chứng và quy định.",
  },
  {
    id: "3.2",
    chapter: 3,
    actor: "RISK_MAKER_HUYEN",
    buttonLabel: "Đề xuất Kết luận rủi ro cao",
    lockedReason: "Mở sau khi War-Room chạy xong",
    narration: `Phút 90+ — ${huyen.name} đọc lập luận rồi tự quyết định đề xuất.`,
  },
  {
    id: "4.1",
    chapter: 4,
    actor: "RISK_CHECKER_TUAN",
    buttonLabel: "Duyệt kích hoạt chỉ báo",
    lockedReason: "Mở sau khi có đề xuất",
    narration: `Một người thứ hai, ${tuan.name}, kiểm tra lại và duyệt.`,
  },
  {
    id: "4.2",
    chapter: 4,
    actor: "USER_B2C_NEW",
    buttonLabel: "Thử với người dùng mới",
    lockedReason: "Mở sau khi chỉ báo được duyệt",
    narration: "Hôm sau, một người khác nhận đúng tài khoản lừa đảo đó và tra cứu.",
  },
];

export interface StoryState {
  /** First beat not yet run ("done" when the story is over). */
  current: BeatId | "done";
  /** Beat on stage: the one about to run, or a finished one whose effect is being shown. */
  shown: BeatId;
  done: BeatId[];
  running: boolean;
  error: string | null;
  viewing: Chapter;
  results: Partial<Record<BeatId, unknown>>;
}

export type StoryAction =
  | { type: "beatStarted" }
  | { type: "beatSucceeded"; result: unknown }
  | { type: "beatFailed"; message: string }
  | { type: "next" }
  | { type: "viewChapter"; chapter: Chapter };

export function initialStoryState(): StoryState {
  return { current: "1.1", shown: "1.1", done: [], running: false, error: null, viewing: 1, results: {} };
}

function chapterOf(id: BeatId): Chapter {
  return STORY_BEATS.find((b) => b.id === id)!.chapter;
}

export function isBeatLocked(s: StoryState, id: BeatId): boolean {
  return s.current !== id && !s.done.includes(id);
}

const onStage = (s: StoryState, shown: BeatId): StoryState => ({ ...s, shown, viewing: chapterOf(shown) });

export function storyReducer(s: StoryState, a: StoryAction): StoryState {
  switch (a.type) {
    case "beatStarted":
      return s.running || s.shown !== s.current ? s : { ...s, running: true, error: null };
    case "beatFailed":
      return s.running ? { ...s, running: false, error: a.message } : s;
    case "beatSucceeded": {
      if (!s.running || s.current === "done") return s;
      const beat = s.current;
      const next = STORY_BEATS[STORY_BEATS.findIndex((b) => b.id === beat) + 1];
      // the stage stays on `beat` so its effect is visible; "next" moves on
      return {
        ...s,
        running: false,
        error: null,
        done: [...s.done, beat],
        results: { ...s.results, [beat]: a.result },
        current: next ? next.id : "done",
      };
    }
    case "next":
      return s.current === "done" || s.shown === s.current || s.running ? s : onStage(s, s.current);
    case "viewChapter": {
      const reached = s.current === "done" ? 4 : chapterOf(s.current);
      if (a.chapter > reached) return s;
      if (s.current !== "done" && a.chapter === chapterOf(s.current)) return onStage(s, s.current);
      const finished = STORY_BEATS.filter((b) => b.chapter === a.chapter && s.done.includes(b.id));
      return onStage(s, finished[finished.length - 1].id);
    }
  }
}
