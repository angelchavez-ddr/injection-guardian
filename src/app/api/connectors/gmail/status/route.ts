import { getServerEnv } from "@/lib/env/server";
import { GMAIL_READONLY_SCOPE } from "@/lib/connectors/email/gmail/scopes";
import { errorResponse, jsonResponse } from "@/lib/http/responses";
import { createEmailConnector } from "@/lib/connectors/email/gmail/factory";

export async function GET() {
  try {
    const env = getServerEnv();
    const connector = createEmailConnector(env);
    return jsonResponse({
      id: connector.id,
      mode: connector.mode,
      configured: env.gmailConfigured,
      scope: GMAIL_READONLY_SCOPE,
      demoAvailable: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
