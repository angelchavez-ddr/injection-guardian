import type { SyncCursor } from "@/lib/connectors/types";
import type { EmailConnector, EmailMessage, EmailPage, ListEmailsInput, SyncBatch } from "@/lib/connectors/email/types";
import { DEFAULT_SYNC_LIMIT, MAX_SYNC_LIMIT } from "@/lib/security/limits";

export type ImapRecentReader = (limit: number) => Promise<EmailMessage[]>;

export class ImapGmailConnector implements EmailConnector {
  readonly id = "gmail-imap";
  readonly mode = "gmail" as const;
  private readonly cache = new Map<string, EmailMessage>();

  constructor(private readonly readRecent: ImapRecentReader) {}

  async listMetadata(input: ListEmailsInput = {}): Promise<EmailPage> {
    const messages = await this.readRecent(clampLimit(input.limit));
    this.cache.clear();
    for (const message of messages) {
      this.cache.set(message.id, message);
    }
    return {
      messages: messages.map((message) => ({
        id: message.id,
        threadId: message.threadId,
        subject: message.subject,
        from: message.from,
        snippet: message.snippet,
        receivedAt: message.receivedAt,
      })),
    };
  }

  async getMessage(id: string): Promise<EmailMessage | null> {
    return this.cache.get(id) ?? null;
  }

  async syncIncremental(cursor?: SyncCursor, limit?: number): Promise<SyncBatch> {
    const page = await this.listMetadata({ limit, pageToken: cursor?.pageToken });
    return {
      messages: page.messages,
      nextCursor: undefined,
      cursorExpired: false,
    };
  }
}

function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) {
    return DEFAULT_SYNC_LIMIT;
  }
  return Math.min(limit, MAX_SYNC_LIMIT);
}
