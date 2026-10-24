import { AnalyzerError } from "@/lib/ai/providers/errors";
import type { ModelAssessment } from "@/lib/ai/providers/types";
import { modelOutputSchema } from "@/lib/ai/schemas/model-output";
import type { AnalyzerProvider, SecurityIndicator } from "@/lib/security/types";

export function parseModelPayload(
  raw: string,
  provider: AnalyzerProvider,
  model: string,
): ModelAssessment {
  let json: unknown;
  try {
    json = JSON.parse(unwrapJson(raw));
  } catch {
    throw new AnalyzerError("The analyzer did not return valid JSON.", "malformed");
  }

  const parsed = modelOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new AnalyzerError("The analyzer JSON did not match the required schema.", "malformed");
  }

  const indicators: SecurityIndicator[] = parsed.data.indicators.map((indicator) => ({
    id: `model:${slug(indicator.name)}`,
    name: indicator.name,
    category: "model",
    severity: indicator.severity,
    weight: 0,
    evidence: indicator.evidence,
    source: "model",
  }));

  return {
    provider,
    model,
    reportedConfidence: parsed.data.reportedConfidence,
    advisorySummary: parsed.data.summary,
    advisorySeverity: parsed.data.severity,
    advisoryScore: parsed.data.riskScore,
    indicators,
    attackTypes: parsed.data.attackTypes,
    defensiveRecommendations: parsed.data.defensiveRecommendations,
    proposedActions: parsed.data.proposedActions,
  };
}

function unwrapJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? trimmed;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
