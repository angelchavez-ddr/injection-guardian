import type {
  AnalyzerProvider,
  AttackType,
  ContentSource,
  ProposedAction,
  RecommendedAction,
  SecurityIndicator,
  Severity,
} from "@/lib/security/types";

export type SecurityAnalysisInput = {
  source: ContentSource;
  subject?: string;
  excerpt: string;
  truncated: boolean;
  localRiskScore: number;
  localSeverity: Severity;
  localIndicators: SecurityIndicator[];
  localAttackTypes: AttackType[];
  localActions: RecommendedAction[];
};

export type ModelAssessment = {
  provider: AnalyzerProvider;
  model: string;
  reportedConfidence: number;
  advisorySummary: string;
  advisorySeverity: Severity;
  advisoryScore: number;
  indicators: SecurityIndicator[];
  attackTypes: AttackType[];
  defensiveRecommendations: RecommendedAction[];
  proposedActions: ProposedAction[];
};

export interface SecurityAnalyzer {
  analyze(input: SecurityAnalysisInput): Promise<ModelAssessment>;
}
