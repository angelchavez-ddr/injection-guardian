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
- Demo mode without the selected key uses `MockAnalyzer`.
- Change `XAI_MODEL` if your xAI account uses a different model id than `grok-4`.

A timeout, HTTP 429, or schema failure becomes `analysis_failed` and a fail-closed policy decision. No tool runs.

## Gmail

Set the OAuth client id, secret, and redirect URI. Start at `/api/connectors/gmail/start` while `DEMO_MODE=true`. The callback shows a refresh token once so you can place it in `GOOGLE_REFRESH_TOKEN`. It is not written to the database. The scope requested is `https://www.googleapis.com/auth/gmail.readonly`.

Without those values, the synthetic mailbox is used. That mailbox is enough for the dashboard and tests.

## Troubleshooting

- **Empty overview.** Confirm `DEMO_MODE` is not `false`, then check `/api/health`. `database: unavailable` means the SQLite file or Turso URL could not be opened. Run `npm run db:deploy`.
- **Prisma URL errors.** An empty `DATABASE_URL` falls back to `file:./dev.db`. A `libsql://` URL without `TURSO_AUTH_TOKEN` will fail when the app queries Turso.
- **Port in use.** Stop the other process or run `npx next dev --port 3001`.
- **Type errors after a schema change.** Run `npm run db:generate` before `npm run typecheck`.
- **Gmail `history_expired`.** The connector returns `cursorExpired` instead of silently downloading the mailbox. Start a new metadata sync.
- **Analysis returns 403.** `DEMO_MODE=false` refuses unauthenticated analysis. Set it back to `true` for local work.

## Before any shared deployment

Add authentication and authorization, store OAuth tokens in a sealed store, remove the local callback that displays a refresh token, put a real approval step in front of sensitive tools, and keep model keys only on the server. Until then, treat the app as a local demo.
