import { z } from "zod";
import type { PolicyActionResult, PolicyDecisionName, PolicyEvaluation, ProposedAction } from "@/lib/security/types";

const noteSchema = z.strictObject({ note: z.string().min(1).max(500) });
const reviewSchema = z.strictObject({ reason: z.string().min(1).max(300) });
const quarantineSchema = z.strictObject({ messageId: z.string().min(1).max(200) });

type ToolRule =
  | { kind: "allow"; schema: z.ZodType; reason: string }
  | { kind: "approval"; schema: z.ZodType; reason: string }
  | { kind: "deny"; reason: string };

const TOOLS: Record<string, ToolRule> = {
  record_analyst_note: {
    kind: "allow",
    schema: noteSchema,
    reason: "Analyst note recorded inside the investigation. No external action was taken.",
  },
  request_human_review: {
    kind: "allow",
    schema: reviewSchema,
    reason: "Human review was requested. No external action was taken.",
  },
  quarantine_message: {
    kind: "approval",
    schema: quarantineSchema,
    reason: "Quarantine is a sensitive action and was not executed. It needs explicit human approval.",
  },
  send_email: {
    kind: "deny",
    reason: "Sending email is prohibited. Gmail access stays read-only, and this demo has no mail transport.",
  },
  delete_message: {
    kind: "deny",
    reason: "Deleting messages is prohibited.",
  },
  modify_account: {
    kind: "deny",
    reason: "Account modification is prohibited.",
  },
  execute_command: {
    kind: "deny",
    reason: "Command execution is prohibited.",
  },
  grant_permission: {
    kind: "deny",
    reason: "The analyzer cannot grant permissions or change its own access.",
  },
  change_policy: {
    kind: "deny",
    reason: "The analyzer cannot change Guardian policy.",
  },
  read_secret: {
    kind: "deny",
    reason: "Reading secrets is prohibited.",
  },
};

/**
 * Evaluates proposed tool calls without trusting the model or the content.
 * Allowlisted tools in this bootstrap have no external side effects.
 * Unknown tools and invalid arguments fail closed.
 */
export function evaluatePolicy(actions: ProposedAction[]): PolicyEvaluation {
  const results = actions.map(evaluateAction);
  const decision = strictestDecision(results);
  return {
    decision,
    reason: decisionReason(decision, results),
    actions: results,
    externalSideEffects: [],
  };
}

function evaluateAction(action: ProposedAction): PolicyActionResult {
  if (!isPlainArguments(action.arguments) || typeof action.tool !== "string" || action.tool.trim().length === 0) {
    return {
      tool: typeof action.tool === "string" && action.tool.trim().length > 0 ? action.tool : "unknown",
      decision: "fail_closed",
      reason: "The proposed action could not be evaluated.",
      executed: false,
    };
  }

  const rule = TOOLS[action.tool];
  if (!rule) {
    return {
      tool: action.tool,
      decision: "fail_closed",
      reason: `Tool "${action.tool}" is not in the Guardian catalog, so it is denied.`,
      executed: false,
    };
  }

  if (rule.kind === "deny") {
    return {
      tool: action.tool,
      decision: "deny",
      reason: rule.reason,
      executed: false,
    };
  }

  const parsed = rule.schema.safeParse(action.arguments);
  if (!parsed.success) {
    return {
      tool: action.tool,
      decision: "fail_closed",
      reason: `Arguments for "${action.tool}" failed validation, so the action was not executed.`,
      executed: false,
    };
  }

  if (rule.kind === "approval") {
    return {
      tool: action.tool,
      decision: "require_approval",
      reason: rule.reason,
      executed: false,
    };
  }

  return {
    tool: action.tool,
    decision: "allow",
    reason: rule.reason,
    executed: true,
  };
}

function strictestDecision(actions: PolicyActionResult[]): PolicyDecisionName {
  if (actions.length === 0) {
    return "allow";
  }
  if (actions.some((action) => action.decision === "fail_closed")) {
    return "fail_closed";
  }
  if (actions.some((action) => action.decision === "deny")) {
    return "deny";
  }
  if (actions.some((action) => action.decision === "require_approval")) {
    return "require_approval";
  }
  return "allow";
}

function decisionReason(decision: PolicyDecisionName, actions: PolicyActionResult[]): string {
  if (actions.length === 0) {
    return "No tool action was proposed. External content remains untrusted data.";
  }
  const lead = actions.find((action) => action.decision === decision) ?? actions[0];
  if (!lead) {
    return "No tool action was proposed.";
  }
  return lead.reason;
}

function isPlainArguments(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
