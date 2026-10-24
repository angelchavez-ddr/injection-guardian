export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CONTENT_SOURCES = ["manual", "email", "web", "file", "api"] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export const CONTENT_TYPES = ["text", "html"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const ATTACK_TYPES = [
  "direct_prompt_injection",
  "indirect_prompt_injection",
  "data_exfiltration",
  "tool_abuse",
  "privilege_escalation",
  "social_engineering",
  "obfuscation",
  "policy_bypass",
  "unknown",
] as const;
export type AttackType = (typeof ATTACK_TYPES)[number];

export const RECOMMENDED_ACTIONS = [
  "quarantine",
  "require_human_review",
  "block_tool_execution",
  "strip_untrusted_instructions",
  "notify_analyst",
  "allow_with_monitoring",
  "no_action",
] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export const INDICATOR_IDS = [
  "instruction_override",
  "role_override",
  "system_prompt_exfiltration",
  "data_exfiltration",
  "tool_abuse",
  "privilege_escalation",
  "obfuscation",
  "hidden_markup",
  "suspicious_link",
] as const;
export type IndicatorId = (typeof INDICATOR_IDS)[number];

export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  instruction_override: "Instruction override",
  role_override: "Role override",
  system_prompt_exfiltration: "System prompt exfiltration",
  data_exfiltration: "Data exfiltration",
  tool_abuse: "Tool abuse",
  privilege_escalation: "Privilege escalation",
  obfuscation: "Obfuscation",
  hidden_markup: "Hidden markup",
  suspicious_link: "Suspicious link",
};

export const FINDING_STATUSES = [
  "locally_screened",
  "queued",
  "analyzed",
  "analysis_failed",
  "review_required",
] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const TRIAGE_DECISIONS = ["locally_screened", "queued", "escalate"] as const;
export type TriageDecision = (typeof TRIAGE_DECISIONS)[number];

export const POLICY_DECISIONS = [
  "allow",
  "deny",
  "require_approval",
  "fail_closed",
  "not_applicable",
] as const;
export type PolicyDecisionName = (typeof POLICY_DECISIONS)[number];

export const ANALYZER_PROVIDERS = ["grok", "gemini", "local", "mock"] as const;
export type AnalyzerProvider = (typeof ANALYZER_PROVIDERS)[number];

export const CONFIDENCE_MEANING =
  "Deterministic coverage of local indicators. This is not a calibrated probability of compromise. Model-reported confidence is stored separately and is not treated as one either.";

export type IndicatorSource = "deterministic" | "model";

export type SecurityIndicator = {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  weight: number;
  evidence: string;
  source: IndicatorSource;
};

export type ProposedAction = {
  tool: string;
  arguments: Record<string, unknown>;
};

export type PolicyActionResult = {
  tool: string;
  decision: Exclude<PolicyDecisionName, "not_applicable">;
  reason: string;
  executed: boolean;
};

export type PolicyEvaluation = {
  decision: PolicyDecisionName;
  reason: string;
  actions: PolicyActionResult[];
  externalSideEffects: [];
};

export type AnalysisView = {
  provider: AnalyzerProvider | null;
  model: string | null;
  status: "skipped" | "completed" | "failed";
  reportedConfidence: number | null;
  advisoryScore: number | null;
  advisorySeverity: Severity | null;
  advisorySummary: string | null;
  modelIndicators: SecurityIndicator[];
  advisoryRecommendations: RecommendedAction[];
  error: string | null;
};

export type AuditEntryView = {
  id: string;
  stage: string;
  status: string;
  policyDecision: PolicyDecisionName;
  policyReason: string;
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: string;
};

export type FindingView = {
  id: string;
  correlationId: string;
  source: ContentSource;
  externalId: string | null;
  simulated: boolean;
  metadataOnly: boolean;
  status: FindingStatus;
  severity: Severity;
  riskScore: number;
  confidence: number;
  summary: string;
  requiresHumanReview: boolean;
  attackTypes: AttackType[];
  recommendedActions: RecommendedAction[];
  indicators: SecurityIndicator[];
  excerpt: string | null;
  subject: string | null;
  policyDecision: PolicyDecisionName;
  policyReason: string;
  policyActions: PolicyActionResult[];
  triage: TriageDecision;
  analysis: AnalysisView;
  auditLogs: AuditEntryView[];
  createdAt: string;
};

export type DashboardSummary = {
  total: number;
  awaitingReview: number;
  bySeverity: Record<Severity, number>;
  simulatedCount: number;
};

export class InputLimitError extends Error {
  readonly code = "input_too_large";

  constructor(
    readonly limit: number,
    readonly actual: number,
  ) {
    super(`Content exceeds the ${limit} character limit.`);
    this.name = "InputLimitError";
  }
}

export class EmptyContentError extends Error {
  readonly code = "empty_content";

  constructor() {
    super("Content is empty.");
    this.name = "EmptyContentError";
  }
}
