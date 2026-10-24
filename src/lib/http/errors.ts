export class ApiError extends Error {
  readonly name = "ApiError";

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function assertDemoAccess(demoMode: boolean): void {
  if (!demoMode) {
    throw new ApiError(
      403,
      "authentication_required",
      "Authentication is not implemented. Findings and analysis are available only while DEMO_MODE=true.",
    );
  }
}
