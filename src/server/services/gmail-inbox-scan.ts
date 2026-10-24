import "server-only";
import { MailboxAccessError, mailboxErrorCode } from "@/lib/auth/mailbox-token";
import { createGmailApi } from "@/lib/connectors/email/gmail/gmail-api";
import { GmailConnector } from "@/lib/connectors/email/gmail/gmail-connector";
import { countReviewFindings, screenEmailBatch } from "@/lib/connectors/email/screen-batch";
import { getPrisma } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";
import { INBOX_SCAN_LIMIT } from "@/lib/security/limits";
import type { UserSession } from "@/lib/auth/session";
import { loadGmailRefreshToken, saveGmailHistoryId } from "@/server/repositories/user-repository";
import { getAuditRepository } from "@/server/services/security-service";
import { selectAnalyzer } from "@/server/services/select-analyzer";

const INBOX_QUERY = "in:inbox";

export type InboxScanResult = {
  processed: number;
  skipped: number;
  flagged: number;
  bodiesFetched: number;
  analyzerCalls: number;
};

export async function scanConnectedInbox(session: UserSession): Promise<InboxScanResult> {
  if (session.authMethod !== "google") {
    throw new MailboxAccessError("google_required");
  }

  const refreshToken = await loadGmailRefreshToken(session.userId);
  if (!refreshToken) {
    throw new MailboxAccessError("not_connected");
  }

  const env = getServerEnv();
  const api = createGmailApi(env, refreshToken);
  const connector = new GmailConnector(api);
  const connectorId = gmailConnectorId(session.userId);
  const prisma = getPrisma();
  await prisma.connector.upsert({
    where: { id: connectorId },
    update: { status: "connected", name: `Gmail ${session.email}` },
    create: {
      id: connectorId,
      type: "email",
      name: `Gmail ${session.email}`,
      status: "connected",
      configJson: "{}",
    },
  });

  let screened;
  try {
    screened = await screenEmailBatch({
      connector,
      limit: INBOX_SCAN_LIMIT,
      query: INBOX_QUERY,
      fetchBodies: "all",
      externalIdPrefix: `${session.userId}:`,
      connectorId,
      analyzer: selectAnalyzer(env).analyzer,
      repository: getAuditRepository(),
    });
  } catch (error) {
    if (error instanceof MailboxAccessError) {
      throw error;
    }
    throw new MailboxAccessError(mailboxErrorCode(error));
  }

  try {
    const profile = await api.getProfile();
    if (profile.historyId) {
      await saveGmailHistoryId(session.userId, profile.historyId);
    }
  } catch {
    // Findings are already stored. The history cursor is only for a later incremental sync.
  }

  return {
    processed: screened.processed,
    skipped: screened.skipped,
    flagged: countReviewFindings(screened.findings),
    bodiesFetched: screened.bodiesFetched,
    analyzerCalls: screened.analyzerCalls,
  };
}

function gmailConnectorId(userId: string): string {
  return `gmail-user:${userId}`;
}
