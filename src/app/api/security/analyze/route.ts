import { getAdminSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";
import { ApiError, assertAdminOrDemoAccess } from "@/lib/http/errors";
import { allowRequest } from "@/lib/http/rate-limit";
import { errorResponse, jsonResponse } from "@/lib/http/responses";
import { analyzeRequestSchema } from "@/lib/http/schemas";
import { CONFIDENCE_MEANING } from "@/lib/security/types";
import { analyzeSubmission } from "@/server/services/security-service";

export async function POST(request: Request) {
  try {
    const env = getServerEnv();
    const session = await getAdminSession();
    assertAdminOrDemoAccess(env.demoMode, Boolean(session));
    const key = request.headers.get("x-forwarded-for") ?? "local";
    if (!allowRequest(key, 30, 60_000)) {
      throw new ApiError(429, "rate_limited", "Too many analysis requests. Wait a minute and try again.");
    }

    const raw = await request.text();
    if (raw.length > 100_000) {
      throw new ApiError(413, "input_too_large", "Request body is too large.");
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ApiError(400, "invalid_json", "Request body must be JSON.");
    }
    const input = analyzeRequestSchema.parse(body);
    const finding = await analyzeSubmission(input);
    return jsonResponse({
      eventId: finding.id,
      correlationId: finding.correlationId,
      severity: finding.severity,
      riskScore: finding.riskScore,
      confidence: finding.confidence,
      confidenceMeaning: CONFIDENCE_MEANING,
      triage: finding.triage,
      status: finding.status,
      requiresHumanReview: finding.requiresHumanReview,
      summary: finding.summary,
      indicators: finding.indicators,
      attackTypes: finding.attackTypes,
      recommendedActions: finding.recommendedActions,
      policy: {
        decision: finding.policyDecision,
        reason: finding.policyReason,
        actions: finding.policyActions,
      },
      analysis: {
        provider: finding.analysis.provider,
        model: finding.analysis.model,
        status: finding.analysis.status,
        advisorySummary: finding.analysis.advisorySummary,
      },
      simulated: finding.simulated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
