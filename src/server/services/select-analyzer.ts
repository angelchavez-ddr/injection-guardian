import "server-only";
import { assertNever } from "@/lib/assert-never";
import { createGeminiAnalyzer } from "@/lib/ai/providers/gemini-analyzer";
import { GrokAnalyzer } from "@/lib/ai/providers/grok-analyzer";
import { LocalAnalyzer, localChatCompletionsUrl } from "@/lib/ai/providers/local-analyzer";
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
  switch (active.provider) {
    case "mock":
      return { ...active, analyzer: new MockAnalyzer() };
    case "grok":
      if (!env.XAI_API_KEY) {
        throw new Error("XAI_API_KEY is required when DEMO_MODE=false and AI_PROVIDER=grok.");
      }
      return {
        ...active,
        analyzer: new GrokAnalyzer({ apiKey: env.XAI_API_KEY, model: env.XAI_MODEL }),
      };
    case "gemini":
      if (!env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is required when DEMO_MODE=false and AI_PROVIDER=gemini.");
      }
      return {
        ...active,
        analyzer: createGeminiAnalyzer(env.GEMINI_API_KEY, env.GEMINI_MODEL),
      };
    case "local":
      return {
        ...active,
        analyzer: new LocalAnalyzer({
          model: env.LOCAL_LLM_MODEL,
          endpoint: localChatCompletionsUrl(env.LOCAL_LLM_BASE_URL),
          apiKey: env.LOCAL_LLM_API_KEY,
          timeoutMs: env.LOCAL_LLM_TIMEOUT_MS,
        }),
      };
    default: {
      const unreachable: never = active.provider;
      return assertNever(unreachable);
    }
  }
}
