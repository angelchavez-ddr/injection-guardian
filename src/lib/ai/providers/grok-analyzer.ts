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

export type GrokAnalyzerOptions = {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  endpoint?: string;
};

export class GrokAnalyzer implements SecurityAnalyzer {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly endpoint: string;

  constructor(private readonly options: GrokAnalyzerOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.endpoint = options.endpoint ?? "https://api.x.ai/v1/chat/completions";
  }

  async analyze(input: SecurityAnalysisInput): Promise<ModelAssessment> {
    if (!this.options.apiKey) {
      throw new AnalyzerError("XAI_API_KEY is not configured.", "not_configured");
    }

    const prompt = buildSecurityAnalysisPrompt(input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
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
        throw new AnalyzerError("Grok rate limit reached.", "rate_limit");
      }
      if (!response.ok) {
        throw new AnalyzerError(`Grok request failed with status ${response.status}.`, "provider");
      }

      const body: unknown = await response.json();
      const completion = completionSchema.safeParse(body);
      if (!completion.success) {
        throw new AnalyzerError("Grok returned an unexpected response shape.", "malformed");
      }
      const content = completion.data.choices[0]?.message.content;
      if (!content) {
        throw new AnalyzerError("Grok returned an empty response.", "malformed");
      }
      return parseModelPayload(content, "grok", this.options.model);
    } catch (error) {
      if (error instanceof AnalyzerError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new AnalyzerError("Grok request timed out.", "timeout");
      }
      throw new AnalyzerError("Grok request failed.", "provider");
    } finally {
      clearTimeout(timer);
    }
  }
}
