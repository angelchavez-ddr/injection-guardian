export class GmailHistoryExpiredError extends Error {
  readonly code = "history_expired";

  constructor() {
    super("Gmail history cursor expired.");
    this.name = "GmailHistoryExpiredError";
  }
}

export function isRateLimitError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: number | string }).code;
    if (code === 429 || code === "429") {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : "";
  return /rateLimitExceeded|userRateLimitExceeded|quotaExceeded|\b429\b/i.test(message);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { retries: number; delaysMs: number[]; isRetryable?: (error: unknown) => boolean },
): Promise<T> {
  const isRetryable = options.isRetryable ?? isRateLimitError;
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === options.retries || !isRetryable(error)) {
        throw error;
      }
      const delay = options.delaysMs[attempt] ?? 0;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
