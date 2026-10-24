import { simpleParser, type AddressObject } from "mailparser";
import type { EmailMessage } from "@/lib/connectors/email/types";

const SNIPPET_CHARS = 180;

export type ImapSourceMessage = {
  uid: number;
  emailId?: string;
  envelope?: {
    subject?: string;
    from?: Array<{ name?: string; address?: string }>;
    date?: Date | string;
  };
  internalDate?: Date | string;
  source?: Buffer;
};

export async function emailMessageFromSource(message: ImapSourceMessage): Promise<EmailMessage> {
  if (message.source && message.source.length > 0) {
    try {
      const parsed = await simpleParser(message.source);
      const html = typeof parsed.html === "string" ? parsed.html.trim() : "";
      const text = parsed.text?.trim() ?? "";
      const subject = parsed.subject?.trim() || envelopeSubject(message) || "(sin asunto)";
      const receivedAt = toIso(parsed.date ?? message.internalDate ?? message.envelope?.date);
      return {
        id: messageId(message),
        subject,
        from: formatParsedFrom(parsed.from) ?? formatEnvelopeFrom(message),
        snippet: snippet(text || stripTags(html) || subject),
        receivedAt,
        contentType: html ? "html" : "text",
        body: html || text || subject,
      };
    } catch {
      // A truncated or malformed source still yields envelope metadata. The raw bytes are not logged.
    }
  }

  const subject = envelopeSubject(message) || "(sin asunto)";
  return {
    id: messageId(message),
    subject,
    from: formatEnvelopeFrom(message),
    snippet: snippet(subject),
    receivedAt: toIso(message.internalDate ?? message.envelope?.date),
    contentType: "text",
    body: subject,
  };
}

function messageId(message: ImapSourceMessage): string {
  const emailId = message.emailId?.trim();
  return emailId && emailId.length > 0 ? emailId : String(message.uid);
}

function envelopeSubject(message: ImapSourceMessage): string {
  return message.envelope?.subject?.trim() ?? "";
}

function formatParsedFrom(from: AddressObject | AddressObject[] | undefined): string | undefined {
  if (!from) {
    return undefined;
  }
  if (Array.isArray(from)) {
    const text = from.map((item) => item.text.trim()).filter((item) => item.length > 0).join(", ");
    return text.length > 0 ? text : undefined;
  }
  const text = from.text.trim();
  return text.length > 0 ? text : undefined;
}

function formatEnvelopeFrom(message: ImapSourceMessage): string {
  const first = message.envelope?.from?.[0];
  if (!first) {
    return "(desconocido)";
  }
  if (first.name && first.address) {
    return `${first.name} <${first.address}>`;
  }
  return first.address || first.name || "(desconocido)";
}

function snippet(value: string): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= SNIPPET_CHARS) {
    return flat;
  }
  return `${flat.slice(0, SNIPPET_CHARS)}…`;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

function toIso(value: Date | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}
