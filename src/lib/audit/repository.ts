import type { DashboardSummary, FindingView } from "@/lib/security/types";

export type ListFindingsQuery = {
  severity?: FindingView["severity"];
  status?: FindingView["status"];
  limit: number;
  cursor?: string;
};

export interface AuditRepository {
  createFinding(finding: FindingView, options?: { connectorId?: string }): Promise<void>;
  listFindings(query: ListFindingsQuery): Promise<FindingView[]>;
  getFinding(id: string): Promise<FindingView | null>;
  summarize(): Promise<DashboardSummary>;
  exists(source: string, externalId: string): Promise<boolean>;
}
