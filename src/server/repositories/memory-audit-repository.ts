import type { AuditRepository, ListFindingsQuery } from "@/lib/audit/repository";
import { SEVERITIES, type DashboardSummary, type FindingView, type Severity } from "@/lib/security/types";

export class MemoryAuditRepository implements AuditRepository {
  readonly findings: FindingView[] = [];

  async createFinding(finding: FindingView): Promise<void> {
    this.findings.push(finding);
  }

  async listFindings(query: ListFindingsQuery): Promise<FindingView[]> {
    const filtered = this.findings.filter((finding) => {
      if (query.severity && finding.severity !== query.severity) {
        return false;
      }
      if (query.status && finding.status !== query.status) {
        return false;
      }
      return true;
    });
    const start = query.cursor ? filtered.findIndex((finding) => finding.id === query.cursor) + 1 : 0;
    return filtered.slice(Math.max(0, start), Math.max(0, start) + query.limit);
  }

  async getFinding(id: string): Promise<FindingView | null> {
    return this.findings.find((finding) => finding.id === id) ?? null;
  }

  async summarize(): Promise<DashboardSummary> {
    const bySeverity = emptySeverityCounts();
    for (const finding of this.findings) {
      bySeverity[finding.severity] += 1;
    }
    return {
      total: this.findings.length,
      emailCount: this.findings.filter((finding) => finding.source === "email").length,
      awaitingReview: this.findings.filter((finding) => finding.requiresHumanReview).length,
      bySeverity,
      simulatedCount: this.findings.filter((finding) => finding.simulated).length,
    };
  }

  async exists(source: string, externalId: string): Promise<boolean> {
    return this.findings.some((finding) => finding.source === source && finding.externalId === externalId);
  }

  async releaseIfUnflagged(source: string, externalId: string): Promise<boolean> {
    const index = this.findings.findIndex(
      (finding) => finding.source === source && finding.externalId === externalId && finding.riskScore === 0,
    );
    if (index < 0) {
      return false;
    }
    this.findings.splice(index, 1);
    return true;
  }
}

function emptySeverityCounts(): Record<Severity, number> {
  return SEVERITIES.reduce(
    (counts, severity) => {
      counts[severity] = 0;
      return counts;
    },
    {} as Record<Severity, number>,
  );
}
