export type AnalyzerErrorCode = "timeout" | "rate_limit" | "provider" | "malformed" | "not_configured";

export class AnalyzerError extends Error {
  readonly name = "AnalyzerError";

  constructor(
    message: string,
    readonly code: AnalyzerErrorCode,
  ) {
    super(message);
  }
}
