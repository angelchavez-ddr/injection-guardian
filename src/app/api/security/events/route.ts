import { getAdminSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env/server";
import { assertAdminOrDemoAccess } from "@/lib/http/errors";
import { errorResponse, jsonResponse } from "@/lib/http/responses";
import { listEventsQuerySchema } from "@/lib/http/schemas";
import { getAuditRepository } from "@/server/services/security-service";

export async function GET(request: Request) {
  try {
    const env = getServerEnv();
    const session = await getAdminSession();
    assertAdminOrDemoAccess(env.demoMode, Boolean(session));
    const url = new URL(request.url);
    const query = listEventsQuerySchema.parse({
      severity: url.searchParams.get("severity") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    const findings = await getAuditRepository().listFindings(query);
    return jsonResponse({
      events: findings.map((finding) => ({
        id: finding.id,
        correlationId: finding.correlationId,
        source: finding.source,
        externalId: finding.externalId,
        simulated: finding.simulated,
        createdAt: finding.createdAt,
        severity: finding.severity,
        riskScore: finding.riskScore,
        status: finding.status,
        requiresHumanReview: finding.requiresHumanReview,
        summary: finding.summary,
        subject: finding.subject,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
