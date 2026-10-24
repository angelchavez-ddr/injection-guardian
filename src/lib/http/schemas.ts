import { z } from "zod";
import { CONTENT_SOURCES, CONTENT_TYPES, FINDING_STATUSES, SEVERITIES } from "@/lib/security/types";
import { DEFAULT_MAX_INPUT_CHARS } from "@/lib/security/limits";

export const analyzeRequestSchema = z.object({
  source: z.enum(CONTENT_SOURCES).default("manual"),
  contentType: z.enum(CONTENT_TYPES).default("text"),
  subject: z.string().trim().max(300).optional(),
  sender: z.string().trim().max(320).optional(),
  externalId: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(DEFAULT_MAX_INPUT_CHARS),
  forceAnalysis: z.boolean().optional().default(false),
});

export const listEventsQuerySchema = z.object({
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(FINDING_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().min(1).max(80).optional(),
});

export const findingParamsSchema = z.object({
  id: z.string().trim().min(1).max(80),
});
