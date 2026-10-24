import type { DetectedIndicator } from "@/lib/security/indicators/detect";
import { defaultRiskConfig, severityForScore, type RiskConfig } from "@/lib/security/risk-engine/config";
import {
  INDICATOR_IDS,
  INDICATOR_LABELS,
  type AttackType,
  type ContentSource,
  type IndicatorId,
  type RecommendedAction,
  type SecurityIndicator,
  type Severity,
  type TriageDecision,
} from "@/lib/security/types";
import { clamp } from "@/lib/utils";

export type LocalAssessment = {
  severity: Severity;
  riskScore: number;
  confidence: number;
  indicators: SecurityIndicator[];
  recommendedActions: RecommendedAction[];
  summary: string;
};

export function calculateLocalRisk(
  detected: DetectedIndicator[],
  config: RiskConfig = defaultRiskConfig,
): LocalAssessment {
  const indicators = detected.map((match) => toIndicator(match, config));
  const riskScore = clamp(
    indicators.reduce((sum, indicator) => sum + indicator.weight, 0),
    0,
    100,
  );
  const severity = severityForScore(riskScore, config);
  const confidence = deterministicConfidence(indicators);
  const recommendedActions = recommendedActionsFor(indicators, severity);
  return {
    severity,
    riskScore,
    confidence,
    indicators,
    recommendedActions,
    summary: localSummary(indicators, riskScore),
  };
}

export function triageDecision(score: number, config: RiskConfig = defaultRiskConfig): TriageDecision {
  if (score >= config.triage.escalateAt) {
    return "escalate";
  }
  if (score >= config.triage.queueAt) {
    return "queued";
  }
  return "locally_screened";
}

/**
 * Coverage of distinct local signals. A low value means little evidence was
 * found, not that the content is safe. It is not a probability of compromise.
 */
export function deterministicConfidence(indicators: Array<{ id: string }>): number {
  if (indicators.length === 0) {
    return 0.2;
  }
  const distinct = new Set(indicators.map((indicator) => indicator.id)).size;
  return Math.min(0.95, Math.round((0.3 + distinct * 0.12) * 100) / 100);
}

export function recommendedActionsFor(
  indicators: Array<{ id: string }>,
  severity: Severity,
): RecommendedAction[] {
  const ids = new Set(knownIndicatorIds(indicators));
  const actions = new Set<RecommendedAction>();

  if (ids.size === 0) {
    actions.add("allow_with_monitoring");
  }
  if (ids.has("instruction_override") || ids.has("role_override") || ids.has("hidden_markup")) {
    actions.add("strip_untrusted_instructions");
  }
  if (
    ids.has("data_exfiltration") ||
    ids.has("tool_abuse") ||
    ids.has("privilege_escalation") ||
    ids.has("system_prompt_exfiltration")
  ) {
    actions.add("block_tool_execution");
    actions.add("quarantine");
  }
  if (severity === "medium" || severity === "high" || severity === "critical") {
    actions.add("require_human_review");
  }
  if (severity === "high" || severity === "critical") {
    actions.add("notify_analyst");
  }
  if (severity === "low" || severity === "info") {
    actions.add("allow_with_monitoring");
  }
  if (actions.size === 0) {
    actions.add("no_action");
  }

  return [...actions];
}

export function attackTypesFor(
  indicators: Array<{ id: string }>,
  source: ContentSource,
): AttackType[] {
  const ids = new Set(knownIndicatorIds(indicators));
  const types = new Set<AttackType>();
  const injection =
    ids.has("instruction_override") ||
    ids.has("role_override") ||
    ids.has("hidden_markup") ||
    ids.has("system_prompt_exfiltration");

  if (injection) {
    types.add(source === "manual" ? "direct_prompt_injection" : "indirect_prompt_injection");
  }
  if (ids.has("data_exfiltration")) {
    types.add("data_exfiltration");
  }
  if (ids.has("tool_abuse")) {
    types.add("tool_abuse");
  }
  if (ids.has("privilege_escalation")) {
    types.add("privilege_escalation");
    types.add("policy_bypass");
  }
  if (ids.has("obfuscation")) {
    types.add("obfuscation");
  }
  if (ids.has("suspicious_link") && types.size === 0) {
    types.add("social_engineering");
  }
  if (ids.size > 0 && types.size === 0) {
    types.add("unknown");
  }

  return [...types];
}

export function combineRiskScore(localScore: number, advisoryScore: number | null): number {
  if (advisoryScore === null) {
    return localScore;
  }
  return Math.max(localScore, advisoryScore);
}

function knownIndicatorIds(indicators: Array<{ id: string }>): IndicatorId[] {
  return indicators.map((indicator) => indicator.id).filter(isIndicatorId);
}

function isIndicatorId(value: string): value is IndicatorId {
  return INDICATOR_IDS.some((id) => id === value);
}

function toIndicator(match: DetectedIndicator, config: RiskConfig): SecurityIndicator {
  const weight = config.weights[match.id];
  return {
    id: match.id,
    name: INDICATOR_LABELS[match.id],
    category: match.id,
    severity: severityForScore(weight, config),
    weight,
    evidence: match.evidence,
    source: "deterministic",
  };
}

function localSummary(indicators: SecurityIndicator[], riskScore: number): string {
  if (indicators.length === 0) {
    return "Local screening found no configured suspicion indicators. That is not a determination that the content is safe.";
  }
  const names = indicators.map((indicator) => indicator.name).join(", ");
  return `Local screening matched ${indicators.length} indicator(s): ${names}. Heuristic score ${riskScore} of 100.`;
}
