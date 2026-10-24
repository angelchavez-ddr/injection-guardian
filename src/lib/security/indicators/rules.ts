import type { IndicatorId } from "@/lib/security/types";

export type IndicatorRule = {
  id: IndicatorId;
  pattern: RegExp;
};

/**
 * Instructional patterns are intentionally specific.
 * Words such as "ignore", "delete", or "system" do not match on their own.
 */
export const defaultIndicatorRules: IndicatorRule[] = [
  {
    id: "instruction_override",
    pattern:
      /\b(?:ignore|disregard|forget|override)(?:\s+\S+){0,6}\s+\b(?:previous|prior|above|all|any|your|system)\b(?:\s+\S+){0,6}\s+\b(?:instructions?|prompts?|rules?|guidelines?|policies)\b/i,
  },
  {
    id: "instruction_override",
    pattern:
      /\b(?:ignora|olvida|descarta|anula)(?:\s+\S+){0,6}\s+\b(?:instrucciones|reglas|directrices|pol[ií]ticas|prompt)\b/i,
  },
  { id: "role_override", pattern: /\byou are now\b/i },
  { id: "role_override", pattern: /\bfrom now on you\b/i },
  { id: "role_override", pattern: /\bpretend to be\b/i },
  { id: "role_override", pattern: /\bact as if you (?:are|were)\b/i },
  { id: "role_override", pattern: /\bahora eres\b/i },
  { id: "role_override", pattern: /\ba partir de ahora eres\b/i },
  { id: "role_override", pattern: /\bact[uú]a como\b/i },
  { id: "role_override", pattern: /\bfinge ser\b/i },
  {
    id: "system_prompt_exfiltration",
    pattern:
      /\b(?:reveal|show|print|dump|repeat|expose)(?:\s+\S+){0,8}\s+\b(?:system prompt|developer message|hidden instructions|initial instructions)\b/i,
  },
  {
    id: "system_prompt_exfiltration",
    pattern:
      /\b(?:revela|muestra|imprime)(?:\s+\S+){0,8}\s+\b(?:prompt del sistema|instrucciones del sistema|mensaje del (?:sistema|desarrollador))\b/i,
  },
  {
    id: "data_exfiltration",
    pattern:
      /\b(?:forward|exfiltrate|upload)(?:\s+\S+){0,8}\s+\b(?:inbox|mailbox|credentials|secrets|passwords|api keys?)\b/i,
  },
  {
    id: "data_exfiltration",
    pattern:
      /\bsend(?:\s+\S+){0,6}\s+\b(?:all (?:the )?(?:emails|messages)|the inbox|credentials|secrets)\b/i,
  },
  {
    id: "data_exfiltration",
    pattern:
      /\b(?:reenv[ií]a|env[ií]a|exfiltra)(?:\s+\S+){0,8}\s+\b(?:todos los correos|la bandeja|las credenciales|los secretos|las claves)\b/i,
  },
  {
    id: "data_exfiltration",
    pattern: /https?:\/\/(?:webhook\.site|discord(?:app)?\.com\/api\/webhooks)\b/i,
  },
  { id: "tool_abuse", pattern: /\bdelete all (?:emails|messages|mail)\b/i },
  { id: "tool_abuse", pattern: /\bborrar todos los correos\b/i },
  { id: "tool_abuse", pattern: /\brm\s+-rf\b/i },
  { id: "tool_abuse", pattern: /\b(?:execute|run) (?:this|the following) command\b/i },
  {
    id: "tool_abuse",
    pattern:
      /\b(?:send_email|delete_message|execute_command|grant_permission|change_policy|read_secret|modify_account)\b/i,
  },
  { id: "privilege_escalation", pattern: /\bgrant yourself\b/i },
  {
    id: "privilege_escalation",
    pattern: /\bdisable (?:the )?(?:security )?(?:policy|guardrail|filter|guardian)\b/i,
  },
  {
    id: "privilege_escalation",
    pattern: /\bbypass (?:the )?(?:policy|guard|filter|guardian)\b/i,
  },
  {
    id: "privilege_escalation",
    pattern: /\byou (?:now )?have (?:admin|root) (?:access|privileges)\b/i,
  },
  { id: "privilege_escalation", pattern: /\bconc[eé]dete permisos\b/i },
  { id: "privilege_escalation", pattern: /\bdesactiva la pol[ií]tica\b/i },
  { id: "privilege_escalation", pattern: /\bomite el (?:filtro|guardi[aá]n)\b/i },
];
