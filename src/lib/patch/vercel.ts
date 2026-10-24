import "server-only";
import { Vercel } from "@vercel/sdk";
import type { GetDeploymentsReadyState } from "@vercel/sdk/esm/models/getdeploymentsop.js";
import type { GetRuntimeLogsResponseBody } from "@vercel/sdk/esm/models/getruntimelogsop.js";
import { assertNever } from "@/lib/assert-never";

export type PreviewReport = {
  url?: string;
  status: "pending" | "ready" | "failed" | "unavailable";
  healthy: boolean;
  detail: string;
};

type DeploymentLog = {
  level: string;
  responseStatusCode: number;
};

export async function inspectPreviewDeployment(input: {
  token: string;
  projectId: string;
  teamId?: string;
  branch: string;
}): Promise<PreviewReport> {
  const vercel = new Vercel({ bearerToken: input.token });
  try {
    const listed = await vercel.deployments.getDeployments({
      projectId: input.projectId,
      branch: input.branch,
      limit: 5,
      teamId: input.teamId,
    });
    const deployment = listed.deployments[0];
    if (!deployment) {
      return {
        status: "pending",
        healthy: false,
        detail: "Vercel todavía no tiene un preview para esta rama.",
      };
    }
    const health = deploymentHealth(deployment.readyState);
    if (health === "pending") {
      return {
        url: deploymentUrl(deployment.url),
        status: "pending",
        healthy: false,
        detail: `El preview está en ${deployment.readyState}.`,
      };
    }
    if (health === "failed") {
      return {
        url: deploymentUrl(deployment.url),
        status: "failed",
        healthy: false,
        detail: deployment.errorMessage ?? `El preview terminó en ${deployment.readyState}.`,
      };
    }
    const logs = await readLogs(vercel, {
      projectId: input.projectId,
      deploymentId: deployment.uid,
      teamId: input.teamId,
    });
    const errors = logs.filter((log) => log.level === "error" || log.level === "fatal" || log.responseStatusCode >= 500);
    return {
      url: deploymentUrl(deployment.url),
      status: "ready",
      healthy: errors.length === 0,
      detail:
        errors.length === 0
          ? "El preview está listo y los logs no muestran errores 500."
          : `El preview está listo y hay ${errors.length} logs de error.`,
    };
  } catch {
    return {
      status: "unavailable",
      healthy: false,
      detail: "No se pudo consultar el preview en Vercel.",
    };
  }
}

export function deploymentHealth(state: GetDeploymentsReadyState): "pending" | "ready" | "failed" {
  switch (state) {
    case "READY":
      return "ready";
    case "ERROR":
    case "CANCELED":
    case "DELETED":
    case "BLOCKED":
      return "failed";
    case "BUILDING":
    case "INITIALIZING":
    case "QUEUED":
      return "pending";
    default:
      return assertNever(state);
  }
}

async function readLogs(
  vercel: Vercel,
  request: { projectId: string; deploymentId: string; teamId?: string },
): Promise<DeploymentLog[]> {
  try {
    const result = await vercel.logs.getRuntimeLogs(request);
    return normalizeLogs(result).map((log) => ({
      level: log.level,
      responseStatusCode: log.responseStatusCode,
    }));
  } catch {
    return [];
  }
}

function normalizeLogs(
  result: GetRuntimeLogsResponseBody | GetRuntimeLogsResponseBody[],
): GetRuntimeLogsResponseBody[] {
  return Array.isArray(result) ? result : [result];
}

function deploymentUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}
