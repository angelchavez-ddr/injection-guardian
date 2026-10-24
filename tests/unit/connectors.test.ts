import { describe, expect, it } from "vitest";
import { MockAnalyzer } from "@/lib/ai/providers/mock-analyzer";
import { DemoGmailConnector } from "@/lib/connectors/email/gmail/demo-connector";
import { GmailConnector, type GmailApi } from "@/lib/connectors/email/gmail/gmail-connector";
import { GmailHistoryExpiredError, withRetry } from "@/lib/connectors/email/gmail/retry";
import { GMAIL_ALLOWED_OPERATIONS, GMAIL_READONLY_SCOPE } from "@/lib/connectors/email/gmail/scopes";
import { screenEmailBatch } from "@/lib/connectors/email/screen-batch";
import { MemoryAuditRepository } from "@/server/repositories/memory-audit-repository";

describe("email connectors", () => {
  it("lists synthetic metadata without message bodies and supports a history cursor", async () => {
    const connector = new DemoGmailConnector();
    const page = await connector.listMetadata({ limit: 2 });
    expect(page.messages).toHaveLength(2);
    expect(page.messages[0]).not.toHaveProperty("body");
    expect(page.nextPageToken).toBe("2");

    const message = await connector.getMessage(page.messages[0]?.id ?? "");
    expect(message?.body.length).toBeGreaterThan(0);

    const first = await connector.syncIncremental(undefined, 5);
    expect(first.nextCursor?.historyId).toBe("demo-history-1");
    const second = await connector.syncIncremental(first.nextCursor, 5);
    expect(second.messages).toEqual([]);
    expect(second.cursorExpired).toBe(false);
    expect(GMAIL_READONLY_SCOPE).toContain("gmail.readonly");
    expect(GMAIL_ALLOWED_OPERATIONS).not.toContain("users.messages.send");
  });

  it("retries rate limits and reports an expired history cursor", async () => {
    let attempts = 0;
    const value = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw Object.assign(new Error("rate"), { code: 429 });
        }
        return "ok";
      },
      { retries: 3, delaysMs: [0, 0, 0] },
    );
    expect(value).toBe("ok");
    expect(attempts).toBe(3);

    const api: GmailApi = {
      async listMessages() {
        return { messages: [] };
      },
      async getMessage() {
        return null;
      },
      async listHistory() {
        throw new GmailHistoryExpiredError();
      },
      async getProfile() {
        return { historyId: "99" };
      },
    };
    const connector = new GmailConnector(api, [0, 0, 0]);
    const batch = await connector.syncIncremental({ historyId: "1" }, 5);
    expect(batch.cursorExpired).toBe(true);
    expect(batch.messages).toEqual([]);
  });

  it("screens many messages locally and sends only capped candidates to the analyzer", async () => {
    const connector = new DemoGmailConnector();
    const repository = new MemoryAuditRepository();
    const result = await screenEmailBatch({
      connector,
      limit: 20,
      maxAiAnalyses: 2,
      analyzer: new MockAnalyzer(),
      repository,
    });

    expect(result.processed).toBeGreaterThan(5);
    expect(result.analyzerCalls).toBeLessThanOrEqual(2);
    expect(result.bodiesFetched).toBeLessThan(result.processed);
    const hidden = result.findings.find((finding) => finding.externalId === "synthetic-hidden-body");
    expect(hidden?.metadataOnly).toBe(true);
    expect(hidden?.indicators.map((indicator) => indicator.id)).not.toContain("instruction_override");
    expect(repository.findings.length).toBe(result.processed);
  });

  it("fetches a selected message even when its snippet looks benign", async () => {
    const connector = new DemoGmailConnector();
    const result = await screenEmailBatch({
      connector,
      messageIds: ["synthetic-hidden-body"],
      maxAiAnalyses: 1,
      analyzer: new MockAnalyzer(),
    });
    expect(result.bodiesFetched).toBe(1);
    expect(result.findings[0]?.indicators.map((indicator) => indicator.id)).toContain("instruction_override");
  });
});
