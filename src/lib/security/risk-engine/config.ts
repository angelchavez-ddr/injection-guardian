import type { IndicatorId, Severity } from "@/lib/security/types";

export type RiskConfig = {
  weights: Record<IndicatorId, number>;
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  triage: {
    queueAt: number;
    escalateAt: number;
  };
};

/**
 * Initial score = min(100, sum of unique indicator weights).
 * Severity is derived only from that score and these thresholds.
 * Triage uses the local score before any model output is considered.
 */
export const defaultRiskConfig: RiskConfig = {
  weights: {
    instruction_override: 36,
    role_override: 28,
    system_prompt_exfiltration: 40,
    data_exfiltration: 34,
    tool_abuse: 30,
    privilege_escalation: 40,
    obfuscation: 18,
    hidden_markup: 22,
    suspicious_link: 16,
  },
  thresholds: {
    critical: 85,
    high: 60,
    medium: 30,
    low: 10,
  },
  triage: {
    queueAt: 15,
    escalateAt: 35,
  },
};

export function severityForScore(score: number, config: RiskConfig = defaultRiskConfig): Severity {
  if (score >= config.thresholds.critical) {
    return "critical";
  }
  if (score >= config.thresholds.high) {
    return "high";
  }
  if (score >= config.thresholds.medium) {
    return "medium";
  }
  if (score >= config.thresholds.low) {
    return "low";
  }
  return "info";
}
