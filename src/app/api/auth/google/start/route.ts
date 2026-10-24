import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { OAUTH_STATE_COOKIE_NAME } from "@/lib/auth/session";
import { buildGoogleAdminLoginUrl } from "@/lib/connectors/email/gmail/gmail-api";
import { getServerEnv } from "@/lib/env/server";

export async function GET() {
  const env = getServerEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return Response.redirect(new URL("/login?error=google_not_configured", env.GOOGLE_REDIRECT_URI), 302);
  }

  const nonce = randomBytes(16).toString("hex");
  const state = `login:${nonce}`;
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authUrl = buildGoogleAdminLoginUrl(env, state);
  return Response.redirect(authUrl, 302);
}
