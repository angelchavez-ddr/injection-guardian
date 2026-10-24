import { getPrisma } from "@/lib/db/client";
import { getServerEnv } from "@/lib/env/server";
import { publicRuntimeConfig } from "@/lib/env/public-config";
import { errorResponse, jsonResponse } from "@/lib/http/responses";

export async function GET() {
  try {
    const env = getServerEnv();
    const config = publicRuntimeConfig(env);
    let database: "ok" | "unavailable" = "unavailable";
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      database = "ok";
    } catch {
      database = "unavailable";
    }
    return jsonResponse({
      status: database === "ok" ? "ok" : "degraded",
      demoMode: config.demoMode,
      activeProvider: config.activeProvider,
      database,
      authentication: config.authentication,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
