import { getServerEnv } from "@/lib/env/server";
import { ApiError } from "@/lib/http/errors";
import { errorResponse, jsonResponse } from "@/lib/http/responses";
import { bearerMatches } from "@/lib/patch/signatures";
import { runVulnerabilityScan } from "@/server/services/vulnerability-scan";

export async function GET(request: Request) {
  try {
    const env = getServerEnv();
    if (!env.CRON_SECRET) {
      throw new ApiError(503, "cron_not_configured", "Configura CRON_SECRET antes de ejecutar el cron.");
    }
    if (!bearerMatches(request.headers.get("authorization"), env.CRON_SECRET)) {
      throw new ApiError(401, "unauthorized", "La solicitud del cron no está autorizada.");
    }
    const scan = await runVulnerabilityScan({ openPullRequest: true });
    return jsonResponse({
      id: scan.id,
      repository: scan.repository,
      status: scan.status,
      summary: scan.summary,
      pullRequestUrl: scan.pullRequestUrl ?? null,
      findingCount: scan.findings.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
