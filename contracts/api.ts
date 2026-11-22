import { z } from "zod";
import {
  ActorRoleSchema,
  AppealStatusSchema,
  AuditActionSchema,
  CaseStatusSchema,
  HeldTxStatusSchema,
  ImmunityIndicatorTypeSchema,
  ImmunitySeveritySchema,
  ImmunityStatusSchema,
  NEUTRAL_HOLD_MESSAGE,
  PersonaIdSchema,
  RiskLevelSchema,
} from "./enums";
import {
  GraphDataSchema,
  PiiDiffSchema,
  SanitizedEvidenceSchema,
  ScanResultSchema,
  WarRoomDebateSchema,
} from "./agents";

// === Shared API Envelopes & DTOs ===

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const LlmBackendSchema = z.enum(["gemini", "openai", "bedrock"]);
export type LlmBackend = z.infer<typeof LlmBackendSchema>;

export const LlmStatusSchema = z.object({
  backend: LlmBackendSchema,
  configured: z.boolean(),
  vision_model: z.string(),
  reasoning_model: z.string(),
});
export type LlmStatus = z.infer<typeof LlmStatusSchema>;

export const UserConsentDtoSchema = z.object({
  id: z.string(),
  demoSessionId: z.string(),
  userId: z.string(),
  optIn24hHold: z.boolean(),
  guardianId: z.string().nullable(),
  consentVersion: z.string(),
  consentedAt: z.string(),
});
export type UserConsentDto = z.infer<typeof UserConsentDtoSchema>;

