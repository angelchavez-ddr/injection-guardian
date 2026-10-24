import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env/server";
import type { ServerEnv } from "@/lib/env/schema";

export const SESSION_COOKIE_NAME = "ig_user_session";
export const OAUTH_STATE_COOKIE_NAME = "ig_oauth_state";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type UserRole = "admin" | "user";

export type UserSession = {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  role: UserRole;
  authMethod: "google" | "credentials";
  issuedAt: number;
  expiresAt: number;
};

export type AdminSession = UserSession;

function getSigningSecret(env: ServerEnv): string {
  return (
    env.SESSION_SECRET ??
    env.GOOGLE_CLIENT_SECRET ??
    env.TURSO_AUTH_TOKEN ??
    env.GEMINI_API_KEY ??
    "injection-guardian-local-dev-secret-key"
  );
}

export function isAuthorizedAdminEmail(email: string, env: ServerEnv = getServerEnv()): boolean {
  return email.trim().toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase();
}

export function signSessionToken(
  payload: Omit<UserSession, "issuedAt" | "expiresAt" | "role"> & {
    role?: UserRole;
    issuedAt?: number;
    expiresAt?: number;
  },
  env: ServerEnv = getServerEnv(),
): string {
  const now = Date.now();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const role: UserRole = isAuthorizedAdminEmail(normalizedEmail, env) ? "admin" : "user";

  const fullPayload: UserSession = {
    userId: payload.userId,
    email: normalizedEmail,
    name: payload.name,
    picture: payload.picture,
    role,
    authMethod: payload.authMethod,
    issuedAt: payload.issuedAt ?? now,
    expiresAt: payload.expiresAt ?? now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url");
  const signature = createHmac("sha256", getSigningSecret(env))
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined,
  env: ServerEnv = getServerEnv(),
): UserSession | null {
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [encoded, signature] = parts;
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSigningSecret(env))
    .update(encoded)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<UserSession>;

    if (
      typeof parsed.email !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      Date.now() > parsed.expiresAt
    ) {
      return null;
    }

    const normalizedEmail = parsed.email.toLowerCase();
    const role: UserRole = isAuthorizedAdminEmail(normalizedEmail, env) ? "admin" : "user";

    return {
      userId: parsed.userId,
      email: normalizedEmail,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      picture: typeof parsed.picture === "string" ? parsed.picture : undefined,
      role,
      authMethod: parsed.authMethod === "google" ? "google" : "credentials",
      issuedAt: typeof parsed.issuedAt === "number" ? parsed.issuedAt : Date.now(),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(raw);
}

export async function getAdminSession(): Promise<UserSession | null> {
  return getUserSession();
}

export async function requireUserSession(): Promise<UserSession> {
  const session = await getUserSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdminSession(): Promise<UserSession> {
  return requireUserSession();
}

export async function createUserSessionCookie(input: {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  authMethod: "google" | "credentials";
}): Promise<UserSession> {
  const env = getServerEnv();
  const normalizedEmail = input.email.trim().toLowerCase();
  const role: UserRole = isAuthorizedAdminEmail(normalizedEmail, env) ? "admin" : "user";
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const token = signSessionToken(
    {
      userId: input.userId,
      email: normalizedEmail,
      name: input.name,
      picture: input.picture,
      role,
      authMethod: input.authMethod,
      issuedAt: now,
      expiresAt,
    },
    env,
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return {
    userId: input.userId,
    email: normalizedEmail,
    name: input.name,
    picture: input.picture,
    role,
    authMethod: input.authMethod,
    issuedAt: now,
    expiresAt,
  };
}

export async function clearUserSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const createAdminSessionCookie = createUserSessionCookie;
export const clearAdminSessionCookie = clearUserSessionCookie;
