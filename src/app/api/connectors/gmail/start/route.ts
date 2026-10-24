import { buildGmailAuthUrl } from "@/lib/connectors/email/gmail/gmail-api";
import { getServerEnv } from "@/lib/env/server";
import { ApiError, assertDemoAccess } from "@/lib/http/errors";
import { errorResponse } from "@/lib/http/responses";

export async function GET() {
  try {
    const env = getServerEnv();
    assertDemoAccess(env.demoMode);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new ApiError(
        503,
        "gmail_not_configured",
        "Gmail OAuth client credentials are not configured. The synthetic mailbox remains available.",
      );
    }
    return Response.redirect(buildGmailAuthUrl(env), 302);
  } catch (error) {
    return errorResponse(error);
  }
}
