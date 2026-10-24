import { buildSecurityAnalysisPrompt } from "@/lib/ai/prompts/security-analysis";
import { AnalyzerError } from "@/lib/ai/providers/errors";
import { parseModelPayload } from "@/lib/ai/providers/parse-response";
import type { ModelAssessment, SecurityAnalysisInput, SecurityAnalyzer } from "@/lib/ai/providers/types";
import { z } from "zod";

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
});

export type LocalAnalyzerOptions = {
  model: string;
  endpoint: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 90_000;

export class LocalAnalyzer implements SecurityAnalyzer {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: LocalAnalyzerOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async analyze(input: SecurityAnalysisInput): Promise<ModelAssessment> {
    const prompt = buildSecurityAnalysisPrompt(input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.options.apiKey) {
      headers.Authorization = `Bearer ${this.options.apiKey}`;
    }

    try {
      const response = await this.fetchImpl(this.options.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.options.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new AnalyzerError("Local model rate limit reached.", "rate_limit");
      }
      if (!response.ok) {
        throw new AnalyzerError(`Local model request failed with status ${response.status}.`, "provider");
      }

      const body: unknown = await response.json();
      const completion = completionSchema.safeParse(body);
      if (!completion.success) {
        throw new AnalyzerError("Local model returned an unexpected response shape.", "malformed");
      }
      const content = completion.data.choices[0]?.message.content;
      if (!content) {
        throw new AnalyzerError("Local model returned an empty response.", "malformed");
      }
      return parseModelPayload(content, "local", this.options.model);
    } catch (error) {
      if (error instanceof AnalyzerError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new AnalyzerError("Local model request timed out.", "timeout");
      }
      throw new AnalyzerError("Local model request failed.", "provider");
    } finally {
      clearTimeout(timer);
    }
  }
}

export function localChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}
