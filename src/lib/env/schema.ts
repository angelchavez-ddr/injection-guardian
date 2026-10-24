import { z } from "zod";
import { formatZodError } from "@/lib/validation";

const providerSchema = z.enum(["grok", "gemini", "local", "mock"]);

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_MODEL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1),
  LOCAL_LLM_BASE_URL: z.string().url(),
  LOCAL_LLM_MODEL: z.string().min(1),
  LOCAL_LLM_API_KEY: z.string().min(1).optional(),
  LOCAL_LLM_TIMEOUT_MS: z.number().int().min(1_000).max(300_000),
  GEMINI_NAME: z.string().min(1).optional(),
  GEMINI_PROJECT_NAME: z.string().min(1).optional(),
  GEMINI_PROJECT_NUMBER: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().min(1),
  GOOGLE_REFRESH_TOKEN: z.string().min(1).optional(),
  ADMIN_EMAIL: z.string().email(),
  SESSION_SECRET: z.string().min(1).optional(),
  AI_PROVIDER: providerSchema,
  DEMO_MODE: z.enum(["true", "false"]),
});

export type ServerEnv = {
  DATABASE_URL: string;
  TURSO_AUTH_TOKEN?: string;
  XAI_API_KEY?: string;
  XAI_MODEL: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  LOCAL_LLM_BASE_URL: string;
  LOCAL_LLM_MODEL: string;
  LOCAL_LLM_API_KEY?: string;
  LOCAL_LLM_TIMEOUT_MS: number;
  GEMINI_NAME?: string;
  GEMINI_PROJECT_NAME?: string;
  GEMINI_PROJECT_NUMBER?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI: string;
  GOOGLE_REFRESH_TOKEN?: string;
  ADMIN_EMAIL: string;
  SESSION_SECRET?: string;
  AI_PROVIDER: "grok" | "gemini" | "local" | "mock";
  DEMO_MODE: "true" | "false";
  demoMode: boolean;
  gmailConfigured: boolean;
  googleAuthConfigured: boolean;
  databaseKind: "local-sqlite" | "libsql";
};

function optionalTimeout(value: string | undefined, fallback: number): number {
  const raw = optionalString(value);
  if (!raw) {
    return fallback;
  }
  return Number(raw);
}

function optionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const geminiApiKey = optionalString(source.GEMINI_API_KEY);
  const xaiApiKey = optionalString(source.XAI_API_KEY);
  const defaultProvider =
    optionalString(source.AI_PROVIDER) ??
    (geminiApiKey && !xaiApiKey ? "gemini" : "grok");

  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL:
      optionalString(source.TURSO_DATABASE_URL) ??
      optionalString(source.DATABASE_URL) ??
      "file:./dev.db",
    TURSO_AUTH_TOKEN:
      optionalString(source.TURSO_DATABASE_KEY) ??
      optionalString(source.TURSO_AUTH_TOKEN),
    XAI_API_KEY: xaiApiKey,
    XAI_MODEL: optionalString(source.XAI_MODEL) ?? "grok-4",
    GEMINI_API_KEY: geminiApiKey,
    GEMINI_MODEL: optionalString(source.GEMINI_MODEL) ?? "gemini-flash-latest",
    LOCAL_LLM_BASE_URL: optionalString(source.LOCAL_LLM_BASE_URL) ?? "http://127.0.0.1:11434/v1",
    LOCAL_LLM_MODEL: optionalString(source.LOCAL_LLM_MODEL) ?? "gpt-oss:20b",
    LOCAL_LLM_API_KEY: optionalString(source.LOCAL_LLM_API_KEY),
    LOCAL_LLM_TIMEOUT_MS: optionalTimeout(source.LOCAL_LLM_TIMEOUT_MS, 90_000),
    GEMINI_NAME: optionalString(source.GEMINI_NAME),
    GEMINI_PROJECT_NAME: optionalString(source.GEMINI_PROJECT_NAME),
    GEMINI_PROJECT_NUMBER: optionalString(source.GEMINI_PROJECT_NUMBER),
    GOOGLE_CLIENT_ID: optionalString(source.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: optionalString(source.GOOGLE_CLIENT_SECRET),
    GOOGLE_REDIRECT_URI:
      optionalString(source.GOOGLE_REDIRECT_URI) ??
      "http://localhost:3000/api/connectors/gmail/callback",
    GOOGLE_REFRESH_TOKEN: optionalString(source.GOOGLE_REFRESH_TOKEN),
    ADMIN_EMAIL: (optionalString(source.ADMIN_EMAIL) ?? "angcoder.c@gmail.com").toLowerCase(),
    SESSION_SECRET: optionalString(source.SESSION_SECRET),
    AI_PROVIDER: defaultProvider,
    DEMO_MODE: optionalString(source.DEMO_MODE) ?? "true",
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${formatZodError(parsed.error)}`);
  }

  const googleAuthConfigured = Boolean(
    parsed.data.GOOGLE_CLIENT_ID && parsed.data.GOOGLE_CLIENT_SECRET,
  );

  const gmailConfigured = Boolean(
    googleAuthConfigured && parsed.data.GOOGLE_REFRESH_TOKEN,
  );

  return {
    ...parsed.data,
    demoMode: parsed.data.DEMO_MODE === "true",
    gmailConfigured,
    googleAuthConfigured,
    databaseKind: parsed.data.DATABASE_URL.startsWith("file:") ? "local-sqlite" : "libsql",
  };
}
