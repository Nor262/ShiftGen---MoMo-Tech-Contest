/** Client-safe replay label (DESIGN.md "Replay Notice"). Server-only loading lives in lib/replay.ts. */
export const REPLAY_NOTICE_PREFIX = "Kết quả đã chạy thật lúc" as const;

export function formatReplayNoticeVi(record: { recordedAt: string; modelUsed: string }): string {
  const at = new Date(record.recordedAt).toLocaleString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }); // "23/11/2026, 21:06"
  const [date, time] = at.split(", ");
  return `${REPLAY_NOTICE_PREFIX} ${time} ${date} · model ${record.modelUsed} · phát lại`;
}

export function isReplayNotice(notice: string | undefined): boolean {
  return Boolean(notice?.startsWith(REPLAY_NOTICE_PREFIX));
}
