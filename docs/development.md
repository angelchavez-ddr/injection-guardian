# Development

## Local loop

```bash
cp .env.example .env.local
npm install
npm run db:deploy
npm run dev
```

The app listens on port 3000. Overview should show simulated findings without `XAI_API_KEY` or Gmail credentials.

Prisma CLI reads `.env` and then `.env.local`. Next.js reads the same files. Keep secrets in `.env.local`.

## Checks

```bash
npm test
npm run lint
npm run typecheck
```

`npm test` uses Vitest. Integration coverage creates a temporary SQLite file and applies the committed SQL migration. It does not call a hosted model.

## Database

This repo uses Prisma ORM 7.10 with `@prisma/adapter-libsql` 7.10. The adapter class exported by that version is `PrismaLibSql`. Do not mix that setup with Prisma 6 `driverAdapters` preview instructions or with an older `PrismaLibSQL` import.

Generate the client:

```bash
npm run db:generate
```

Apply existing migrations:

```bash
npm run db:deploy
```

Create a new local migration after a schema change:

```bash
npm run db:migrate
```

Hosted Turso is not the migration target. Generate SQL against `file:./dev.db`, then apply the migration file with the Turso CLI:

```bash
turso db shell <database-name> < prisma/migrations/<timestamp>_init/migration.sql
```

Set `DATABASE_URL` to the `libsql://` URL and `TURSO_AUTH_TOKEN` for the running app. The token stays on the server.

If `prisma generate` fails after a clean install, run `npm run db:generate` once. The client output under `src/generated` is gitignored.

## Analyzers

- `AI_PROVIDER=grok` with `XAI_API_KEY` calls `https://api.x.ai/v1/chat/completions`.
- `AI_PROVIDER=gemini` with `GEMINI_API_KEY` uses `@google/genai`.
- `AI_PROVIDER=local` calls `LOCAL_LLM_BASE_URL` (default `http://127.0.0.1:11434/v1/chat/completions`) with `LOCAL_LLM_MODEL` (default `gpt-oss:20b`). No cloud key is required. Reach a DGX through `ssh -N -L 11434:localhost:11434 USER@DGX_HOST` instead of exposing Ollama.
- Demo mode without the selected cloud key uses `MockAnalyzer`. `local` does not fall back to the mock.
- Change `XAI_MODEL` if your xAI account uses a different model id than `grok-4`.

A timeout, HTTP 429, or schema failure becomes `analysis_failed` and a fail-closed policy decision. No tool runs.

## Gmail

Set the OAuth client id, secret, and redirect URI. Sign in with Google, then choose Conectar Gmail on Overview. That request uses `https://www.googleapis.com/auth/gmail.readonly` plus identity scopes. The refresh token is encrypted on the user row and is not shown in the browser or the audit log. Escanear correos entrantes reads the 10 newest inbox messages, fetches each body, and runs the same local indicators, triage, and policy pipeline.

`GOOGLE_REFRESH_TOKEN` remains an optional server-wide fallback for the connector status endpoint. Without a per-user token, Overview shows the connect action instead of scanning a mailbox.

## Troubleshooting

- **Empty overview.** Confirm `DEMO_MODE` is not `false`, then check `/api/health`. `database: unavailable` means the SQLite file or Turso URL could not be opened. Run `npm run db:deploy`.
- **Prisma URL errors.** An empty `DATABASE_URL` falls back to `file:./dev.db`. A `libsql://` URL without `TURSO_AUTH_TOKEN` will fail when the app queries Turso.
- **Port in use.** Stop the other process or run `npx next dev --port 3001`.
- **Type errors after a schema change.** Run `npm run db:generate` before `npm run typecheck`.
- **Gmail `history_expired`.** The connector returns `cursorExpired` instead of silently downloading the mailbox. Start a new metadata sync.
- **Analysis returns 403.** `DEMO_MODE=false` refuses unauthenticated analysis. Set it back to `true` for local work.

## Before any shared deployment

Add authentication and authorization, store OAuth tokens in a sealed store, remove the local callback that displays a refresh token, put a real approval step in front of sensitive tools, and keep model keys only on the server. Until then, treat the app as a local demo.
