import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "@/lib/security/guardian-policy/engine";

describe("guardian policy", () => {
  it("denies prohibited tools and records no external side effects", () => {
    const decision = evaluatePolicy([
      { tool: "send_email", arguments: { to: "attacker@example.com" } },
      { tool: "delete_message", arguments: { id: "1" } },
      { tool: "execute_command", arguments: { command: "rm -rf /" } },
      { tool: "grant_permission", arguments: { role: "admin" } },
      { tool: "change_policy", arguments: { allow: true } },
      { tool: "read_secret", arguments: { name: "XAI_API_KEY" } },
      { tool: "modify_account", arguments: { role: "owner" } },
    ]);
    expect(decision.decision).toBe("deny");
    expect(decision.externalSideEffects).toEqual([]);
    expect(decision.actions.every((action) => action.executed === false)).toBe(true);
  });

  it("fails closed for unknown tools and invalid arguments", () => {
    const unknown = evaluatePolicy([{ tool: "drop_database", arguments: {} }]);
    expect(unknown.decision).toBe("fail_closed");
    expect(unknown.actions[0]?.executed).toBe(false);

    const invalid = evaluatePolicy([{ tool: "record_analyst_note", arguments: { note: "ok", extra: true } }]);
    expect(invalid.decision).toBe("fail_closed");
    expect(invalid.actions[0]?.executed).toBe(false);

    const unevaluable = evaluatePolicy([{ tool: "", arguments: [] as unknown as Record<string, unknown> }]);
    expect(unevaluable.decision).toBe("fail_closed");
  });

  it("allows a harmless analyst note and holds quarantine for approval", () => {
    const note = evaluatePolicy([{ tool: "record_analyst_note", arguments: { note: "Reviewed locally." } }]);
    expect(note.decision).toBe("allow");
    expect(note.actions[0]?.executed).toBe(true);
    expect(note.externalSideEffects).toEqual([]);

    const quarantine = evaluatePolicy([
      { tool: "quarantine_message", arguments: { messageId: "synthetic-indirect-en" } },
    ]);
    expect(quarantine.decision).toBe("require_approval");
    expect(quarantine.actions[0]?.executed).toBe(false);
  });

  it("does not treat email text as a tool call by itself", () => {
    const decision = evaluatePolicy([]);
    expect(decision.decision).toBe("allow");
    expect(decision.actions).toEqual([]);
    expect(decision.externalSideEffects).toEqual([]);
  });
});
