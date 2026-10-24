import { INDICATOR_IDS, type IndicatorId } from "@/lib/security/types";

export const RADAR_AXES = [
  "phishing",
  "prompt_injection",
  "impersonation",
  "exfiltration",
  "tool_abuse",
] as const;

export type RadarAxis = (typeof RADAR_AXES)[number];

export type RadarScores = Record<RadarAxis, number>;

const AXIS_INDICATORS: Record<RadarAxis, readonly IndicatorId[]> = {
  phishing: ["suspicious_link"],
  prompt_injection: ["instruction_override", "system_prompt_exfiltration", "hidden_markup", "obfuscation"],
  impersonation: ["role_override"],
  exfiltration: ["data_exfiltration"],
  tool_abuse: ["tool_abuse", "privilege_escalation"],
};

export function emptyRadarScores(): RadarScores {
  return {
    phishing: 0,
    prompt_injection: 0,
    impersonation: 0,
    exfiltration: 0,
    tool_abuse: 0,
  };
}

export function radarAxisLabel(axis: RadarAxis): string {
  switch (axis) {
    case "phishing":
      return "Phishing";
    case "prompt_injection":
      return "Prompt injection";
    case "impersonation":
      return "Suplantación";
    case "exfiltration":
      return "Exfiltración";
    case "tool_abuse":
      return "Abuso de herramientas";
    default: {
      const unreachable: never = axis;
      return unreachable;
    }
  }
}

export function aggregateRadarScores(
  findings: Array<{ indicators: Array<{ id: string; weight: number }> }>,
): RadarScores {
  const scores = emptyRadarScores();
  for (const finding of findings) {
    const next = threatRadarScores(finding.indicators);
    for (const axis of RADAR_AXES) {
      scores[axis] = Math.max(scores[axis], next[axis]);
    }
  }
  return scores;
}

export function threatRadarScores(indicators: Array<{ id: string; weight: number }>): RadarScores {
  const scores = emptyRadarScores();
  for (const indicator of indicators) {
    if (!isIndicatorId(indicator.id)) {
      continue;
    }
    for (const axis of RADAR_AXES) {
      if (AXIS_INDICATORS[axis].includes(indicator.id)) {
        scores[axis] = Math.min(100, scores[axis] + indicator.weight);
      }
    }
  }
  return scores;
}

function isIndicatorId(id: string): id is IndicatorId {
  return INDICATOR_IDS.some((indicatorId) => indicatorId === id);
}
