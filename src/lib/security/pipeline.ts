import { minimizeForModel, normalizeContent } from "@/lib/security/normalization/normalize";
import { detectIndicators } from "@/lib/security/indicators/detect";
import { evaluatePolicy } from "@/lib/security/guardian-policy/engine";
import { DEFAULT_MAX_INPUT_CHARS, DEFAULT_MODEL_EXCERPT_CHARS } from "@/lib/security/limits";
import { defaultRiskConfig, severityForScore, type RiskConfig } from "@/lib/security/risk-engine/config";
import {
  attackTypesFor,
  calculateLocalRisk,
  combineRiskScore,
  recommendedActionsFor,
  triageDecision,
} from "@/lib/security/risk-engine/score";
import type {
  AnalysisView,
  AuditEntryView,
  ContentSource,
  ContentType,
  FindingStatus,
  FindingView,
  PolicyDecisionName,
  PolicyEvaluation,
  ProposedAction,
  TriageDecision,
} from "@/lib/security/types";
import { AnalyzerError } from "@/lib/ai/providers/errors";
import type { SecurityAnalyzer } from "@/lib/ai/providers/types";

export type PipelineInput = {
  content: string;
  contentType?: ContentType;
  source: ContentSource;
  externalId?: string;
  subject?: string;
  sender?: string;
  simulated?: boolean;
  metadataOnly?: boolean;
  forceAnalysis?: boolean;
  maxAiAnalysesRemaining?: number;
  maxInputChars?: number;
};

export type PipelineDependencies = {
  analyzer: SecurityAnalyzer;
  config?: RiskConfig;
  now?: () => Date;
  createId?: () => string;
};

export function runSecurityPipeline(
  input: PipelineInput,
  dependencies: PipelineDependencies,
): Promise<FindingView> {
  return Promise.resolve(runSecurityPipelineSync(input, dependencies));
}

async function runSecurityPipelineSync(
  input: PipelineInput,
  dependencies: PipelineDependencies,
): Promise<FindingView> {
  const config = dependencies.config ?? defaultRiskConfig;
  const now = dependencies.now ?? (() => new Date());
  const createId = dependencies.createId ?? (() => crypto.randomUUID());
  const createdAt = now().toISOString();
  const eventId = createId();
  const correlationId = createId();

  const normalized = normalizeContent({
    content: input.content,
    contentType: input.contentType,
    maxChars: input.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS,
  });
  const detected = detectIndicators(normalized);
  const local = calculateLocalRisk(detected, config);
  const attackTypes = attackTypesFor(local.indicators, input.source);
  const triage = triageDecision(local.riskScore, config);
  const budgetBlocked = triage === "escalate" && input.maxAiAnalysesRemaining === 0;
  const shouldAnalyze = Boolean(input.forceAnalysis) || (triage === "escalate" && !budgetBlocked);

  let analysis: AnalysisView = skippedAnalysis(budgetBlocked);
  let proposedActions: ProposedAction[] = [];

  if (shouldAnalyze) {
    const minimized = minimizeForModel(normalized.scanText, DEFAULT_MODEL_EXCERPT_CHARS);
    try {
      const model = await dependencies.analyzer.analyze({
        source: input.source,
        subject: input.subject,
        excerpt: minimized.text,
        truncated: minimized.truncated,
        localRiskScore: local.riskScore,
        localSeverity: local.severity,
        localIndicators: local.indicators,
        localAttackTypes: attackTypes,
        localActions: local.recommendedActions,
      });
      analysis = {
        provider: model.provider,
        model: model.model,
        status: "completed",
        reportedConfidence: model.reportedConfidence,
        advisoryScore: model.advisoryScore,
        advisorySeverity: model.advisorySeverity,
        advisorySummary: model.advisorySummary,
        modelIndicators: model.indicators,
        advisoryRecommendations: model.defensiveRecommendations,
        error: null,
      };
      proposedActions = model.proposedActions;
    } catch (error) {
      analysis = {
        provider: null,
        model: null,
        status: "failed",
        reportedConfidence: null,
        advisoryScore: null,
        advisorySeverity: null,
        advisorySummary: null,
        modelIndicators: [],
        advisoryRecommendations: [],
        error: error instanceof AnalyzerError ? error.message : "Analyzer request failed.",
      };
    }
  }

  const proposed = proposedActions;
  const riskScore = combineRiskScore(local.riskScore, analysis.advisoryScore);
  const severity = severityForScore(riskScore, config);
  const recommendedActions = recommendedActionsFor(local.indicators, severity);
  const summary = modelRaisedSummary(local.summary, local.riskScore, riskScore);
  let policy = evaluatePolicy(proposed);
  const analysisFailed = analysis.status === "failed";

  if (analysisFailed) {
    policy = {
      decision: "fail_closed",
      reason: "The analyzer response could not be validated. No tool action is authorized.",
      actions: policy.actions.map((action) => ({
        ...action,
        executed: false,
        decision: action.decision === "allow" ? "fail_closed" : action.decision,
      })),
      externalSideEffects: [],
    };
  }

  const requiresHumanReview =
    triage !== "locally_screened" ||
    severity === "medium" ||
    severity === "high" ||
    severity === "critical" ||
    analysisFailed ||
    policy.decision === "deny" ||
    policy.decision === "require_approval" ||
    policy.decision === "fail_closed";

  if (!analysisFailed && policy.decision === "allow" && requiresHumanReview) {
    policy = {
      ...policy,
      decision: "require_approval",
      reason: "No prohibited tool call was authorized. Human review is required before sensitive handling.",
    };
  }

  const status = findingStatus({
    analysisStatus: analysis.status,
    requiresHumanReview,
    triage,
    budgetBlocked,
  });

  const auditLogs = buildAudit({
    createId,
    createdAt,
    correlationId,
    triage,
    status,
    analysis,
    policy,
    budgetBlocked,
  });

  return {
    id: eventId,
    correlationId,
    source: input.source,
    externalId: input.externalId ?? null,
    simulated: Boolean(input.simulated),
    metadataOnly: Boolean(input.metadataOnly),
    status,
    severity,
    riskScore,
    confidence: local.confidence,
    summary,
    requiresHumanReview,
    attackTypes,
    recommendedActions,
    indicators: local.indicators,
    excerpt: normalized.excerpt,
    subject: input.subject ?? null,
    policyDecision: policy.decision,
    policyReason: policy.reason,
    policyActions: policy.actions,
    triage,
    analysis,
    auditLogs,
    createdAt,
  };
}

