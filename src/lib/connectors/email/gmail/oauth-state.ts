const MAILBOX_STATE =
  /^mailbox:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([0-9a-f]{32})$/i;

export function buildMailboxState(userId: string, nonce: string): string {
  return `mailbox:${userId}:${nonce}`;
}

export function parseMailboxState(state: string): { userId: string; nonce: string } | null {
  const match = MAILBOX_STATE.exec(state);
  const userId = match?.[1];
  const nonce = match?.[2];
  if (!userId || !nonce) {
    return null;
  }
  return { userId, nonce };
}
