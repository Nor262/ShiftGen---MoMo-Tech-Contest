import { z } from "zod";
import {
  AgentStatusSchema,
  CyberThreatTypeSchema,
  DebateRecommendationSchema,
  PsychCueTypeSchema,
  RiskLevelSchema,
  ScamCategorySchema,
  ScanStatusSchema,
} from "./enums";

// === Pillar 1: B2C Minute-00 Vision & NLP ===

export const PsychManipulationCueSchema = z.object({
  type: PsychCueTypeSchema,
  quote_vi: z.string(),
  explanation_vi: z.string(),
});
export type PsychManipulationCue = z.infer<typeof PsychManipulationCueSchema>;

export const CyberThreatFlagSchema = z.object({
  type: CyberThreatTypeSchema,
  indicator: z.string(),
  severity: RiskLevelSchema,
  detail_vi: z.string(),
});
export type CyberThreatFlag = z.infer<typeof CyberThreatFlagSchema>;

export const ExtractedEntitiesSchema = z.object({
  recipient_account: z.string().nullable().default(null),
  recipient_bank: z.string().nullable().default(null),
  urls: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  amount_vnd: z.number().nonnegative().nullable().default(null),
  apk_filenames: z.array(z.string()).default([]),
});
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

export const ScanResultSchema = z.object({
  status: ScanStatusSchema,
  risk_score: z.number().int().min(0).max(100),
  risk_level: RiskLevelSchema,
  scam_category: ScamCategorySchema,
  visual_tampering_flags: z.array(z.string()),
  psych_manipulation_cues: z.array(PsychManipulationCueSchema),
  cyber_threat_flags: z.array(CyberThreatFlagSchema),
  extracted_entities: ExtractedEntitiesSchema,
  calm_guidance_vi: z.string().min(1),
  deescalation_questions_vi: z.array(z.string()),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

// === Pillar 1 -> 2 Bridge: PII Redaction & Sanitized Evidence ===

export const PiiFieldTypeSchema = z.enum(["CCCD", "PHONE", "BALANCE", "SPENDING_HISTORY"]);
export type PiiFieldType = z.infer<typeof PiiFieldTypeSchema>;

export const PiiRedactionItemSchema = z.object({
  field_type: PiiFieldTypeSchema,
  token: z.string(),
  original_masked: z.string(),
  count: z.number().int().positive(),
});
export type PiiRedactionItem = z.infer<typeof PiiRedactionItemSchema>;

export const PiiDiffSchema = z.object({
  redactions: z.array(PiiRedactionItemSchema),
  total_redacted: z.number().int().nonnegative(),
  before_sample: z.string(),
  after_sample: z.string(),
});
export type PiiDiff = z.infer<typeof PiiDiffSchema>;

export const SanitizedEvidenceSchema = z.object({
  summary_vi: z.string().min(1),
  scam_category: ScamCategorySchema,
  risk_score: z.number().int().min(0).max(100),
  risk_level: RiskLevelSchema,
  psych_cue_types: z.array(PsychCueTypeSchema),
  cyber_threat_types: z.array(CyberThreatTypeSchema),
  recipient_account: z.string().nullable().default(null),
  recipient_bank: z.string().nullable().default(null),
  suspicious_urls: z.array(z.string()).default([]),
  sanitized_excerpt: z.string(),
  contains_raw_image: z.literal(false),
  created_at: z.string().datetime(),
});
export type SanitizedEvidence = z.infer<typeof SanitizedEvidenceSchema>;

// === Shared Transaction Graph (lib/graph, prisma/seed, warroom-ui) ===

export const GraphNodeTypeSchema = z.enum([
  "VICTIM",
  "MULE",
  "SCAMMER",
  "MERCHANT",
  "DEVICE",
  "IP",
  "BANK_ACCOUNT",
]);
export type GraphNodeType = z.infer<typeof GraphNodeTypeSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  type: GraphNodeTypeSchema,
  label: z.string().min(1),
  subtitle: z.string().optional(),
  risk_score: z.number().int().min(0).max(100).optional(),
  flagged: z.boolean().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeTypeSchema = z.enum([
  "TRANSFER",
  "SHARED_DEVICE",
  "SHARED_IP",
  "SIMO_LINK",
]);
export type GraphEdgeType = z.infer<typeof GraphEdgeTypeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  edge_type: GraphEdgeTypeSchema,
  label: z.string().optional(),
  amount_vnd: z.number().nonnegative().optional(),
  tx_count: z.number().int().positive().optional(),
  timestamp: z.string().optional(),
  flagged: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphDataSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  summary_badge: z.string().optional(),
});
export type GraphData = z.infer<typeof GraphDataSchema>;

// === Pillar 2: B2E War-Room 4+1 Agents ===

