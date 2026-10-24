import "server-only";
import { ImapFlow } from "imapflow";
import type { EmailMessage } from "@/lib/connectors/email/types";
import type { GmailImapCredentials } from "@/lib/connectors/email/gmail/app-password";
import { emailMessageFromSource } from "@/lib/connectors/email/gmail/imap-message";

const GMAIL_IMAP_HOST = "imap.gmail.com";
const GMAIL_IMAP_PORT = 993;
const SOURCE_MAX_BYTES = 200_000;

export async function verifyGmailImapLogin(credentials: GmailImapCredentials): Promise<void> {
  await withGmailImap(credentials, async (client) => {
    await client.mailboxOpen("INBOX", { readOnly: true });
  });
}

export function createGmailImapReader(
  credentials: GmailImapCredentials,
): (limit: number) => Promise<EmailMessage[]> {
  return (limit) => readRecentGmailMessages(credentials, limit);
}

export async function readRecentGmailMessages(
  credentials: GmailImapCredentials,
  limit: number,
): Promise<EmailMessage[]> {
  return withGmailImap(credentials, async (client) => {
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const mailbox = client.mailbox;
      if (!mailbox || mailbox.exists < 1) {
        return [];
      }
      const start = Math.max(1, mailbox.exists - limit + 1);
      const fetched = await client.fetchAll(`${start}:*`, {
        uid: true,
        envelope: true,
        internalDate: true,
        source: { maxLength: SOURCE_MAX_BYTES },
      });
      const messages: EmailMessage[] = [];
      for (const item of fetched) {
        messages.push(
          await emailMessageFromSource({
            uid: item.uid,
            emailId: item.emailId,
            envelope: item.envelope,
            internalDate: item.internalDate,
            source: item.source,
          }),
        );
      }
      messages.reverse();
      return messages.slice(0, limit);
    } finally {
      lock.release();
    }
  });
}

async function withGmailImap<T>(
  credentials: GmailImapCredentials,
  operation: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const client = new ImapFlow({
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    secure: true,
    auth: {
      user: credentials.user,
      pass: credentials.appPassword,
    },
    logger: false,
    logRaw: false,
    emitLogs: false,
    disableAutoIdle: true,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    maxLiteralSize: 1_000_000,
    clientInfo: { name: "Injection Guardian", version: "0.1.0" },
  });

  try {
    await client.connect();
    return await operation(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}
