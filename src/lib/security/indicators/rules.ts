import type { IndicatorId } from "@/lib/security/types";

export type IndicatorRule = {
  id: IndicatorId;
  pattern: RegExp;
};

/**
 * Instructional patterns are intentionally specific.
 * Words such as "ignore", "delete", or "system" do not match on their own.
 */
export const PAYMENT_PRESSURE =
  /\b(?:con urgencia|de urgencia|antes de las \d{1,2}|escalarlo con direcci[oó]n|si no respondes a tiempo)\b/i;

export const ACCOUNT_SOLICITATION = /\b(?:n[uú]mero de cuenta|cuenta bancaria|datos bancarios)\b/i;

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
  {
    id: "instruction_override",
    pattern:
      /\b(?:do not follow|don't follow)(?:\s+\S+){0,6}\s+\b(?:previous|prior|above|system|your)\b(?:\s+\S+){0,6}\s+\binstructions?\b/i,
  },
  {
    id: "instruction_override",
    pattern: /\bno sigas(?:\s+\S+){0,6}\s+\b(?:las |tus )?instrucciones\b/i,
  },
  {
    id: "instruction_override",
    pattern: /\b(?:asistente|assistant)\s*:[^\n]{0,180}\b(?:al resumir|when summarizing|agrega al final)\b/i,
  },
  {
    id: "instruction_override",
    pattern: /\bal resumir (?:este |el )?(?:correo|mensaje)[^\n]{0,100}\b(?:agrega|a[nñ]ade|inserta)\b/i,
  },
  {
    id: "instruction_override",
    pattern: /\baunque no se mencione\b/i,
  },
  { id: "role_override", pattern: /\byou are now\b/i },
  { id: "role_override", pattern: /\bfrom now on you\b/i },
  { id: "role_override", pattern: /\bpretend to be\b/i },
  { id: "role_override", pattern: /\bact as if you (?:are|were)\b/i },
  { id: "role_override", pattern: /\bahora eres\b/i },
  { id: "role_override", pattern: /\ba partir de ahora eres\b/i },
  { id: "role_override", pattern: /\bact[uú]a como\b/i },
  { id: "role_override", pattern: /\bfinge ser\b/i },
  { id: "role_override", pattern: /\byou are (?:now )?(?:a|the) (?:system )?administrator\b/i },
  { id: "role_override", pattern: /\beres (?:ahora )?(?:el|un|una) administrador\b/i },
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
    id: "system_prompt_exfiltration",
    pattern: /\brevelar?\s+las\s+instrucciones internas\b/i,
  },
  {
    id: "system_prompt_exfiltration",
    pattern: /\bmuestra\s+cualquier\s+informaci[oó]n confidencial\b/i,
  },
  {
    id: "system_prompt_exfiltration",
    pattern: /\bwhat (?:is|are) your (?:system prompt|hidden instructions|instructions)\b/i,
  },
  {
    id: "system_prompt_exfiltration",
    pattern: /\b(?:repite|cu[aá]les son)(?:\s+\S+){0,4}\s+\b(?:tus |las )?instrucciones\b/i,
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
    pattern: /\benviar\s+esta\s+informaci[oó]n(?:\s+\S+){0,6}\s+destinatario externo\b/i,
  },
  {
    id: "data_exfiltration",
    pattern: /https?:\/\/(?:webhook\.site|discord(?:app)?\.com\/api\/webhooks)\b/i,
  },
  {
    id: "data_exfiltration",
    pattern:
      /\b(?:share|paste|send|email)(?:\s+\S+){0,6}\s+\b(?:the |your )?(?:password|credentials|api key|secret)\b/i,
  },
  {
    id: "data_exfiltration",
    pattern:
      /\b(?:comparte|env[ií]a|pega)(?:\s+\S+){0,6}\s+\b(?:la contrase[nñ]a|las credenciales|el secreto|la clave de api)\b/i,
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
  { id: "tool_abuse", pattern: /\b(?:curl|wget)\b[^|\n]{0,80}\|\s*(?:sh|bash)\b/i },
  { id: "tool_abuse", pattern: /\breenv[ií](?:e|ar|a)?\s+autom[aá]ticamente\b/i },
  { id: "tool_abuse", pattern: /\bpowershell(?:\.exe)?\s+-e(?:nc|ncodedcommand)\b/i },
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
  { id: "privilege_escalation", pattern: /\bomite\s+las\s+restricciones\b/i },
  { id: "privilege_escalation", pattern: /\bjailbreak\b/i },
  { id: "privilege_escalation", pattern: /\bdisable (?:all )?(?:safety|safeguards)\b/i },
  { id: "privilege_escalation", pattern: /\bdesactiva (?:las |los )?(?:salvaguardas|controles de seguridad)\b/i },
];