export const GraphTracerOutputSchema = z.object({
  status: AgentStatusSchema,
  latency_ms: z.number().nonnegative(),
  flagged_node_ids: z.array(z.string()),
  smurfing_detected: z.boolean(),
  mule_cluster_detected: z.boolean(),
  key_findings: z.array(z.string()),
  risk_contribution: z.number().int().min(0).max(100),
  error_message: z.string().optional(),
});
export type GraphTracerOutput = z.infer<typeof GraphTracerOutputSchema>;

export const EvidenceCorrelatorOutputSchema = z.object({
  status: AgentStatusSchema,
  latency_ms: z.number().nonnegative(),
  minute0_matched: z.boolean(),
  simo_flag_matched: z.boolean(),
  cyber_indicator_matched: z.boolean(),
  independent_sources: z.array(z.string()),
  key_findings: z.array(z.string()),
  risk_contribution: z.number().int().min(0).max(100),
  error_message: z.string().optional(),
});
export type EvidenceCorrelatorOutput = z.infer<typeof EvidenceCorrelatorOutputSchema>;

export const PolicyChunkSchema = z.object({
  chunk_id: z.string().min(1),
  document_code: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  content_vi: z.string().min(1),
  tags: z.array(z.string()),
  score: z.number().optional(),
});
export type PolicyChunk = z.infer<typeof PolicyChunkSchema>;

export const ComplianceRagOutputSchema = z.object({
  status: AgentStatusSchema,
  latency_ms: z.number().nonnegative(),
  cited_chunks: z.array(PolicyChunkSchema),
  policy_notes_vi: z.array(z.string()),
  insurance_eligibility_vi: z.string(),
  human_review_required: z.boolean(),
  error_message: z.string().optional(),
});
export type ComplianceRagOutput = z.infer<typeof ComplianceRagOutputSchema>;

export const FalsePositiveDefenderOutputSchema = z.object({
  status: AgentStatusSchema,
  latency_ms: z.number().nonnegative(),
  innocence_confidence: z.number().int().min(0).max(100),
  benign_signals: z.array(z.string()),
  counter_arguments_vi: z.array(z.string()),
  recommend_dismiss: z.boolean(),
  error_message: z.string().optional(),
});
export type FalsePositiveDefenderOutput = z.infer<typeof FalsePositiveDefenderOutputSchema>;

export const CskhEmpatheticCardSchema = z.object({
  customer_anxiety_level: z.enum(["LOW", "MEDIUM", "HIGH"]),
  funds_status_vi: z.string().min(1),
  empathetic_openers_vi: z.array(z.string()).min(1).max(5),
  do_not_say_vi: z.array(z.string()).default([]),
});
export type CskhEmpatheticCard = z.infer<typeof CskhEmpatheticCardSchema>;

export const DebateSynthesisSchema = z.object({
  recommendation: DebateRecommendationSchema,
  eligible_for_active_immunity: z.boolean(),
  eligibility_reason_vi: z.string().min(1),
  independent_sources: z.array(z.string()),
  risk_summary_points: z.array(z.string()),
  defense_summary_points: z.array(z.string()),
  cskh_empathetic_card: CskhEmpatheticCardSchema,
});
export type DebateSynthesis = z.infer<typeof DebateSynthesisSchema>;

export const WarRoomDebateSchema = z.object({
  agents: z.object({
    graph_tracer: GraphTracerOutputSchema,
    evidence_correlator: EvidenceCorrelatorOutputSchema,
    compliance_rag: ComplianceRagOutputSchema,
    false_positive_defender: FalsePositiveDefenderOutputSchema,
  }),
  synthesis: DebateSynthesisSchema,
  retrieved_chunks: z.array(PolicyChunkSchema),
  total_latency_ms: z.number().nonnegative(),
  model_used: z.string().min(1),
});
export type WarRoomDebate = z.infer<typeof WarRoomDebateSchema>;

export const WarRoomAgentKeySchema = z.enum([
  "graph_tracer",
  "evidence_correlator",
  "compliance_rag",
  "false_positive_defender",
]);
export type WarRoomAgentKey = z.infer<typeof WarRoomAgentKeySchema>;

export const WarRoomSseEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("agent_started"),
    agent: WarRoomAgentKeySchema,
    timestamp: z.string().datetime(),
  }),
  z.object({
    event: z.literal("agent_completed"),
    agent: WarRoomAgentKeySchema,
    status: AgentStatusSchema,
    latency_ms: z.number().nonnegative(),
    output: z.union([
      GraphTracerOutputSchema,
      EvidenceCorrelatorOutputSchema,
      ComplianceRagOutputSchema,
      FalsePositiveDefenderOutputSchema,
    ]),
  }),
  z.object({
    event: z.literal("synthesis_started"),
    timestamp: z.string().datetime(),
  }),
  z.object({
    event: z.literal("completed"),
    debate: WarRoomDebateSchema,
  }),
  z.object({
    event: z.literal("error"),
    code: z.string(),
    message: z.string(),
  }),
]);
export type WarRoomSseEvent = z.infer<typeof WarRoomSseEventSchema>;
