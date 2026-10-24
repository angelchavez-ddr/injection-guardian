import { GoogleGenAI } from "@google/genai";
import { buildSecurityAnalysisPrompt } from "@/lib/ai/prompts/security-analysis";
import { AnalyzerError } from "@/lib/ai/providers/errors";
import { parseModelPayload } from "@/lib/ai/providers/parse-response";
import type { ModelAssessment, SecurityAnalysisInput, SecurityAnalyzer } from "@/lib/ai/providers/types";

export type GeminiGenerate = (prompt: string, model: string) => Promise<string>;

export class GeminiAnalyzer implements SecurityAnalyzer {
  constructor(
    private readonly options: {
      model: string;
      generate: GeminiGenerate;
      timeoutMs?: number;
    },
  ) {}

  async analyze(input: SecurityAnalysisInput): Promise<ModelAssessment> {
    const prompt = buildSecurityAnalysisPrompt(input);
    const timeoutMs = this.options.timeoutMs ?? 20_000;
    const combined = `${prompt.system}\n\n${prompt.user}`;

    try {
      const raw = await withTimeout(
        this.options.generate(combined, this.options.model),
        timeoutMs,
        "Gemini request timed out.",
      );
      return parseModelPayload(raw, "gemini", this.options.model);
    } catch (error) {
      if (error instanceof AnalyzerError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Gemini request failed.";
      if (/429|rate limit|resource_exhausted/i.test(message)) {
        throw new AnalyzerError("Gemini rate limit reached.", "rate_limit");
      }
      throw new AnalyzerError("Gemini request failed.", "provider");
    }
  }
}

export function createGeminiAnalyzer(apiKey: string, model: string): GeminiAnalyzer {
  if (!apiKey) {
    throw new AnalyzerError("GEMINI_API_KEY is not configured.", "not_configured");
  }
  const ai = new GoogleGenAI({ apiKey });
  return new GeminiAnalyzer({
    model,
    generate: async (prompt, modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0,
        },
      });
      if (!response.text) {
        throw new AnalyzerError("Gemini returned an empty response.", "malformed");
      }
      return response.text;
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AnalyzerError(message, "timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
