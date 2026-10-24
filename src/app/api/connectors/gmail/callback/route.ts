import { exchangeGmailCode } from "@/lib/connectors/email/gmail/gmail-api";
import { getServerEnv } from "@/lib/env/server";
import { assertDemoAccess } from "@/lib/http/errors";
import { errorResponse } from "@/lib/http/responses";

export async function GET(request: Request) {
  try {
    const env = getServerEnv();
    assertDemoAccess(env.demoMode);
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    if (error) {
      return html(`Google returned an OAuth error: ${escapeHtml(error)}. No token was stored.`);
    }
    const code = url.searchParams.get("code");
    if (!code) {
      return html("The OAuth callback did not include a code. No token was stored.");
    }
    const tokens = await exchangeGmailCode(env, code);
    const refresh = tokens.refresh_token;
    if (!refresh) {
      return html(
        "Google did not return a refresh token. If this client was already approved, revoke it and try again with prompt=consent. No token was stored.",
      );
    }
    return html(`Google returned a refresh token. It has not been stored in the database or logs.
Add it to the server environment as GOOGLE_REFRESH_TOKEN and restart the app.
This page is local demo setup only. Do not deploy it without authentication.

${refresh}`);
  } catch (caught) {
    return errorResponse(caught);
  }
}

function html(message: string): Response {
  const body = `<!doctype html><html><body style="font-family: sans-serif; max-width: 40rem; margin: 2rem auto;"><h1>Gmail OAuth</h1><pre style="white-space: pre-wrap;">${escapeHtml(message)}</pre></body></html>`;
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