function skippedAnalysis(budgetBlocked: boolean): AnalysisView {
  return {
    provider: null,
    model: null,
    status: "skipped",
    reportedConfidence: null,
    advisoryScore: null,
    advisorySeverity: null,
    advisorySummary: budgetBlocked
      ? "AI analysis was not run because the batch analysis cap was reached."
      : null,
    modelIndicators: [],
    advisoryRecommendations: [],
    error: null,
  };
}

function modelRaisedSummary(localSummary: string, localScore: number, combinedScore: number): string {
  if (combinedScore > localScore) {
    return `${localSummary} The advisory model score was higher, so the combined score uses the more cautious value.`;
  }
  return localSummary;
}

function findingStatus(input: {
  analysisStatus: AnalysisView["status"];
  requiresHumanReview: boolean;
  triage: TriageDecision;
  budgetBlocked: boolean;
}): FindingStatus {
  if (input.analysisStatus === "failed") {
    return "analysis_failed";
  }
  if (input.requiresHumanReview) {
    return "review_required";
  }
  if (input.analysisStatus === "completed") {
    return "analyzed";
  }
  if (input.triage === "queued" || input.budgetBlocked) {
    return "queued";
  }
  return "locally_screened";
}

function buildAudit(input: {
  createId: () => string;
  createdAt: string;
  correlationId: string;
  triage: TriageDecision;
  status: FindingStatus;
  analysis: AnalysisView;
  policy: PolicyEvaluation;
  budgetBlocked: boolean;
}): AuditEntryView[] {
  const base = {
    createdAt: input.createdAt,
    correlationId: input.correlationId,
  };
  const entries: Array<Omit<AuditEntryView, "id"> & { id?: string }> = [
    {
      ...base,
      stage: "ingest",
      status: "received",
      policyDecision: "not_applicable",
      policyReason: "Content accepted as untrusted data.",
      aiProvider: null,
      aiModel: null,
    },
    {
      ...base,
      stage: "screen",
      status: input.budgetBlocked ? "queued" : input.triage,
      policyDecision: "not_applicable",
      policyReason: input.budgetBlocked
        ? "Local score would escalate, but the AI analysis cap was reached."
        : "Local screening completed. Unflagged content is not marked safe.",
      aiProvider: null,
      aiModel: null,
    },
    {
      ...base,
      stage: "analyze",
      status: input.analysis.status,
      policyDecision: "not_applicable",
      policyReason: input.analysis.error ?? input.analysis.advisorySummary ?? "Analyzer was not called.",
      aiProvider: input.analysis.provider,
      aiModel: input.analysis.model,
    },
    {
      ...base,
      stage: "policy",
      status: input.status,
      policyDecision: input.policy.decision,
      policyReason: input.policy.reason,
      aiProvider: input.analysis.provider,
      aiModel: input.analysis.model,
    },
  ];

  return entries.map((entry) => ({
    id: input.createId(),
    stage: entry.stage,
    status: entry.status,
    policyDecision: entry.policyDecision as PolicyDecisionName,
    policyReason: entry.policyReason,
    aiProvider: entry.aiProvider,
    aiModel: entry.aiModel,
    createdAt: entry.createdAt,
  }));
}
