import { assertNever } from "@/lib/assert-never";
import { GMAIL_READONLY_SCOPE } from "@/lib/connectors/email/gmail/scopes";
import type { ServerEnv } from "@/lib/env/schema";
import type { AnalyzerProvider } from "@/lib/security/types";

export type PublicRuntimeConfig = {
  demoMode: boolean;
  requestedProvider: ServerEnv["AI_PROVIDER"];
  activeProvider: AnalyzerProvider;
  activeModel: string;
  providerReason: string;
  gmailConfigured: boolean;
  gmailScope: string;
  databaseKind: ServerEnv["databaseKind"];
  authentication: "not_implemented";
};

export function publicRuntimeConfig(env: ServerEnv): PublicRuntimeConfig {
  const active = resolveActiveAnalyzer(env);
  return {
    demoMode: env.demoMode,
    requestedProvider: env.AI_PROVIDER,
    activeProvider: active.provider,
    activeModel: active.model,
    providerReason: active.reason,
    gmailConfigured: env.gmailConfigured,
    gmailScope: GMAIL_READONLY_SCOPE,
    databaseKind: env.databaseKind,
    authentication: "not_implemented",
  };
}

export function resolveActiveAnalyzer(env: ServerEnv): {
  provider: AnalyzerProvider;
  model: string;
  reason: string;
} {
  if (env.AI_PROVIDER === "mock") {
    return { provider: "mock", model: "mock-heuristic", reason: "AI_PROVIDER is mock." };
  }
  if (env.AI_PROVIDER === "grok") {
    if (!env.XAI_API_KEY) {
      if (env.demoMode) {
        return {
          provider: "mock",
          model: "mock-heuristic",
          reason: "DEMO_MODE is true and XAI_API_KEY is unset, so the mock analyzer is active.",
        };
      }
      return {
        provider: "grok",
        model: env.XAI_MODEL,
        reason: "XAI_API_KEY is required before Grok can be called.",
      };
    }
    return { provider: "grok", model: env.XAI_MODEL, reason: "Grok is the configured analyzer." };
  }
  if (env.AI_PROVIDER === "gemini") {
    if (!env.GEMINI_API_KEY) {
      if (env.demoMode) {
        return {
          provider: "mock",
          model: "mock-heuristic",
          reason: "DEMO_MODE is true and GEMINI_API_KEY is unset, so the mock analyzer is active.",
        };
      }
      return {
        provider: "gemini",
        model: env.GEMINI_MODEL,
        reason: "GEMINI_API_KEY is required before Gemini can be called.",
      };
    }
    return { provider: "gemini", model: env.GEMINI_MODEL, reason: "Gemini is the configured analyzer." };
  }
  return assertNever(env.AI_PROVIDER);
}
