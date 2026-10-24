import type { EmailConnector, EmailMetadata } from "@/lib/connectors/email/types";
import { detectIndicators } from "@/lib/security/indicators/detect";
import { normalizeContent } from "@/lib/security/normalization/normalize";
import { runSecurityPipeline } from "@/lib/security/pipeline";
import { DEFAULT_BATCH_AI_CAP, DEFAULT_MAX_INPUT_CHARS, DEFAULT_SYNC_LIMIT } from "@/lib/security/limits";
import { defaultRiskConfig, type RiskConfig } from "@/lib/security/risk-engine/config";
import { calculateLocalRisk, triageDecision } from "@/lib/security/risk-engine/score";
import type { FindingView, Severity } from "@/lib/security/types";
import type { SecurityAnalyzer } from "@/lib/ai/providers/types";
import type { AuditRepository } from "@/lib/audit/repository";

export type ScreenBatchResult = {
  processed: number;
  skipped: number;
  bodiesFetched: number;
  analyzerCalls: number;
  findings: FindingView[];
};

const REVIEW_SEVERITIES = new Set<Severity>(["critical", "high", "medium"]);

export function countReviewFindings(findings: FindingView[]): number {
  return findings.filter(
    (finding) => finding.requiresHumanReview || REVIEW_SEVERITIES.has(finding.severity),
  ).length;
}

export async function screenEmailBatch(input: {
  connector: EmailConnector;
  messageIds?: string[];
  query?: string;
  limit?: number;
  maxAiAnalyses?: number;
  fetchBodies?: "triage" | "all";
  externalIdPrefix?: string;
  connectorId?: string;
  analyzer: SecurityAnalyzer;
  repository?: AuditRepository;
  config?: RiskConfig;
}): Promise<ScreenBatchResult> {
  const config = input.config ?? defaultRiskConfig;
  const limit = input.limit ?? DEFAULT_SYNC_LIMIT;
  const fetchBodies = input.fetchBodies ?? "triage";
  let remaining = input.maxAiAnalyses ?? DEFAULT_BATCH_AI_CAP;
  let bodiesFetched = 0;
  let analyzerCalls = 0;
  let skipped = 0;
  const findings: FindingView[] = [];

  const countingAnalyzer: SecurityAnalyzer = {
    analyze: async (analysisInput) => {
      analyzerCalls += 1;
      return input.analyzer.analyze(analysisInput);
    },
  };

  const persist = async (finding: FindingView) => {
    if (finding.analysis.status !== "skipped") {
      remaining = Math.max(0, remaining - 1);
    }
    if (input.repository) {
      try {
        await input.repository.createFinding(finding, { connectorId: input.connectorId });
      } catch (error) {
        if (isUniqueConflict(error)) {
          skipped += 1;
          return;
        }
        throw error;
      }
    }
    findings.push(finding);
  };

  const alreadyStored = async (externalId: string): Promise<boolean> => {
    if (!input.repository) {
      return false;
    }
    await input.repository.releaseIfUnflagged("email", externalId);
    return input.repository.exists("email", externalId);
  };

  if (input.messageIds) {
    for (const id of input.messageIds.slice(0, limit)) {
      const externalId = externalIdFor(id, input.externalIdPrefix);
      if (await alreadyStored(externalId)) {
        skipped += 1;
        continue;
      }
      const message = await input.connector.getMessage(id);
      bodiesFetched += 1;
      if (!message) {
        continue;
      }
      const finding = await runSecurityPipeline(
        {
          content: message.body,
          contentType: message.contentType,
          source: "email",
          externalId,
          subject: message.subject,
          sender: message.from,
          simulated: input.connector.mode === "demo",
          metadataOnly: false,
          maxAiAnalysesRemaining: remaining,
        },
        { analyzer: countingAnalyzer, config },
      );
      await persist(finding);
    }
    return { processed: findings.length, skipped, bodiesFetched, analyzerCalls, findings };
  }

  const page = await input.connector.listMetadata({ limit, query: input.query });
  for (const metadata of page.messages) {
    const externalId = externalIdFor(metadata.id, input.externalIdPrefix);
    if (await alreadyStored(externalId)) {
      skipped += 1;
      continue;
    }
    if (fetchBodies === "all" || previewEscalates(metadata, config)) {
      const message = await input.connector.getMessage(metadata.id);
      bodiesFetched += 1;
      if (message) {
        const finding = await runSecurityPipeline(
          {
            content: message.body,
            contentType: message.contentType,
            source: "email",
            externalId,
            subject: message.subject,
            sender: message.from,
            simulated: input.connector.mode === "demo",
            metadataOnly: false,
            maxAiAnalysesRemaining: remaining,
          },
          { analyzer: countingAnalyzer, config },
        );
        await persist(finding);
        continue;
      }
    }

    const finding = await runSecurityPipeline(
      {
        content: `${metadata.subject}\n${metadata.snippet}`,
        contentType: "text",
        source: "email",
        externalId,
        subject: metadata.subject,
        sender: metadata.from,
        simulated: input.connector.mode === "demo",
        metadataOnly: true,
        maxAiAnalysesRemaining: remaining,
      },
      { analyzer: countingAnalyzer, config },
    );
    await persist(finding);
  }

  return { processed: findings.length, skipped, bodiesFetched, analyzerCalls, findings };
}

function previewEscalates(metadata: EmailMetadata, config: RiskConfig): boolean {
  const normalized = normalizeContent({
    content: `${metadata.subject}\n${metadata.snippet}`,
    contentType: "text",
    maxChars: DEFAULT_MAX_INPUT_CHARS,
  });
  const local = calculateLocalRisk(detectIndicators(normalized), config);
  return triageDecision(local.riskScore, config) === "escalate";
}

function externalIdFor(id: string, prefix: string | undefined): string {
  return prefix ? `${prefix}${id}` : id;
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
