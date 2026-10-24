# Threat model

Injection Guardian reduces risk from prompt injection. It does not prove that unflagged content is safe, and it does not replace human review for sensitive actions.

## Assets

- Untrusted content that an agent might read: email, HTML, files, API payloads, and pasted text.
- Analyst decisions and the audit trail.
- Model and OAuth credentials.
- The policy catalog and the boundary between advice and action.
- Mailbox metadata when a live Gmail connector is configured.

## Trust boundaries

- Browser to Next.js server. The browser must not receive API keys, OAuth secrets, or refresh tokens.
- Connector to core pipeline. Provider payloads are normalized before scoring.
- Pipeline to model. The model receives a minimized excerpt and is told the excerpt is data.
- Model to policy engine. Proposed tools are untrusted until the catalog validates them.
- Policy engine to tools. This build has no external tool side effects.
- Server to database. Audit rows are redacted excerpts, not full bodies or credentials.

## Attack scenarios

- **Direct injection.** A person submits “ignore previous instructions” or a role override.
- **Indirect injection.** The same instruction is hidden in an email, HTML comment, or off-screen element.
- **Obfuscation.** Zero-width characters, homoglyphs, or Base64 wrap an instruction.
- **Exfiltration and tool abuse.** Content asks the agent to forward mail, reveal a prompt, or call `send_email` / `execute_command`.
- **Policy bypass.** Content tells the system to disable the guardian or grant itself admin.
- **Misleading model.** The analyzer returns a low score and recommends a prohibited tool.
- **Malformed model output.** The response is not valid JSON or breaks the schema.
- **Metadata gap.** A benign snippet hides an instruction in the body that was not fetched.
- **Secret leakage.** A message contains an address or a token that could be copied into the audit log or a prompt.

## Mitigations in this build

- External content is treated as data during normalization, prompting, and policy checks.
- Local patterns are specific and configurable, and benign regression samples are tested.
- Obfuscation is folded before matching, and hidden HTML is included in the scan text.
- Only escalated items are sent to a model, and batches have a cap.
- Model JSON is schema-checked. A bad response fails closed and forces review.
- The combined score never drops below the local score.
- The tool catalog denies external actions. Unknown tools and invalid arguments fail closed.
- Gmail is read-only. The demo pipeline cannot send mail, delete mail, or run commands.
- Audit storage redacts emails, phone numbers, and common token prefixes, and it keeps a short excerpt.
- Demo mode is explicit. Production-style exposure without authentication is refused.

## Residual risk

- Pattern screening misses novel wording, other languages, and encodings that are not in the rule set.
- A benign snippet can hide a malicious body until that message is selected or its metadata escalates.
- Homoglyph coverage is a small map, not a full confusable-character pass.
- Redaction is heuristic and can miss unusual secret formats.
- Model review can be wrong in either direction. It cannot authorize an action, but it also cannot prove safety.
- There is no account system, approval workflow, token vault, or production Gmail watch channel.
- Local SQLite and a single-process rate limit are not a multi-user control.

## Out of scope

- Guaranteed prevention or detection of prompt injection.
- A full SIEM, case management system, or identity platform.
- Automatic send, delete, quarantine, or account changes.
- Production multi-tenant Gmail synchronization.
- Using an LLM as the only judge of whether an action is allowed.