export const ImmunityIndicatorDtoSchema = z.object({
  indicatorId: z.string(),
  demoSessionId: z.string(),
  caseId: z.string().nullable(),
  indicatorType: ImmunityIndicatorTypeSchema,
  indicatorValue: z.string(),
  severity: ImmunitySeveritySchema,
  status: ImmunityStatusSchema,
  evidenceSources: z.array(z.string()),
  makerId: z.string(),
  checkerId: z.string().nullable(),
  ttlHours: z.number().int().positive(),
  expiresAt: z.string(),
  rollbackReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ImmunityIndicatorDto = z.infer<typeof ImmunityIndicatorDtoSchema>;

export const ScanSessionDtoSchema = z.object({
  scanId: z.string(),
  demoSessionId: z.string(),
  userId: z.string(),
  inputType: z.string(),
  imageHash: z.string().nullable(),
  riskScore: z.number().int().min(0).max(100),
  riskLevel: RiskLevelSchema,
  result: ScanResultSchema,
  sanitizedEvidence: SanitizedEvidenceSchema,
  piiDiff: PiiDiffSchema,
  immunityHitId: z.string().nullable(),
  modelUsed: z.string(),
  measuredLatencyMs: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type ScanSessionDto = z.infer<typeof ScanSessionDtoSchema>;

export const HeldTransactionDtoSchema = z.object({
  txId: z.string(),
  demoSessionId: z.string(),
  scanId: z.string().nullable(),
  senderId: z.string(),
  senderLabel: z.string(),
  recipientAccount: z.string(),
  recipientBank: z.string(),
  amountVnd: z.number().nonnegative(),
  status: HeldTxStatusSchema,
  neutralMessage: z.string(),
  holdExpiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HeldTransactionDto = z.infer<typeof HeldTransactionDtoSchema>;

// Strictly omits sender balance, CCCD, phone number, and everyday spending history (FR-04.1).
export const FamilyHoldDtoSchema = z.object({
  txId: z.string(),
  senderLabel: z.string(),
  recipientAccount: z.string(),
  recipientBank: z.string(),
  amountVnd: z.number().nonnegative(),
  riskScore: z.number().int().min(0).max(100).nullable(),
  riskLevel: RiskLevelSchema.nullable(),
  sanitizedSummaryVi: z.string(),
  status: HeldTxStatusSchema,
  neutralMessage: z.string(),
  holdExpiresAt: z.string(),
  createdAt: z.string(),
});
export type FamilyHoldDto = z.infer<typeof FamilyHoldDtoSchema>;

export const InvestigationCaseDtoSchema = z.object({
  caseId: z.string(),
  demoSessionId: z.string(),
  txId: z.string().nullable(),
  scenarioCode: z.string(),
  title: z.string(),
  subtitle: z.string(),
  status: CaseStatusSchema,
  graphData: GraphDataSchema,
  caseContext: z.record(z.unknown()),
  sanitizedMinute0: SanitizedEvidenceSchema.nullable(),
  agentDebate: WarRoomDebateSchema.nullable(),
  totalLatencyMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InvestigationCaseDto = z.infer<typeof InvestigationCaseDtoSchema>;

export const AppealDtoSchema = z.object({
  appealId: z.string(),
  demoSessionId: z.string(),
  indicatorId: z.string(),
  appellantName: z.string(),
  appellantNote: z.string(),
  status: AppealStatusSchema,
  reviewerId: z.string().nullable(),
  resolutionNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AppealDto = z.infer<typeof AppealDtoSchema>;

export const AuditLogDtoSchema = z.object({
  logId: z.string(),
  demoSessionId: z.string(),
  actorId: z.string(),
  actorRole: ActorRoleSchema,
  action: AuditActionSchema,
  targetId: z.string(),
  rationale: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});
export type AuditLogDto = z.infer<typeof AuditLogDtoSchema>;

// === Wave 0: Health, Session, Reset ===

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  status: z.enum(["healthy", "degraded"]),
  db: z.enum(["connected", "error"]),
  llm: LlmStatusSchema,
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const SessionResponseSchema = z.object({
  sessionId: z.string().min(1),
  consents: z.array(UserConsentDtoSchema),
  scansCount: z.number().int().nonnegative(),
  holds: z.array(HeldTransactionDtoSchema),
  cases: z.array(InvestigationCaseDtoSchema),
  indicators: z.array(ImmunityIndicatorDtoSchema),
  appeals: z.array(AppealDtoSchema),
  auditLogs: z.array(AuditLogDtoSchema),
  llmStatus: LlmStatusSchema,
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const DemoResetResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string().min(1),
  seededCasesCount: z.number().int().nonnegative(),
});
export type DemoResetResponse = z.infer<typeof DemoResetResponseSchema>;

// === Wave 1: /api/shield/* ===

// POST /api/shield/consent
export const ConsentRequestSchema = z.object({
  userId: PersonaIdSchema.default("USER_B2C_HUNG"),
  optIn24hHold: z.boolean(),
  guardianId: z.string().min(1).nullable().optional(),
  consentVersion: z.string().min(1).default("v1.0-law91-2025"),
});
export type ConsentRequest = z.infer<typeof ConsentRequestSchema>;

export const ConsentResponseSchema = z.object({
  consent: UserConsentDtoSchema,
});
export type ConsentResponse = z.infer<typeof ConsentResponseSchema>;

// POST /api/shield/scan
export const ShieldScanRequestSchema = z
  .object({
    userId: PersonaIdSchema.default("USER_B2C_HUNG"),
    inputType: z.enum(["IMAGE", "TEXT_LOOKUP", "DEMO_PRESET"]),
    presetCode: z.enum(["CASE-01", "CASE-02"]).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
    lookupText: z.string().max(4000).optional(),
    recipientAccount: z.string().max(64).optional(),
    url: z.string().max(512).optional(),
  })
  .refine(
    (v) =>
      Boolean(v.presetCode || v.imageBase64 || v.lookupText || v.recipientAccount || v.url),
    { message: "Provide a demo preset, image, lookup text, account, or URL to scan." },
  );
export type ShieldScanRequest = z.infer<typeof ShieldScanRequestSchema>;

export const ShieldScanResponseSchema = z.object({
  scanId: z.string(),
  result: ScanResultSchema,
  sanitizedEvidence: SanitizedEvidenceSchema,
  piiDiff: PiiDiffSchema,
  immunityHit: ImmunityIndicatorDtoSchema.nullable(),
  immunityTierMatched: z.enum(["NONE", "TIER_1_PRE_VISION", "TIER_2_POST_VISION"]),
  modelUsed: z.string(),
  measuredLatencyMs: z.number().int().nonnegative(),
});
export type ShieldScanResponse = z.infer<typeof ShieldScanResponseSchema>;

// POST /api/shield/transfer
export const TransferRequestSchema = z.object({
  userId: PersonaIdSchema.default("USER_B2C_HUNG"),
  senderLabel: z.string().min(1).default("Bác Hùng (62 tuổi)"),
  scanId: z.string().nullable().optional(),
  recipientAccount: z.string().min(3).max(64),
  recipientBank: z.string().min(1).max(64),
  amountVnd: z.number().positive(),
});
export type TransferRequest = z.infer<typeof TransferRequestSchema>;

export const TransferResponseSchema = z.object({
  txId: z.string(),
  status: HeldTxStatusSchema,
  neutralMessage: z.union([z.literal(NEUTRAL_HOLD_MESSAGE), z.string()]),
  holdExpiresAt: z.string().nullable(),
  transaction: HeldTransactionDtoSchema,
});
export type TransferResponse = z.infer<typeof TransferResponseSchema>;

// POST /api/shield/transfer/[txId]/cancel
export const CancelTransferRequestSchema = z.object({
  userId: PersonaIdSchema.default("USER_B2C_HUNG"),
  reason: z.string().max(500).optional(),
});
export type CancelTransferRequest = z.infer<typeof CancelTransferRequestSchema>;

export const CancelTransferResponseSchema = z.object({
  txId: z.string(),
  status: z.literal("CANCELLED_BY_USER"),
  transaction: HeldTransactionDtoSchema,
});
export type CancelTransferResponse = z.infer<typeof CancelTransferResponseSchema>;

// POST /api/shield/report-cyber
export const ReportCyberRequestSchema = z.object({
  userId: PersonaIdSchema.default("USER_B2C_HUNG"),
  scanId: z.string().min(1),
  note: z.string().max(500).optional(),
});
export type ReportCyberRequest = z.infer<typeof ReportCyberRequestSchema>;

export const ReportCyberResponseSchema = z.object({
  caseId: z.string(),
  caseRecord: InvestigationCaseDtoSchema,
});
export type ReportCyberResponse = z.infer<typeof ReportCyberResponseSchema>;

// GET /api/shield/family/holds
export const FamilyHoldsResponseSchema = z.object({
  holds: z.array(FamilyHoldDtoSchema),
});
export type FamilyHoldsResponse = z.infer<typeof FamilyHoldsResponseSchema>;

// POST /api/shield/family/escalate/[txId]
export const FamilyEscalateRequestSchema = z.object({
  guardianId: z.string().min(1).default("FAMILY_MINH"),
  note: z.string().max(500).optional(),
});
export type FamilyEscalateRequest = z.infer<typeof FamilyEscalateRequestSchema>;

export const FamilyEscalateResponseSchema = z.object({
  txId: z.string(),
  status: z.literal("ESCALATED_TO_B2E"),
  caseId: z.string(),
  caseRecord: InvestigationCaseDtoSchema,
});
export type FamilyEscalateResponse = z.infer<typeof FamilyEscalateResponseSchema>;

// === Wave 2: /api/warroom/* ===

// GET /api/warroom/cases
export const WarRoomCasesResponseSchema = z.object({
  cases: z.array(InvestigationCaseDtoSchema),
});
export type WarRoomCasesResponse = z.infer<typeof WarRoomCasesResponseSchema>;

// POST /api/warroom/cases/[caseId]/investigate
export const InvestigateCaseRequestSchema = z.object({
  actorId: z.string().min(1).default("RISK_MAKER_HUYEN"),
  actorRole: ActorRoleSchema.default("RISK_MAKER"),
});
export type InvestigateCaseRequest = z.infer<typeof InvestigateCaseRequestSchema>;

export const InvestigateCaseResponseSchema = z.object({
  caseId: z.string(),
  status: CaseStatusSchema,
  debate: WarRoomDebateSchema,
});
export type InvestigateCaseResponse = z.infer<typeof InvestigateCaseResponseSchema>;

// POST /api/warroom/cases/[caseId]/decision
export const CaseDecisionRequestSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("DISMISS_FP"),
    actorId: z.string().min(1),
    actorRole: ActorRoleSchema,
    rationale: z.string().min(3).max(1000),
  }),
  z.object({
    decision: z.literal("PROPOSE_IMMUNITY"),
    actorId: z.string().min(1),
    actorRole: ActorRoleSchema,
    rationale: z.string().min(3).max(1000),
    indicatorType: ImmunityIndicatorTypeSchema,
    indicatorValue: z.string().min(2).max(256),
    requestedLevel: z.enum(["SOFT_WARNING", "ACTIVE"]),
    evidenceSources: z.array(z.string().min(1)).min(1),
  }),
]);
export type CaseDecisionRequest = z.infer<typeof CaseDecisionRequestSchema>;

export const CaseDecisionResponseSchema = z.object({
  caseId: z.string(),
  caseStatus: CaseStatusSchema,
  indicator: ImmunityIndicatorDtoSchema.nullable(),
});
export type CaseDecisionResponse = z.infer<typeof CaseDecisionResponseSchema>;

// === Wave 3: /api/immunity/* ===

// GET /api/immunity
export const ImmunityListResponseSchema = z.object({
  indicators: z.array(ImmunityIndicatorDtoSchema),
  appeals: z.array(AppealDtoSchema),
  auditLogs: z.array(AuditLogDtoSchema),
});
export type ImmunityListResponse = z.infer<typeof ImmunityListResponseSchema>;

// POST /api/immunity/[id]/approve
export const ApproveImmunityRequestSchema = z.object({
  checkerId: z.string().min(1),
  checkerRole: ActorRoleSchema,
  rationale: z.string().min(3).max(1000),
  ttlHours: z.number().int().min(1).max(720).default(720),
});
export type ApproveImmunityRequest = z.infer<typeof ApproveImmunityRequestSchema>;

export const ApproveImmunityResponseSchema = z.object({
  indicator: ImmunityIndicatorDtoSchema,
});
export type ApproveImmunityResponse = z.infer<typeof ApproveImmunityResponseSchema>;

// POST /api/immunity/[id]/appeal
export const CreateAppealRequestSchema = z.object({
  appellantName: z.string().min(2).max(120),
  appellantNote: z.string().min(5).max(1500),
  actorId: z.string().min(1).default("USER_B2C_NEW"),
});
export type CreateAppealRequest = z.infer<typeof CreateAppealRequestSchema>;

export const CreateAppealResponseSchema = z.object({
  appeal: AppealDtoSchema,
});
export type CreateAppealResponse = z.infer<typeof CreateAppealResponseSchema>;

// POST /api/immunity/[id]/resolve-appeal
export const ResolveAppealRequestSchema = z.object({
  appealId: z.string().min(1),
  reviewerId: z.string().min(1),
  reviewerRole: ActorRoleSchema,
  resolution: z.enum(["UPHELD", "OVERTURNED_ROLLBACK"]),
  resolutionNote: z.string().min(3).max(1000),
});
export type ResolveAppealRequest = z.infer<typeof ResolveAppealRequestSchema>;

export const ResolveAppealResponseSchema = z.object({
  appeal: AppealDtoSchema,
  indicator: ImmunityIndicatorDtoSchema,
});
export type ResolveAppealResponse = z.infer<typeof ResolveAppealResponseSchema>;

// POST /api/immunity/[id]/rollback
export const RollbackImmunityRequestSchema = z.object({
  checkerId: z.string().min(1),
  checkerRole: ActorRoleSchema,
  reason: z.string().min(3).max(1000),
});
export type RollbackImmunityRequest = z.infer<typeof RollbackImmunityRequestSchema>;

export const RollbackImmunityResponseSchema = z.object({
  indicator: ImmunityIndicatorDtoSchema,
});
export type RollbackImmunityResponse = z.infer<typeof RollbackImmunityResponseSchema>;

// POST /api/immunity/[id]/expire-demo
export const ExpireDemoRequestSchema = z.object({
  checkerId: z.string().min(1),
  checkerRole: ActorRoleSchema,
  rationale: z.string().min(3).max(500).default("Kiểm chứng Lớp 3 TTL (MẪU MÔ PHỎNG)"),
});
export type ExpireDemoRequest = z.infer<typeof ExpireDemoRequestSchema>;

export const ExpireDemoResponseSchema = z.object({
  indicator: ImmunityIndicatorDtoSchema,
});
export type ExpireDemoResponse = z.infer<typeof ExpireDemoResponseSchema>;
