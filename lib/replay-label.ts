/** Client-safe replay label (DESIGN.md "Replay Notice"). Server-only loading lives in lib/replay.ts. */
export const REPLAY_NOTICE_PREFIX = "Kết quả đã chạy thật lúc" as const;

/** "21:06 23/11/2026" in Vietnam time. */
function formatRecordedAtVi(recordedAt: string): string {
  const at = new Date(recordedAt).toLocaleString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }); // "23/11/2026, 21:06"
  const [date, time] = at.split(", ");
  return `${time} ${date}`;
}

export function formatReplayNoticeVi(record: { recordedAt: string; modelUsed: string }): string {
  return `${REPLAY_NOTICE_PREFIX} ${formatRecordedAtVi(record.recordedAt)} · model ${record.modelUsed} · phát lại`;
}

const REPLAY_MODEL_MARK = " (phát lại";

/** Stored/returned model name for a replayed result, so DB rows and audit logs never read as live. */
export function replayModelLabel(modelUsed: string): string {
  return `${modelUsed}${REPLAY_MODEL_MARK})`;
}

/**
 * War-Room variant: the debate only carries model_used (contracts frozen), so the recording time
 * travels inside it — "Qwen3.8-27B (phát lại · chạy thật 23:07 23/11/2026)".
 */
export function replayModelLabelAt(record: { recordedAt: string; modelUsed: string }): string {
  return `${record.modelUsed}${REPLAY_MODEL_MARK} · chạy thật ${formatRecordedAtVi(record.recordedAt)})`;
}

/** True for a model name produced by replayModelLabel (War-Room debates carry the label in model_used). */
export function isReplayModel(model: string): boolean {
  return model.includes(REPLAY_MODEL_MARK);
}

// shortcut: replay is detected from the notice prefix because contracts are frozen (no boolean field);
// add an explicit `replay` flag to ShieldScanResponse when the Orchestrator reopens contracts.
export function isReplayNotice(notice: string | undefined): boolean {
  return Boolean(notice?.startsWith(REPLAY_NOTICE_PREFIX));
}
