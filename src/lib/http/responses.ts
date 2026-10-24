import { ZodError } from "zod";
import { ApiError } from "@/lib/http/errors";
import { EmptyContentError, InputLimitError } from "@/lib/security/types";
import { formatZodError } from "@/lib/validation";

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-injection-guardian-mode": "local-demo",
    },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
  }
  if (error instanceof ZodError) {
    return jsonResponse(
      { error: { code: "invalid_request", message: formatZodError(error) } },
      400,
    );
  }
  if (error instanceof InputLimitError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, 413);
  }
  if (error instanceof EmptyContentError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, 400);
  }
  console.error(error);
  return jsonResponse(
    { error: { code: "internal_error", message: "The request could not be completed." } },
    500,
  );
}
