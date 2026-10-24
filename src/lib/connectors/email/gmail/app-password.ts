const APP_PASSWORD_PATTERN = /^[a-z]{16}$/;

export type GmailImapCredentials = {
  user: string;
  appPassword: string;
};

/** Google shows the 16-letter app password in groups of four. Spaces and hyphens are ignored. */
export function normalizeGmailAppPassword(raw: string): string | null {
  const compact = raw.replace(/[\s-]+/g, "").toLowerCase();
  if (!APP_PASSWORD_PATTERN.test(compact)) {
    return null;
  }
  return compact;
}
