import type { SyncCursor } from "@/lib/connectors/types";
import type { ContentType } from "@/lib/security/types";

export type EmailMetadata = {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt?: string;
};

export type EmailMessage = EmailMetadata & {
  contentType: ContentType;
  body: string;
};

export type EmailPage = {
  messages: EmailMetadata[];
  nextPageToken?: string;
};

export type SyncBatch = {
  messages: EmailMetadata[];
  nextCursor?: SyncCursor;
  cursorExpired: boolean;
};

export type ListEmailsInput = {
  query?: string;
  pageToken?: string;
  limit?: number;
};

export interface EmailConnector {
  readonly id: string;
  readonly mode: "gmail" | "demo";
  listMetadata(input?: ListEmailsInput): Promise<EmailPage>;
  getMessage(id: string): Promise<EmailMessage | null>;
  syncIncremental(cursor?: SyncCursor, limit?: number): Promise<SyncBatch>;
}
