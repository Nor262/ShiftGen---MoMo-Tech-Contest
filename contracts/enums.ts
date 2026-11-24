import { z } from "zod";

export const NEUTRAL_HOLD_MESSAGE =
  "Giao dịch đang được xác minh bảo mật (theo chế độ Bảo vệ 24h bạn đã thiết lập)." as const;

export const DEMO_SIMULATION_LABEL = "MẪU MÔ PHỎNG" as const;

export const IMMUNITY_TTL_HOURS = {
  SOFT_WARNING: 72,
  ACTIVE: 720,
} as const;

export const HIGH_RISK_HOLD_THRESHOLD = 75 as const;
export const SMURFING_SINGLE_LIMIT_VND = 10_000_000 as const;
export const SMURFING_DAILY_LIMIT_VND = 20_000_000 as const;

export const ACTOR_ROLES = [
  "USER_B2C",
  "FAMILY_GUARDIAN",
  "RISK_MAKER",
  "RISK_CHECKER",
] as const;
export const ActorRoleSchema = z.enum(ACTOR_ROLES);
export type ActorRole = z.infer<typeof ActorRoleSchema>;

export const PERSONA_IDS = [
  "USER_B2C_HUNG",
  "USER_B2C_NEW",
  "FAMILY_MINH",
  "RISK_MAKER_HUYEN",
  "RISK_CHECKER_TUAN",
] as const;
export const PersonaIdSchema = z.enum(PERSONA_IDS);
export type PersonaId = z.infer<typeof PersonaIdSchema>;

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const RiskLevelSchema = z.enum(RISK_LEVELS);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const SCAN_STATUSES = ["ANALYZED", "INCONCLUSIVE"] as const;
export const ScanStatusSchema = z.enum(SCAN_STATUSES);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

export const SCAM_CATEGORIES = [
  "POLICE_IMPERSONATION",
  "APK_MALWARE_BAIT",
  "BANK_IMPERSONATION",
  "INVESTMENT_SCAM",
  "SOCIAL_ENGINEERING",
  "LEGITIMATE",
  "OTHER",
] as const;
export const ScamCategorySchema = z.enum(SCAM_CATEGORIES);
export type ScamCategory = z.infer<typeof ScamCategorySchema>;

export const PSYCH_CUE_TYPES = [
  "FEAR_THREAT",
  "URGENCY_PRESSURE",
  "SECRECY_ISOLATION",
  "APK_PHISHING_BAIT",
] as const;
export const PsychCueTypeSchema = z.enum(PSYCH_CUE_TYPES);
export type PsychCueType = z.infer<typeof PsychCueTypeSchema>;

export const CYBER_THREAT_TYPES = [
  "APK_ACCESSIBILITY_BAIT",
  "SUSPICIOUS_URL",
  "FAKE_GOV_DOMAIN",
  "REMOTE_CONTROL_APP",
  "CREDENTIAL_PHISHING",
] as const;
export const CyberThreatTypeSchema = z.enum(CYBER_THREAT_TYPES);
export type CyberThreatType = z.infer<typeof CyberThreatTypeSchema>;

/** #6: a guardian must accept an invitation before seeing anything; the owner can revoke it. */
export const GUARDIAN_STATUSES = ["NONE", "INVITED", "ACCEPTED", "REVOKED"] as const;
export const GuardianStatusSchema = z.enum(GUARDIAN_STATUSES);
export type GuardianStatus = z.infer<typeof GuardianStatusSchema>;

export const HELD_TX_STATUSES = [
  "COMPLETED",
  "ON_HOLD_24H",
  "ESCALATED_TO_B2E",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_B2E",
  "RELEASED",
] as const;
export const HeldTxStatusSchema = z.enum(HELD_TX_STATUSES);
export type HeldTxStatus = z.infer<typeof HeldTxStatusSchema>;

export const CASE_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "PENDING_DECISION",
  "IMMUNITY_PROPOSED",
  "DISMISSED_FP",
  "CLOSED",
] as const;
export const CaseStatusSchema = z.enum(CASE_STATUSES);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const AGENT_STATUSES = ["OK", "AGENT_DEGRADED"] as const;
export const AgentStatusSchema = z.enum(AGENT_STATUSES);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const DEBATE_RECOMMENDATIONS = [
  "RECOMMEND_HOLD_AND_PROPOSE_IMMUNITY",
  "RECOMMEND_DISMISS_FP",
  "NEED_MORE_EVIDENCE",
] as const;
export const DebateRecommendationSchema = z.enum(DEBATE_RECOMMENDATIONS);
export type DebateRecommendation = z.infer<typeof DebateRecommendationSchema>;

export const IMMUNITY_INDICATOR_TYPES = [
  "BANK_ACCOUNT",
  "URL_DOMAIN",
  "APK_HASH",
  "PHONE_NUMBER",
  "DEVICE_ID",
] as const;
export const ImmunityIndicatorTypeSchema = z.enum(IMMUNITY_INDICATOR_TYPES);
export type ImmunityIndicatorType = z.infer<typeof ImmunityIndicatorTypeSchema>;

export const IMMUNITY_SEVERITIES = ["SOFT_WARNING", "HIGH_RISK"] as const;
export const ImmunitySeveritySchema = z.enum(IMMUNITY_SEVERITIES);
export type ImmunitySeverity = z.infer<typeof ImmunitySeveritySchema>;

export const IMMUNITY_STATUSES = [
  "SOFT_WARNING",
  "PENDING_CHECKER",
  "ACTIVE",
  "EXPIRED",
  "ROLLED_BACK",
] as const;
export const ImmunityStatusSchema = z.enum(IMMUNITY_STATUSES);
export type ImmunityStatus = z.infer<typeof ImmunityStatusSchema>;

export const APPEAL_STATUSES = [
  "PENDING_HUMAN_REVIEW",
  "UPHELD",
  "OVERTURNED_ROLLBACK",
] as const;
export const AppealStatusSchema = z.enum(APPEAL_STATUSES);
export type AppealStatus = z.infer<typeof AppealStatusSchema>;

export const AUDIT_ACTIONS = [
  "CONSENT_UPDATED",
  "SCAN_COMPLETED",
  "SCAN_REVIEW_REQUESTED",
  "GUARDIAN_INVITED",
  "GUARDIAN_ACCEPTED",
  "GUARDIAN_REVOKED",
  "STR_SUBMISSION_CONFIRMED",
  "TRANSFER_HELD_24H",
  "TRANSFER_COMPLETED",
  "TRANSFER_CANCELLED",
  "CYBER_REPORTED",
  "FAMILY_ESCALATED",
  "HOLD_REVIEW_REQUESTED",
  "INVESTIGATION_RUN",
  "CASE_DISMISSED_FP",
  "IMMUNITY_PROPOSED",
  "IMMUNITY_APPROVED",
  "APPEAL_SUBMITTED",
  "APPEAL_RESOLVED",
  "IMMUNITY_ROLLED_BACK",
  "IMMUNITY_EXPIRED_DEMO",
  "DEMO_RESET",
] as const;
export const AuditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof AuditActionSchema>;
