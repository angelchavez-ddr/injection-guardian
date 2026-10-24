import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const TOKEN_SALT = "injection-guardian-gmail-v1";

export const MAILBOX_ERROR_CODES = [
  "google_required",
  "not_connected",
  "unreadable_token",
  "encryption_unavailable",
  "invalid_app_password",
  "imap_auth_failed",
  "gmail_denied",
  "gmail_rate_limit",
  "gmail_failed",
] as const;

export type MailboxErrorCode = (typeof MAILBOX_ERROR_CODES)[number];

export class MailboxAccessError extends Error {
  readonly name = "MailboxAccessError";

  constructor(readonly code: MailboxErrorCode) {
    super(code);
  }
}

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(
    ".",
  );
}

export function decryptSecret(payload: string, secret: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new MailboxAccessError("unreadable_token");
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(secret),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]);
    return plain.toString("utf8");
  } catch (error) {
    if (error instanceof MailboxAccessError) {
      throw error;
    }
    throw new MailboxAccessError("unreadable_token");
  }
}

export function mailboxErrorCode(error: unknown): MailboxErrorCode {
  if (error instanceof MailboxAccessError) {
    return error.code;
  }
  if (isImapAuthFailure(error)) {
    return "imap_auth_failed";
  }
  if (errorCode(error) === "ETHROTTLE") {
    return "gmail_rate_limit";
  }
  const status = httpStatus(error);
  const message = error instanceof Error ? error.message : "";
  if (status === 401 || status === 403 || /invalid_grant/i.test(message)) {
    return "gmail_denied";
  }
  if (status === 429) {
    return "gmail_rate_limit";
  }
  return "gmail_failed";
}

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, TOKEN_SALT, 32);
}

function isImapAuthFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("authenticationFailed" in error && error.authenticationFailed === true) {
    return true;
  }
  return "serverResponseCode" in error && error.serverResponseCode === "AUTHENTICATIONFAILED";
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error && typeof error.code === "number") {
    return error.code;
  }
  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }
  if ("response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "status" in response) {
      const status = response.status;
      return typeof status === "number" ? status : undefined;
    }
  }
  return undefined;
}
