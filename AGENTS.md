# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router (pages, API routes). Webhook at `src/app/api/tg/route.ts`.
- `src/bot/`: grammY bot setup and command handlers (`bot.ts`).
- `src/lib/`: shared utilities (`env.ts` for Zod env validation, `supabase.ts`).
- `src/worker/`: background job processor (`index.ts`).
- `scripts/`: operational scripts (`setWebhook.ts`).
- Config: `.eslintrc.json`, `.prettierrc`, `tsconfig.json`, `vercel.json`.

## Build, Test, and Development Commands
- `pnpm dev`: Start Next.js dev server (webhook mode with tunnel).
- `pnpm build`: Compile production build.
- `pnpm start`: Run production server locally.
- `pnpm lint` / `pnpm lint:fix`: Lint code (fix issues).
- `pnpm type-check`: TypeScript checks without emitting.
- `pnpm bot:dev`: Run bot in polling mode for local development.
- `pnpm bot:set-webhook`: Register Telegram webhook (uses `PUBLIC_URL`).
- `pnpm worker:dev`: Start background worker loop.
- `pnpm prisma:generate`: Generate Prisma client.
- `pnpm prisma:migrate`: Create/apply a migration from schema.
- `pnpm prisma:deploy`: Apply pending migrations (CI/prod).

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`). Prefer `@/*` imports via `tsconfig` paths.
- Formatting: Prettier (2 spaces, single quotes, semicolons, width 80, trailing commas `es5`).
- Linting: ESLint (`next/core-web-vitals`), `prefer-const: error`.
- Naming: camelCase for variables/functions, PascalCase for components/types, kebab-case for files in UI routes.
- Env files: use `.env.local` (never commit secrets).

## Testing Guidelines
- Framework not included yet. If adding, prefer Vitest or Jest with files beside source: `*.test.ts` or `*.spec.ts`.
- Aim for unit tests on bot handlers and lib utilities; mock Telegram/Supabase clients.
- Run via `pnpm test` once configured; keep coverage pragmatic for critical paths.

## Commit & Pull Request Guidelines
- Commits: imperative mood, concise subject (<72 chars), scoped when helpful (e.g., "bot:").
- PRs: clear description, link issues, list env/config changes, add screenshots or sample updates where relevant (e.g., bot responses), and test notes.
- CI/Checks: ensure `pnpm lint` and `pnpm type-check` pass before requesting review.

## Security & Configuration Tips
- Required env vars: `BOT_TOKEN`, `WEBHOOK_SECRET`, `PUBLIC_URL` (webhooks), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE` (required in production).
- Validate env via `src/lib/env.ts`. Keep webhook handlers fast; offload heavy work to `src/worker/`.
- For local webhooks, use a tunnel (e.g., ngrok) then run: `PUBLIC_URL=https://... pnpm bot:set-webhook`.

## Prisma Setup
- Add `DATABASE_URL` in `.env.local` using Supabase connection string (non-readonly).
- Schema at `prisma/schema.prisma` defines `jobs`.
- Commands: `pnpm prisma:generate`, `pnpm prisma:migrate --name <msg>`, `pnpm prisma:deploy`.
- Prefer migrations via Prisma; avoid manual SQL DDL in docs.


## Roadmap

Phase 1 — Extraction
- [ ] Instagram Reels/Post → candidate places with Google Maps links (WIP)
- [ ] Accept other inputs (plain text, websites) to extract places
- [ ] Export results as JSON/CSV for downstream use

Phase 2 — Enrichment
- [ ] Enrich places via Google Places/OpenStreetMap details
- [ ] De-duplicate/merge candidates; confidence scoring
- [ ] Region hints and language handling

Phase 3 — Update Suggestions
- [ ] Generate suggested map updates (e.g., OSM edits) for review
- [ ] Human-in-the-loop review flows inside Telegram
- [ ] Track applied/approved suggestions

Phase 4 — Usage & Billing (optional)
- [ ] Usage logging and quotas
- [ ] Team sharing / collaboration
- [ ] Billing integration if needed

Notes
- Focus on map data quality and operator UX.
- Keep webhook handlers fast; defer heavy work to `src/worker/`.
