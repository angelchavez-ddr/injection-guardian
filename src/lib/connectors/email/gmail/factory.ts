import "server-only";
import { DemoGmailConnector } from "@/lib/connectors/email/gmail/demo-connector";
import { createGmailApi } from "@/lib/connectors/email/gmail/gmail-api";
import { GmailConnector } from "@/lib/connectors/email/gmail/gmail-connector";
import type { EmailConnector } from "@/lib/connectors/email/types";
import type { ServerEnv } from "@/lib/env/schema";

export function createEmailConnector(env: ServerEnv): EmailConnector {
  if (env.gmailConfigured) {
    return new GmailConnector(createGmailApi(env));
  }
  return new DemoGmailConnector();
}
