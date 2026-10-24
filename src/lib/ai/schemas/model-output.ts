import { z } from "zod";
import { ATTACK_TYPES, RECOMMENDED_ACTIONS, SEVERITIES } from "@/lib/security/types";

export const modelOutputSchema = z.object({
  severity: z.enum(SEVERITIES),
  riskScore: z.number().int().min(0).max(100),
  reportedConfidence: z.number().min(0).max(1),
  indicators: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        evidence: z.string().min(1).max(300),
        severity: z.enum(SEVERITIES),
      }),
    )
    .max(20)
    .default([]),
  attackTypes: z.array(z.enum(ATTACK_TYPES)).max(12).default([]),
  defensiveRecommendations: z.array(z.enum(RECOMMENDED_ACTIONS)).max(12).default([]),
  proposedActions: z
    .array(
      z.object({
        tool: z.string().min(1).max(80),
        arguments: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .max(10)
    .default([]),
  summary: z.string().min(1).max(600),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;
