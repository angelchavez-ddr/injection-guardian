import { cookies } from "next/headers";
import {
  createUserSessionCookie,
  getUserSession,
  OAUTH_STATE_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  exchangeGmailCode,
  verifyGoogleTokensProfile,
} from "@/lib/connectors/email/gmail/gmail-api";
import { parseMailboxState } from "@/lib/connectors/email/gmail/oauth-state";
import { getServerEnv } from "@/lib/env/server";
import type { ServerEnv } from "@/lib/env/schema";
import { saveGmailRefreshToken, upsertGoogleUser } from "@/server/repositories/user-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const env = getServerEnv();
    const stateParam = url.searchParams.get("state") ?? "";
    const isLoginFlow = stateParam.startsWith("login:");
    const cookieStore = await cookies();
    const storedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
    if (storedState) {
      cookieStore.delete(OAUTH_STATE_COOKIE_NAME);
    }

    const oauthError = url.searchParams.get("error");
    if (oauthError) {
      if (isLoginFlow) {
        return Response.redirect(
          new URL(`/login?error=${encodeURIComponent(oauthError)}`, request.url),
          302,
        );
      }
      return Response.redirect(new URL("/dashboard?mailbox=oauth_denied", request.url), 302);
    }

    const code = url.searchParams.get("code");
    if (!code) {
      if (isLoginFlow) {
        return Response.redirect(new URL("/login?error=missing_code", request.url), 302);
      }
      return Response.redirect(new URL("/dashboard?mailbox=invalid_state", request.url), 302);
    }

    if (isLoginFlow) {
      return finishLogin(request, env, code, storedState, stateParam);
    }

    return finishMailboxConnect(request, env, code, storedState, stateParam);
  } catch {
    console.error("Gmail OAuth callback failed");
    return Response.redirect(new URL("/dashboard?mailbox=gmail_failed", request.url), 302);
  }
}

async function finishLogin(
  request: Request,
  env: ServerEnv,
  code: string,
  storedState: string | undefined,
  stateParam: string,
) {
  if (!storedState || storedState !== stateParam) {
    return Response.redirect(new URL("/login?error=invalid_state", request.url), 302);
  }

  const tokens = await exchangeGmailCode(env, code);
  const profile = await verifyGoogleTokensProfile(env, tokens);
  if (!profile.emailVerified) {
    return Response.redirect(new URL("/login?error=unverified_email", request.url), 302);
  }

  const dbUser = await upsertGoogleUser({
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  });
  await createUserSessionCookie({
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    picture: dbUser.picture,
    authMethod: "google",
  });
  return Response.redirect(new URL("/dashboard", request.url), 302);
}

async function finishMailboxConnect(
  request: Request,
  env: ServerEnv,
  code: string,
  storedState: string | undefined,
  stateParam: string,
) {
  const session = await getUserSession();
  if (!session) {
    return Response.redirect(new URL("/login", request.url), 302);
  }

  const mailboxState = parseMailboxState(stateParam);
  if (!storedState || storedState !== stateParam || !mailboxState || mailboxState.userId !== session.userId) {
    return Response.redirect(new URL("/dashboard?mailbox=invalid_state", request.url), 302);
  }

  const tokens = await exchangeGmailCode(env, code);
  const profile = await verifyGoogleTokensProfile(env, tokens);
  if (!profile.emailVerified) {
    return Response.redirect(new URL("/dashboard?mailbox=unverified_email", request.url), 302);
  }
  if (profile.email !== session.email) {
    return Response.redirect(new URL("/dashboard?mailbox=account_mismatch", request.url), 302);
  }

  const refresh = tokens.refresh_token;
  if (!refresh) {
    return Response.redirect(new URL("/dashboard?mailbox=no_refresh_token", request.url), 302);
  }

  await saveGmailRefreshToken(session.userId, refresh);
  return Response.redirect(new URL("/dashboard?mailbox=connected", request.url), 302);
}
