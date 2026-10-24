import "server-only";
import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/db/client";

export type StoredFinding = {
  id: string;
  packageName: string;
  currentVersion: string;
  fixedVersion?: string;
  osvId: string;
  summary: string;
  severity: string;
  patched: boolean;
};

export type StoredScan = {
  id: string;
  repository: string;
  status: string;
  summary: string;
  branch?: string;
  pullRequestUrl?: string;
  previewUrl?: string;
  previewStatus?: string;
  createdAt: string;
  findings: StoredFinding[];
};

export async function saveScan(input: Omit<StoredScan, "id" | "createdAt" | "findings"> & {
  findings: Array<Omit<StoredFinding, "id">>;
}): Promise<StoredScan> {
  const prisma = getPrisma();
  const id = randomUUID();
  const created = await prisma.scanRun.create({
    data: {
      id,
      repository: input.repository,
      status: input.status,
      summary: input.summary,
      branch: input.branch,
      pullRequestUrl: input.pullRequestUrl,
      previewUrl: input.previewUrl,
      previewStatus: input.previewStatus,
      findings: {
        create: input.findings.map((finding) => ({
          id: randomUUID(),
          packageName: finding.packageName,
          currentVersion: finding.currentVersion,
          fixedVersion: finding.fixedVersion,
          osvId: finding.osvId,
          summary: finding.summary,
          severity: finding.severity,
          patched: finding.patched,
        })),
      },
    },
    include: { findings: true },
  });
  return toStoredScan(created);
}

export async function listScans(limit = 12): Promise<StoredScan[]> {
  const prisma = getPrisma();
  const rows = await prisma.scanRun.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { findings: { orderBy: { severity: "asc" } } },
  });
  return rows.map(toStoredScan);
}

function toStoredScan(row: {
  id: string;
  repository: string;
  status: string;
  summary: string;
  branch: string | null;
  pullRequestUrl: string | null;
  previewUrl: string | null;
  previewStatus: string | null;
  createdAt: Date;
  findings: Array<{
    id: string;
    packageName: string;
    currentVersion: string;
    fixedVersion: string | null;
    osvId: string;
    summary: string;
    severity: string;
    patched: boolean;
  }>;
}): StoredScan {
  return {
    id: row.id,
    repository: row.repository,
    status: row.status,
    summary: row.summary,
    branch: row.branch ?? undefined,
    pullRequestUrl: row.pullRequestUrl ?? undefined,
    previewUrl: row.previewUrl ?? undefined,
    previewStatus: row.previewStatus ?? undefined,
    createdAt: row.createdAt.toISOString(),
    findings: row.findings.map((finding) => ({
      id: finding.id,
      packageName: finding.packageName,
      currentVersion: finding.currentVersion,
      fixedVersion: finding.fixedVersion ?? undefined,
      osvId: finding.osvId,
      summary: finding.summary,
      severity: finding.severity,
      patched: finding.patched,
    })),
  };
}
