import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, mailboxErrorCode, MailboxAccessError } from "@/lib/auth/mailbox-token";
import { buildMailboxState, parseMailboxState } from "@/lib/connectors/email/gmail/oauth-state";

describe("mailbox credentials", () => {
  it("round-trips a refresh token and rejects a modified payload", () => {
    const secret = "test-mailbox-secret-value";
    const encrypted = encryptSecret("1//refresh-token", secret);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(encrypted).not.toContain("refresh-token");
    expect(decryptSecret(encrypted, secret)).toBe("1//refresh-token");

    const [version, iv, tag, data] = encrypted.split(".");
    expect(() => decryptSecret(`${version}.${iv}.${tag}.${data}x`, secret)).toThrow(MailboxAccessError);
  });

  it("binds the OAuth state to a user id", () => {
    const userId = "11111111-2222-4333-8444-555555555555";
    const nonce = "a".repeat(32);
    const state = buildMailboxState(userId, nonce);
    expect(parseMailboxState(state)).toEqual({ userId, nonce });
    expect(parseMailboxState(`login:${nonce}`)).toBeNull();
    expect(parseMailboxState("mailbox:not-a-user:abcd")).toBeNull();
  });

  it("classifies Gmail failures without copying the provider message", () => {
    expect(mailboxErrorCode(Object.assign(new Error("token=secret"), { code: 401 }))).toBe("gmail_denied");
    expect(mailboxErrorCode(Object.assign(new Error("slow"), { status: 429 }))).toBe("gmail_rate_limit");
    expect(mailboxErrorCode(new MailboxAccessError("not_connected"))).toBe("not_connected");
    expect(mailboxErrorCode(new Error("invalid_grant"))).toBe("gmail_denied");
    expect(mailboxErrorCode(new Error("boom"))).toBe("gmail_failed");
  });
});
