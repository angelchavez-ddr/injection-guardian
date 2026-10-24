import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { OAUTH_STATE_COOKIE_NAME, getUserSession } from "@/lib/auth/session";
import { buildGmailAuthUrl } from "@/lib/connectors/email/gmail/gmail-api";
import { buildMailboxState } from "@/lib/connectors/email/gmail/oauth-state";
import { getServerEnv } from "@/lib/env/server";

export async function GET(request: Request) {
  const env = getServerEnv();
  const session = await getUserSession();
  if (!session) {
    return Response.redirect(new URL("/login", request.url), 302);
  }
  if (session.authMethod !== "google") {
    return Response.redirect(new URL("/dashboard?mailbox=google_required", request.url), 302);
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return Response.redirect(new URL("/dashboard?mailbox=gmail_failed", request.url), 302);
  }

  const nonce = randomBytes(16).toString("hex");
  const state = buildMailboxState(session.userId, nonce);
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return Response.redirect(buildGmailAuthUrl(env, state), 302);
}
