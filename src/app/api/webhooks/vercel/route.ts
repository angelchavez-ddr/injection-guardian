import { getServerEnv } from "@/lib/env/server";
import { ApiError } from "@/lib/http/errors";
import { errorResponse, jsonResponse } from "@/lib/http/responses";
import { vercelSignatureMatches } from "@/lib/patch/signatures";

export async function POST(request: Request) {
  try {
    const env = getServerEnv();
    if (!env.VERCEL_WEBHOOK_SECRET) {
      throw new ApiError(503, "webhook_not_configured", "Configura VERCEL_WEBHOOK_SECRET para recibir webhooks.");
    }
    const body = await request.text();
    if (!vercelSignatureMatches(body, request.headers.get("x-vercel-signature"), env.VERCEL_WEBHOOK_SECRET)) {
      throw new ApiError(401, "invalid_signature", "La firma del webhook de Vercel no es válida.");
    }
    const payload = parseWebhook(body);
    return jsonResponse({
      received: true,
      type: payload.type,
      deploymentId: payload.deploymentId,
      readyState: payload.readyState,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function parseWebhook(body: string): { type?: string; deploymentId?: string; readyState?: string } {
  try {
    const parsed = JSON.parse(body) as {
      type?: unknown;
      payload?: { deployment?: { id?: unknown; readyState?: unknown } };
    };
    return {
      type: typeof parsed.type === "string" ? parsed.type : undefined,
      deploymentId: typeof parsed.payload?.deployment?.id === "string" ? parsed.payload.deployment.id : undefined,
      readyState:
        typeof parsed.payload?.deployment?.readyState === "string" ? parsed.payload.deployment.readyState : undefined,
    };
  } catch {
    return {};
  }
}
