import { z } from "zod";
import {
  ScanResultSchema,
  ShieldScanRequestSchema,
  WarRoomDebateSchema,
  type ScanResult,
  type WarRoomDebate,
} from "@/contracts";
import case01 from "@/data/replays/scan-CASE-01.json";
import warroomCase01 from "@/data/replays/warroom-CASE-01.json";
import { formatReplayNoticeVi, replayModelLabelAt } from "@/lib/replay-label";
import { DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL } from "@/lib/session/shield";

/**
 * Replay mode (ticket #11): when a live LLM call fails at runtime, a demo preset may show the
 * result of a previously recorded REAL run — always labelled as a replay. Never used when LLM
 * credentials are missing (that stays 503 LLM_NOT_CONFIGURED per AGENTS.md).
 */
const NON_LLM_MODELS: string[] = [DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL];

const PresetCodeSchema = ShieldScanRequestSchema.innerType().shape.presetCode.unwrap();
const RealModelSchema = z
  .string()
  .min(1)
  .refine((m) => !NON_LLM_MODELS.includes(m), "replay must come from a real LLM run");

const ScanReplayRecordSchema = z.object({
  kind: z.literal("scan"),
  presetCode: PresetCodeSchema,
  recordedAt: z.string().datetime(),
  modelUsed: RealModelSchema,
  measuredLatencyMs: z.number().int().positive(),
  result: ScanResultSchema,
});
export type ScanReplayRecord = z.infer<typeof ScanReplayRecordSchema>;

export function parseScanReplayRecord(raw: unknown): ScanReplayRecord {
  return ScanReplayRecordSchema.parse(raw);
}

/** Recorded with `node scripts/record-scan-replay.mjs <CASE>` against a live LLM. */
// shortcut: each new recording needs its JSON imported here by hand; switch to a generated index if presets grow.
export const SCAN_REPLAY_RECORDS: Partial<
  Record<ScanReplayRecord["presetCode"], ScanReplayRecord>
> = {
  "CASE-01": parseScanReplayRecord(case01),
};

export function loadScanReplay(
  presetCode: ScanReplayRecord["presetCode"],
): { result: ScanResult; modelUsed: string; noticeVi: string } | null {
  const record = SCAN_REPLAY_RECORDS[presetCode];
  if (!record) return null;
  return {
    result: record.result,
    modelUsed: record.modelUsed,
    noticeVi: formatReplayNoticeVi(record),
  };
}

const WarRoomReplayRecordSchema = z.object({
  kind: z.literal("warroom"),
  scenarioCode: PresetCodeSchema,
  recordedAt: z.string().datetime(),
  modelUsed: RealModelSchema,
  debate: WarRoomDebateSchema,
});
export type WarRoomReplayRecord = z.infer<typeof WarRoomReplayRecordSchema>;

export function parseWarRoomReplayRecord(raw: unknown): WarRoomReplayRecord {
  return WarRoomReplayRecordSchema.parse(raw);
}

/** Recorded with `node scripts/record-warroom-replay.mjs CASE-01` against a live LLM (ticket #15). */
// shortcut: each new recording needs its JSON imported here by hand; switch to a generated index if scenarios grow.
const WARROOM_REPLAY_RECORDS: Partial<
  Record<WarRoomReplayRecord["scenarioCode"], WarRoomReplayRecord>
> = {
  "CASE-01": parseWarRoomReplayRecord(warroomCase01),
};

/** The labelled replay debate for a case's scenario (DB string), or null when none was recorded. */
export function loadWarRoomReplay(scenarioCode: string): { debate: WarRoomDebate } | null {
  const parsed = PresetCodeSchema.safeParse(scenarioCode);
  const record = parsed.success ? WARROOM_REPLAY_RECORDS[parsed.data] : undefined;
  if (!record) return null;
  return { debate: { ...record.debate, model_used: replayModelLabelAt(record) } };
}
