import "server-only";
import { z } from "zod";
import type { AuditRepository, ListFindingsQuery } from "@/lib/audit/repository";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  ANALYZER_PROVIDERS,
  ATTACK_TYPES,
  POLICY_DECISIONS,
  RECOMMENDED_ACTIONS,
  SEVERITIES,
  type AuditEntryView,
  type AnalysisView,
  type DashboardSummary,
  type FindingView,
  type PolicyActionResult,
  type Severity,
} from "@/lib/security/types";

const indicatorSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    severity: z.enum(SEVERITIES),
    weight: z.number(),
    evidence: z.string(),
    source: z.enum(["deterministic", "model"]),
  }),
);

const policyActionSchema = z.array(
  z.object({
    tool: z.string(),
    decision: z.enum(["allow", "deny", "require_approval", "fail_closed"]),
    reason: z.string(),
    executed: z.boolean(),
  }),
);

const findingInclude = {
  analysis: true,
  auditLogs: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.SecurityEventInclude;

type FindingRow = Prisma.SecurityEventGetPayload<{ include: typeof findingInclude }>;

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createFinding(finding: FindingView, options?: { connectorId?: string }): Promise<void> {
    await this.prisma.securityEvent.create({
      data: {
        id: finding.id,
        correlationId: finding.correlationId,
        connectorId: options?.connectorId,
        source: finding.source,
        externalId: finding.externalId,
        simulated: finding.simulated,
        metadataOnly: finding.metadataOnly,
        stage: "review",
        status: finding.status,
        severity: finding.severity,
        riskScore: finding.riskScore,
        confidence: finding.confidence,
        summary: finding.summary,
        requiresHumanReview: finding.requiresHumanReview,
        attackTypesJson: JSON.stringify(finding.attackTypes),
        recommendationsJson: JSON.stringify(finding.recommendedActions),
        indicatorsJson: JSON.stringify(finding.indicators),
        excerpt: finding.excerpt,
        subject: finding.subject,
        policyDecision: finding.policyDecision,
        policyReason: finding.policyReason,
        policyActionsJson: JSON.stringify(finding.policyActions),
        createdAt: new Date(finding.createdAt),
        analysis: {
          create: {
            id: `${finding.id}:analysis`,
            provider: finding.analysis.provider ?? "none",
            model: finding.analysis.model,
            status: finding.analysis.status,
            reportedConfidence: finding.analysis.reportedConfidence,
            advisoryScore: finding.analysis.advisoryScore,
            advisorySeverity: finding.analysis.advisorySeverity,
            advisorySummary: finding.analysis.advisorySummary,
            modelIndicatorsJson: JSON.stringify(finding.analysis.modelIndicators),
            advisoryRecommendationsJson: JSON.stringify(finding.analysis.advisoryRecommendations),
            error: finding.analysis.error,
          },
        },
        auditLogs: {
          create: finding.auditLogs.map((entry, index) => ({
            id: entry.id,
            correlationId: finding.correlationId,
            stage: entry.stage,
            status: entry.status,
            source: finding.source,
            externalId: finding.externalId,
            severity: finding.severity,
            riskScore: finding.riskScore,
            indicatorsJson: JSON.stringify(
              finding.indicators.map((indicator) => ({ id: indicator.id, evidence: indicator.evidence })),
            ),
            policyDecision: entry.policyDecision,
            policyReason: entry.policyReason,
            aiProvider: entry.aiProvider,
            aiModel: entry.aiModel,
            createdAt: new Date(Date.parse(entry.createdAt) + index),
          })),
        },
      },
    });
  }

  async listFindings(query: ListFindingsQuery): Promise<FindingView[]> {
    const rows = await this.prisma.securityEvent.findMany({
      where: {
        severity: query.severity,
        status: query.status,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: findingInclude,
    });
    return rows.map(toFinding);
  }

  async getFinding(id: string): Promise<FindingView | null> {
    const row = await this.prisma.securityEvent.findUnique({
      where: { id },
      include: findingInclude,
    });
    return row ? toFinding(row) : null;
  }

  async summarize(): Promise<DashboardSummary> {
    const [total, awaitingReview, simulatedCount, grouped] = await Promise.all([
      this.prisma.securityEvent.count(),
      this.prisma.securityEvent.count({ where: { requiresHumanReview: true } }),
      this.prisma.securityEvent.count({ where: { simulated: true } }),
      this.prisma.securityEvent.groupBy({
        by: ["severity"],
        _count: { _all: true },
      }),
    ]);
    const bySeverity = emptySeverityCounts();
    for (const row of grouped) {
      if (isSeverity(row.severity)) {
        bySeverity[row.severity] = row._count._all;
      }
    }
    return { total, awaitingReview, bySeverity, simulatedCount };
  }

  async exists(source: string, externalId: string): Promise<boolean> {
    const row = await this.prisma.securityEvent.findFirst({
      where: { source, externalId },
      select: { id: true },
    });
    return row !== null;
  }
}

function toFinding(row: FindingRow): FindingView {
  const analysis = row.analysis;
  const view: AnalysisView = {
    provider: analysis && analysis.provider !== "none" ? asProvider(analysis.provider) : null,
    model: analysis?.model ?? null,
    status: asAnalysisStatus(analysis?.status),
    reportedConfidence: analysis?.reportedConfidence ?? null,
    advisoryScore: analysis?.advisoryScore ?? null,
    advisorySeverity: asSeverity(analysis?.advisorySeverity),
    advisorySummary: analysis?.advisorySummary ?? null,
    modelIndicators: readJson(analysis?.modelIndicatorsJson, indicatorSchema, []),
    advisoryRecommendations: readJson(
      analysis?.advisoryRecommendationsJson,
      z.array(z.enum(RECOMMENDED_ACTIONS)),
      [],
    ),
    error: analysis?.error ?? null,
  };

  return {
    id: row.id,
    correlationId: row.correlationId,
    source: asSource(row.source),
    externalId: row.externalId,
    simulated: row.simulated,
    metadataOnly: row.metadataOnly,
    status: asFindingStatus(row.status),
    severity: asSeverity(row.severity) ?? "info",
    riskScore: row.riskScore,
    confidence: row.confidence,
    summary: row.summary,
    requiresHumanReview: row.requiresHumanReview,
    attackTypes: readJson(row.attackTypesJson, z.array(z.enum(ATTACK_TYPES)), []),
    recommendedActions: readJson(row.recommendationsJson, z.array(z.enum(RECOMMENDED_ACTIONS)), []),
    indicators: readJson(row.indicatorsJson, indicatorSchema, []),
    excerpt: row.excerpt,
    subject: row.subject,
    policyDecision: asPolicy(row.policyDecision),
    policyReason: row.policyReason,
    policyActions: readJson(row.policyActionsJson, policyActionSchema, []) as PolicyActionResult[],
    triage: triageFromStatus(row.status),
    analysis: view,
    auditLogs: row.auditLogs.map(toAudit),
    createdAt: row.createdAt.toISOString(),
  };
}

function toAudit(row: FindingRow["auditLogs"][number]): AuditEntryView {
  return {
    id: row.id,
    stage: row.stage,
    status: row.status,
    policyDecision: asPolicy(row.policyDecision),
    policyReason: row.policyReason,
    aiProvider: row.aiProvider,
    aiModel: row.aiModel,
    createdAt: row.createdAt.toISOString(),
  };
}

function readJson<T>(raw: string | null | undefined, schema: z.ZodType<T>, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

function emptySeverityCounts(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

function isSeverity(value: string): value is Severity {
  return SEVERITIES.includes(value as Severity);
}

function asSeverity(value: string | null | undefined): Severity | null {
  if (value && isSeverity(value)) {
    return value;
  }
  return null;
}

function asSource(value: string): FindingView["source"] {
  if (value === "manual" || value === "email" || value === "web" || value === "file" || value === "api") {
    return value;
  }
  return "manual";
}

function asFindingStatus(value: string): FindingView["status"] {
  if (
    value === "locally_screened" ||
    value === "queued" ||
    value === "analyzed" ||
    value === "analysis_failed" ||
    value === "review_required"
  ) {
    return value;
  }
  return "queued";
}

function asPolicy(value: string): FindingView["policyDecision"] {
  if (POLICY_DECISIONS.includes(value as FindingView["policyDecision"])) {
    return value as FindingView["policyDecision"];
  }
  return "fail_closed";
}

function asProvider(value: string): AnalysisView["provider"] {
  if ((ANALYZER_PROVIDERS as readonly string[]).includes(value)) {
    return value as AnalysisView["provider"];
  }
  return null;
}

function asAnalysisStatus(value: string | undefined): AnalysisView["status"] {
  if (value === "skipped" || value === "completed" || value === "failed") {
    return value;
  }
  return "skipped";
}

function triageFromStatus(status: string): FindingView["triage"] {
  if (status === "locally_screened") {
    return "locally_screened";
  }
  if (status === "queued") {
    return "queued";
  }
  return "escalate";
}

export function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
