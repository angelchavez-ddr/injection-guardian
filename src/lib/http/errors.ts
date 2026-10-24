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
      "Authentication is required. Sign in as administrator or set DEMO_MODE=true.",
    );
  }
}

export function assertAdminOrDemoAccess(demoMode: boolean, isAdminAuthenticated: boolean): void {
  if (!isAdminAuthenticated && !demoMode) {
    throw new ApiError(
      403,
      "authentication_required",
      "Administrator authentication is required.",
    );
  }
}

export function assertAdminAuthenticated(isAdminAuthenticated: boolean): void {
  if (!isAdminAuthenticated) {
    throw new ApiError(
      401,
      "authentication_required",
      "Debes iniciar sesión como administrador (angcoder.c@gmail.com).",
    );
  }
}
