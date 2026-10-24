import { DEMO_SAMPLES } from "@/lib/demo/samples";
import type { SyncCursor } from "@/lib/connectors/types";
import type { EmailConnector, EmailMessage, EmailMetadata, EmailPage, ListEmailsInput, SyncBatch } from "@/lib/connectors/email/types";
import { DEFAULT_SYNC_LIMIT, MAX_SYNC_LIMIT } from "@/lib/security/limits";

const DEMO_HISTORY_ID = "demo-history-1";

export class DemoGmailConnector implements EmailConnector {
  readonly id = "synthetic-inbox";
  readonly mode = "demo" as const;

  async listMetadata(input: ListEmailsInput = {}): Promise<EmailPage> {
    const limit = clampLimit(input.limit);
    const start = input.pageToken ? Number(input.pageToken) : 0;
    const slice = DEMO_SAMPLES.slice(start, start + limit);
    const next = start + limit < DEMO_SAMPLES.length ? String(start + limit) : undefined;
    return {
      messages: slice.map(toMetadata),
      nextPageToken: next,
    };
  }

  async getMessage(id: string): Promise<EmailMessage | null> {
    const sample = DEMO_SAMPLES.find((item) => item.id === id);
    if (!sample) {
      return null;
    }
    return {
      ...toMetadata(sample),
      contentType: sample.contentType,
      body: sample.content,
    };
  }

  async syncIncremental(cursor?: SyncCursor, limit?: number): Promise<SyncBatch> {
    if (cursor?.historyId === DEMO_HISTORY_ID) {
      return { messages: [], nextCursor: { historyId: DEMO_HISTORY_ID }, cursorExpired: false };
    }
    const page = await this.listMetadata({ limit, pageToken: cursor?.pageToken });
    return {
      messages: page.messages,
      nextCursor: { historyId: DEMO_HISTORY_ID },
      cursorExpired: false,
    };
  }
}

function toMetadata(sample: (typeof DEMO_SAMPLES)[number]): EmailMetadata {
  return {
    id: sample.id,
    subject: sample.subject,
    from: sample.sender,
    snippet: sample.snippet,
    receivedAt: "2026-10-24T12:00:00.000Z",
  };
}

function clampLimit(limit: number | undefined): number {
  if (!limit || limit < 1) {
    return DEFAULT_SYNC_LIMIT;
  }
  return Math.min(limit, MAX_SYNC_LIMIT);
}
