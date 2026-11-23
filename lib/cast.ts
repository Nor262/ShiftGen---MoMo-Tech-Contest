import { DAILY_QUOTA_FALLBACK_MODEL, TIER1_IMMUNITY_MODEL } from "@/lib/session/shield";

/** The one cast list for every displayed name in the demo (ticket #18). Codes stay in `.tech-only`. */
export const CAST = {
  USER_B2C_HUNG: { name: "Bác Hùng", role: "Người dùng, 62 tuổi" },
  USER_B2C_NEW: { name: "Người dùng mới", role: "Người dùng" },
  FAMILY_MINH: { name: "Chị Minh", role: "Con gái, người giám hộ" },
  RISK_MAKER_HUYEN: { name: "Chuyên viên Huyền", role: "Đội Risk — người đề xuất" },
  RISK_CHECKER_TUAN: { name: "Chuyên viên Tuấn", role: "Đội Risk — người duyệt" },
  RISK_CHECKER_LAN: { name: "Chuyên viên Lan", role: "Đội Risk — người duyệt" },
} as const;

export type CastId = keyof typeof CAST;

/** Display name for an actor id; unknown ids are shown as-is rather than hidden. */
export function castName(id: string): string {
  return id in CAST ? CAST[id as CastId].name : id;
}

/** Model names as a viewer should read them: non-AI paths are said in words, real models unchanged. */
export function modelDisplayName(model: string): string {
  if (model === TIER1_IMMUNITY_MODEL) return "Tra cứu Kho Miễn dịch (không dùng AI)";
  if (model === DAILY_QUOTA_FALLBACK_MODEL) return "Quy tắc dự phòng khi hết hạn mức (không dùng AI)";
  return model;
}
