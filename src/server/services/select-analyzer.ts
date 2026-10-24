import "server-only";
import { createGeminiAnalyzer } from "@/lib/ai/providers/gemini-analyzer";
import { GrokAnalyzer } from "@/lib/ai/providers/grok-analyzer";
import { MockAnalyzer } from "@/lib/ai/providers/mock-analyzer";
import type { SecurityAnalyzer } from "@/lib/ai/providers/types";
import { resolveActiveAnalyzer } from "@/lib/env/public-config";
import type { ServerEnv } from "@/lib/env/schema";
import type { AnalyzerProvider } from "@/lib/security/types";

export function selectAnalyzer(env: ServerEnv): {
  analyzer: SecurityAnalyzer;
  provider: AnalyzerProvider;
  model: string;
  reason: string;
} {
  const active = resolveActiveAnalyzer(env);
  if (active.provider === "mock") {
    return { ...active, analyzer: new MockAnalyzer() };
  }
  if (active.provider === "grok") {
    if (!env.XAI_API_KEY) {
      throw new Error("XAI_API_KEY is required when DEMO_MODE=false and AI_PROVIDER=grok.");
    }
    return {
      ...active,
      analyzer: new GrokAnalyzer({ apiKey: env.XAI_API_KEY, model: env.XAI_MODEL }),
    };
  }
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required when DEMO_MODE=false and AI_PROVIDER=gemini.");
  }
  return {
    ...active,
    analyzer: createGeminiAnalyzer(env.GEMINI_API_KEY, env.GEMINI_MODEL),
  };
}
