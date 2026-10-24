import { getServerEnv } from "@/lib/env/server";
import { ApiError, assertDemoAccess } from "@/lib/http/errors";
import { errorResponse, jsonResponse } from "@/lib/http/responses";
import { findingParamsSchema } from "@/lib/http/schemas";
import { CONFIDENCE_MEANING } from "@/lib/security/types";
import { ensureDemoSeed, getAuditRepository } from "@/server/services/security-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const env = getServerEnv();
    assertDemoAccess(env.demoMode);
    const params = findingParamsSchema.parse(await context.params);
    await ensureDemoSeed();
    const finding = await getAuditRepository().getFinding(params.id);
    if (!finding) {
      throw new ApiError(404, "not_found", "Finding not found.");
    }
    return jsonResponse({
      ...finding,
      confidenceMeaning: CONFIDENCE_MEANING,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
