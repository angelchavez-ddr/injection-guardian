import { z } from "zod";
import { formatZodError } from "@/lib/validation";

const providerSchema = z.enum(["grok", "gemini", "mock"]);

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  XAI_API_KEY: z.string().min(1).optional(),
  XAI_MODEL: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1),
  GEMINI_NAME: z.string().min(1).optional(),
  GEMINI_PROJECT_NAME: z.string().min(1).optional(),
  GEMINI_PROJECT_NUMBER: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_REDIRECT_URI: z.string().min(1),
  GOOGLE_REFRESH_TOKEN: z.string().min(1).optional(),
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
  GEMINI_NAME?: string;
  GEMINI_PROJECT_NAME?: string;
  GEMINI_PROJECT_NUMBER?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI: string;
  GOOGLE_REFRESH_TOKEN?: string;
  AI_PROVIDER: "grok" | "gemini" | "mock";
  DEMO_MODE: "true" | "false";
  demoMode: boolean;
  gmailConfigured: boolean;
  databaseKind: "local-sqlite" | "libsql";
};

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
    GEMINI_NAME: optionalString(source.GEMINI_NAME),
    GEMINI_PROJECT_NAME: optionalString(source.GEMINI_PROJECT_NAME),
    GEMINI_PROJECT_NUMBER: optionalString(source.GEMINI_PROJECT_NUMBER),
    GOOGLE_CLIENT_ID: optionalString(source.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: optionalString(source.GOOGLE_CLIENT_SECRET),
    GOOGLE_REDIRECT_URI:
      optionalString(source.GOOGLE_REDIRECT_URI) ??
      "http://localhost:3000/api/connectors/gmail/callback",
    GOOGLE_REFRESH_TOKEN: optionalString(source.GOOGLE_REFRESH_TOKEN),
    AI_PROVIDER: defaultProvider,
    DEMO_MODE: optionalString(source.DEMO_MODE) ?? "true",
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${formatZodError(parsed.error)}`);
  }

  const gmailConfigured = Boolean(
    parsed.data.GOOGLE_CLIENT_ID &&
      parsed.data.GOOGLE_CLIENT_SECRET &&
      parsed.data.GOOGLE_REFRESH_TOKEN,
  );

  return {
    ...parsed.data,
    demoMode: parsed.data.DEMO_MODE === "true",
    gmailConfigured,
    databaseKind: parsed.data.DATABASE_URL.startsWith("file:") ? "local-sqlite" : "libsql",
  };
}
