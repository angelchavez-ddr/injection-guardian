# Architecture

Injection Guardian separates intake, local screening, optional model review, policy enforcement, storage, and the SOC console. UI components display decisions. They do not make them.

## Flow

1. **Ingest.** A demo form, API request, or email connector supplies content. Gmail-specific code stays behind `EmailConnector`.
2. **Normalize.** HTML is converted with Cheerio. Hidden text and comments are retained for screening. Invisible characters and a small homoglyph map are folded. Size limits reject oversized input. Emails, phone numbers, and obvious token shapes are redacted before storage or a model call.
3. **Local screening.** Configurable patterns look for instruction overrides, role hijacks, prompt theft, exfiltration, tool abuse, privilege or policy bypass, obfuscation, hidden markup, and suspicious links. Words such as “ignore”, “delete”, and “system” do not match by themselves.
4. **Triage.** The local score is the sum of unique indicator weights, capped at 100. Default bands are info under 10, low from 10, medium from 30, high from 60, and critical from 85. Scores under 15 stay locally screened, scores from 15 are queued, and scores from 35 escalate. These thresholds live in `defaultRiskConfig`.
5. **AI analysis.** Only escalated items, or an explicit force flag, call the analyzer. A batch cap defaults to 5. The excerpt is minimized. Grok is the primary provider. Gemini implements the same `SecurityAnalyzer` interface and is used only when selected. The mock provider is the demo default without keys. Responses must match a Zod schema.
6. **Policy.** `evaluatePolicy` uses a server-side tool catalog. Unknown tools and invalid arguments fail closed. Send, delete, account changes, commands, secret reads, and policy changes are denied. Quarantine requires approval and is not executed. The only recorded “execution” is an analyst note with no external effect. Model score can raise the combined score and cannot lower the local score. Model severity is advisory.
7. **Audit.** The event, analysis status, and stage records are stored. The excerpt is short and redacted. Credentials are not audit fields.
8. **Review.** The dashboard reads those records. Simulated samples are labeled.

## Modules

| Path | Responsibility |
| --- | --- |
| `src/lib/security/normalization` | Limits, HTML extraction, folding, redaction |
| `src/lib/security/indicators` | Configurable suspicion patterns |
| `src/lib/security/risk-engine` | Weights, severity, triage, confidence |
| `src/lib/security/guardian-policy` | Tool catalog and fail-closed decisions |
| `src/lib/security/pipeline.ts` | Orchestrates the stages |
| `src/lib/ai/providers` | `SecurityAnalyzer`, Grok, Gemini, mock |
| `src/lib/connectors/email` | Email connector interface, Gmail, synthetic mailbox |
| `src/server/repositories` | Prisma and in-memory audit stores |
| `src/app/(dashboard)` | SOC views |
| `src/app/api` | Health, analysis, events, Gmail OAuth helpers |

## Data

Prisma ORM 7 keeps the datasource URL in `prisma.config.ts`. The schema uses the SQLite provider. Runtime connections use `@prisma/adapter-libsql` and the installed class `PrismaLibSql`.

- Local demo: `DATABASE_URL=file:./dev.db`
- Turso: `DATABASE_URL=libsql://...` plus `TURSO_AUTH_TOKEN`

`prisma migrate` is aimed at the URL in `prisma.config.ts`. For hosted Turso, create the migration against the local file, then apply `prisma/migrations/.../migration.sql` with the Turso CLI. Do not point the local migration command at production data casually.

Models:

- `Connector` describes a source. It does not store tokens.
- `SecurityEvent` is one screened item.
- `AnalysisResult` stores advisory model output separately from deterministic indicators.
- `AuditLog` records ingest, screen, analyze, and policy stages.

## Confidence

`confidence` is the count of distinct local indicator categories, scaled into 0.2–0.95. An empty screen is 0.2 because there was little evidence, not because the content is probably safe. `reportedConfidence` from a model is stored and displayed as a self-report. Neither number is a probability of compromise.

## Gmail

`GmailConnector` implements list, metadata get, full get, and incremental history sync. List and history paths request metadata, not every body. `screenEmailBatch` fetches a full body only for selected ids or for metadata that already escalates, and it still respects the AI cap. Missing OAuth credentials select `DemoGmailConnector`.

The allowed Gmail operations are profile, message list, message get, and history list. The scope is `gmail.readonly`.

## Demo boundary

`DEMO_MODE=true` is required for the analysis and findings APIs. `DEMO_MODE=false` returns 403 because authentication is not implemented. Health and the settings view do not print secrets.
