import type { SyncCursor } from "@/lib/connectors/types";
import type { EmailConnector, EmailMessage, EmailMetadata, EmailPage, ListEmailsInput, SyncBatch } from "@/lib/connectors/email/types";
import { DEFAULT_SYNC_LIMIT, MAX_SYNC_LIMIT } from "@/lib/security/limits";
import { GmailHistoryExpiredError, isRateLimitError, withRetry } from "@/lib/connectors/email/gmail/retry";

export type GmailRawMessage = {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    mimeType?: string;
    headers?: Array<{ name?: string | null; value?: string | null }>;
    body?: { data?: string | null };
    parts?: GmailRawMessage["payload"][];
  };
};

export type GmailApi = {
  listMessages(input: { query?: string; pageToken?: string; limit: number }): Promise<{
    messages: Array<{ id: string; threadId?: string }>;
    nextPageToken?: string;
  }>;
  getMessage(id: string, format: "metadata" | "full"): Promise<GmailRawMessage | null>;
  listHistory(input: { startHistoryId: string; pageToken?: string; limit: number }): Promise<{
    messageIds: string[];
    nextPageToken?: string;
    historyId?: string;
  }>;
  getProfile(): Promise<{ historyId?: string }>;
};

export class GmailConnector implements EmailConnector {
  readonly id = "gmail";
  readonly mode = "gmail" as const;

  constructor(
    private readonly api: GmailApi,
    private readonly retryDelaysMs: number[] = [250, 500, 1000],
  ) {}

  async listMetadata(input: ListEmailsInput = {}): Promise<EmailPage> {
    const limit = clampLimit(input.limit);
    const listed = await this.retry(() =>
      this.api.listMessages({ query: input.query, pageToken: input.pageToken, limit }),
    );
    const messages: EmailMetadata[] = [];
    for (const item of listed.messages) {
      const raw = await this.retry(() => this.api.getMessage(item.id, "metadata"));
      if (raw) {
        messages.push(toMetadata(raw));
      }
    }
    return { messages, nextPageToken: listed.nextPageToken };
  }

  async getMessage(id: string): Promise<EmailMessage | null> {
    const raw = await this.retry(() => this.api.getMessage(id, "full"));
    if (!raw) {
      return null;
    }
    const body = extractBody(raw);
    return {
      ...toMetadata(raw),
      contentType: body.contentType,
      body: body.text,
    };
  }

  async syncIncremental(cursor?: SyncCursor, limit?: number): Promise<SyncBatch> {
    const capped = clampLimit(limit);
    if (!cursor?.historyId) {
      const [page, profile] = await Promise.all([
        this.listMetadata({ limit: capped, pageToken: cursor?.pageToken }),
        this.retry(() => this.api.getProfile()),
      ]);
      return {
        messages: page.messages,
        nextCursor: { historyId: profile.historyId, pageToken: page.nextPageToken },
        cursorExpired: false,
      };
    }

    try {
      const history = await this.retry(() =>
        this.api.listHistory({
          startHistoryId: cursor.historyId ?? "",
          pageToken: cursor.pageToken,
          limit: capped,
        }),
      );
      const messages: EmailMetadata[] = [];
      for (const id of history.messageIds.slice(0, capped)) {
        const raw = await this.retry(() => this.api.getMessage(id, "metadata"));
        if (raw) {
          messages.push(toMetadata(raw));
        }
      }
      return {
        messages,
        nextCursor: { historyId: history.historyId ?? cursor.historyId, pageToken: history.nextPageToken },
        cursorExpired: false,
      };
    } catch (error) {
      if (error instanceof GmailHistoryExpiredError) {
        return { messages: [], nextCursor: undefined, cursorExpired: true };
      }
      throw error;
    }
  }

  private retry<T>(operation: () => Promise<T>): Promise<T> {
    return withRetry(operation, {
      retries: this.retryDelaysMs.length,
      delaysMs: this.retryDelaysMs,
      isRetryable: isRateLimitError,
    });
  }
}

function toMetadata(message: GmailRawMessage): EmailMetadata {
  return {
    id: message.id,
    threadId: message.threadId,
    subject: header(message, "Subject") ?? "(no subject)",
    from: header(message, "From") ?? "(unknown)",
    snippet: message.snippet ?? "",
    receivedAt: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : undefined,
  };
}

function header(message: GmailRawMessage, name: string): string | undefined {
  const match = message.payload?.headers?.find(
    (item) => item.name?.toLowerCase() === name.toLowerCase(),
  );
  return match?.value ?? undefined;
}

function extractBody(message: GmailRawMessage): { text: string; contentType: "text" | "html" } {
  const plain = findPart(message.payload, "text/plain");
  if (plain) {
    return { text: decodeBase64Url(plain), contentType: "text" };
  }
  const html = findPart(message.payload, "text/html");
  if (html) {
    return { text: decodeBase64Url(html), contentType: "html" };
  }
  return { text: message.snippet ?? "", contentType: "text" };
}

function findPart(
  part: GmailRawMessage["payload"] | undefined,
  mimeType: string,
): string | undefined {
  if (!part) {
    return undefined;
  }
  if (part.mimeType === mimeType && part.body?.data) {
    return part.body.data;
  }
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) {
    return DEFAULT_SYNC_LIMIT;
  }
  return Math.min(limit, MAX_SYNC_LIMIT);
}
