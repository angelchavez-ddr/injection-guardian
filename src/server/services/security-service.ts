import "server-only";
import { DEMO_SAMPLES } from "@/lib/demo/samples";
import { getAdminSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";
import { publicRuntimeConfig } from "@/lib/env/public-config";
import { MockAnalyzer } from "@/lib/ai/providers/mock-analyzer";
import { runSecurityPipeline } from "@/lib/security/pipeline";
import type { ContentSource, ContentType, FindingView } from "@/lib/security/types";
import { PrismaAuditRepository, isUniqueConstraintError } from "@/server/repositories/prisma-audit-repository";
import { getMailboxStatus, type MailboxStatus } from "@/server/repositories/user-repository";
import { selectAnalyzer } from "@/server/services/select-analyzer";

const SYNTHETIC_CONNECTOR_ID = "synthetic-inbox";

let repository: PrismaAuditRepository | undefined;
let seedPromise: Promise<void> | undefined;

export function getAuditRepository(): PrismaAuditRepository {
  if (!repository) {
    repository = new PrismaAuditRepository(getPrisma());
  }
  return repository;
}

export async function analyzeSubmission(input: {
  content: string;
  contentType: ContentType;
  source: ContentSource;
  subject?: string;
  sender?: string;
  externalId?: string;
  forceAnalysis?: boolean;
}): Promise<FindingView> {
  const env = getServerEnv();
  const selected = selectAnalyzer(env);
  const finding = await runSecurityPipeline(
    {
      ...input,
      simulated: false,
    },
    { analyzer: selected.analyzer },
  );
  await getAuditRepository().createFinding(finding);
  return finding;
}

export async function ensureDemoSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedDemoFindings().catch((error: unknown) => {
      seedPromise = undefined;
      throw error;
    });
  }
  await seedPromise;
}

async function seedDemoFindings(): Promise<void> {
  const prisma = getPrisma();
  const repo = getAuditRepository();
  await prisma.connector.upsert({
    where: { id: SYNTHETIC_CONNECTOR_ID },
    update: { status: "demo" },
    create: {
      id: SYNTHETIC_CONNECTOR_ID,
      type: "email",
      name: "Synthetic mailbox",
      status: "demo",
      configJson: JSON.stringify({ simulated: true }),
    },
  });

  const analyzer = new MockAnalyzer();
  for (const sample of DEMO_SAMPLES) {
    if (await repo.exists(sample.source, sample.id)) {
      continue;
    }
    const finding = await runSecurityPipeline(
      {
        content: sample.content,
        contentType: sample.contentType,
        source: sample.source,
        externalId: sample.id,
        subject: sample.subject,
        sender: sample.sender,
        simulated: true,
      },
      { analyzer },
    );
    try {
      await repo.createFinding(finding, { connectorId: SYNTHETIC_CONNECTOR_ID });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }
}

export async function getDashboardData() {
  const env = getServerEnv();
  const session = await getAdminSession();
  const config = publicRuntimeConfig(env);
  const mailbox: MailboxStatus = session
    ? await getMailboxStatus(session.userId)
    : { connected: false };
  if (!session && !env.demoMode) {
    return { locked: true as const, config, session: null, mailbox };
  }
  const repo = getAuditRepository();
  const [summary, recent] = await Promise.all([
    repo.summarize(),
    repo.listFindings({ limit: 8 }),
  ]);
  return { locked: false as const, config, session, summary, recent, mailbox };
}

export async function getInvestigationPage(query: { severity?: FindingView["severity"]; status?: FindingView["status"] }) {
  const env = getServerEnv();
  const session = await getAdminSession();
  const config = publicRuntimeConfig(env);
  if (!session && !env.demoMode) {
    return { locked: true as const, config, session: null, findings: [] as FindingView[] };
  }
  const findings = await getAuditRepository().listFindings({
    limit: 100,
    severity: query.severity,
    status: query.status,
  });
  return { locked: false as const, config, session, findings };
}

export async function getInvestigation(id: string) {
  const env = getServerEnv();
  const session = await getAdminSession();
  if (!session && !env.demoMode) {
    return { locked: true as const, finding: null };
  }
  return { locked: false as const, finding: await getAuditRepository().getFinding(id) };
}
