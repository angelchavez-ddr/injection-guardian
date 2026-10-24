import "server-only";
import { google, type gmail_v1 } from "googleapis";
import type { GmailApi, GmailRawMessage } from "@/lib/connectors/email/gmail/gmail-connector";
import { GmailHistoryExpiredError } from "@/lib/connectors/email/gmail/retry";
import { GMAIL_READONLY_SCOPE } from "@/lib/connectors/email/gmail/scopes";
import type { ServerEnv } from "@/lib/env/schema";

export function createOAuthClient(env: ServerEnv) {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function buildGmailAuthUrl(env: ServerEnv): string {
  const client = createOAuthClient(env);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE],
  });
}

export async function exchangeGmailCode(env: ServerEnv, code: string) {
  const client = createOAuthClient(env);
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function createGmailApi(env: ServerEnv): GmailApi {
  const auth = createOAuthClient(env);
  auth.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth });
  return {
    async listMessages(input) {
      const response = await gmail.users.messages.list({
        userId: "me",
        q: input.query,
        pageToken: input.pageToken,
        maxResults: input.limit,
      });
      return {
        messages: (response.data.messages ?? [])
          .filter((message): message is { id: string; threadId?: string | null } => Boolean(message.id))
          .map((message) => ({ id: message.id, threadId: message.threadId ?? undefined })),
        nextPageToken: response.data.nextPageToken ?? undefined,
      };
    },
    async getMessage(id, format) {
      const response = await gmail.users.messages.get({
        userId: "me",
        id,
        format,
        metadataHeaders: format === "metadata" ? ["From", "To", "Subject", "Date"] : undefined,
      });
      return toRawMessage(response.data);
    },
    async listHistory(input) {
      try {
        const response = await gmail.users.history.list({
          userId: "me",
          startHistoryId: input.startHistoryId,
          pageToken: input.pageToken,
          maxResults: input.limit,
          historyTypes: ["messageAdded"],
        });
        const ids = new Set<string>();
        for (const record of response.data.history ?? []) {
          for (const added of record.messagesAdded ?? []) {
            if (added.message?.id) {
              ids.add(added.message.id);
            }
          }
        }
        return {
          messageIds: [...ids],
          nextPageToken: response.data.nextPageToken ?? undefined,
          historyId: response.data.historyId ?? undefined,
        };
      } catch (error) {
        const status = errorStatus(error);
        if (status === 404) {
          throw new GmailHistoryExpiredError();
        }
        throw error;
      }
    },
    async getProfile() {
      const response = await gmail.users.getProfile({ userId: "me" });
      return { historyId: response.data.historyId ?? undefined };
    },
  };
}

function toRawMessage(message: gmail_v1.Schema$Message): GmailRawMessage {
  return {
    id: message.id ?? "",
    threadId: message.threadId ?? undefined,
    snippet: message.snippet ?? undefined,
    internalDate: message.internalDate ?? undefined,
    payload: message.payload
      ? {
          mimeType: message.payload.mimeType ?? undefined,
          headers: message.payload.headers ?? undefined,
          body: message.payload.body ? { data: message.payload.body.data } : undefined,
          parts: message.payload.parts?.map((part) => ({
            mimeType: part.mimeType ?? undefined,
            body: part.body ? { data: part.body.data } : undefined,
            parts: part.parts?.map((child) => ({
              mimeType: child.mimeType ?? undefined,
              body: child.body ? { data: child.body.data } : undefined,
            })),
          })),
        }
      : undefined,
  };
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: number }).code;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}
