# Repository Guidelines

## Project Structure & Module Organization
- `api/` — Hono server entry (`server.ts`).
- `services/` — core RAG pipeline: `query-planning.ts`, `vector-search.ts`, `relevance-evaluation.ts`, `answer-generation.ts`.
- `utils/` — helpers (`database.ts`, `prompt.ts`).
- `config/` — runtime config (`constants.ts`, `cerebras.ts`).
- `scripts/` — CLIs for data and RAG (`persistent-embed-speeches.ts`, `persistent-rag-cli.ts`, `sync-missing-embeddings.ts`).
- `types/` — shared TypeScript types.
- `data/` — DB dumps/backups; mounted by Docker compose.

## Build, Test, and Development Commands
- Setup DB (PostgreSQL + pgvector): `docker compose up -d` (uses `compose.yaml`).
- Env: `cp .env.example .env` then set `DATABASE_URL`, `CEREBRAS_API_KEY`, optional `OLLAMA_BASE_URL`, `PORT`.
- Run API: `deno run -A api/server.ts` (check: `curl localhost:8000/`).
- Search API example: `curl -X POST localhost:8000/search -H 'Content-Type: application/json' -d '{"query":"防衛費", "limit":10}'`.
- Embed speeches: `deno run -A scripts/persistent-embed-speeches.ts --batch-size 20 --start-date 2023-01-01`.
- RAG CLI: `deno run -A scripts/persistent-rag-cli.ts "岸田総理 防衛費"`.
- Format / Lint: `deno fmt` and `deno lint`.
- Optional quick type-check: `deno check api/server.ts`.

## Coding Style & Naming Conventions
- Language: TypeScript (Deno). Indent 2 spaces; semicolons on; max line width ~100; double quotes (see `deno.json`).
- Files: kebab-case (`vector-search.ts`), types/interfaces in `types/` (PascalCase), env vars UPPER_SNAKE_CASE.
- Prefer explicit return types on exported functions; use async/await; avoid magic numbers (add to `config/constants.ts`).

## Testing Guidelines
- Framework: Deno built-in tests. Name as `*_test.ts` next to code (e.g., `vector-search_test.ts`).
- Run: `deno test -A` (add `--coverage=coverage/` if collecting).
- New/changed logic should include unit tests covering happy-path and error handling.

## Commit & Pull Request Guidelines
- Conventional messages observed: `feat:`, `fix:`, `chore:`, `refactor:`, `impl:`. Example: `feat(api): add /search endpoint validation`.
- PRs must include: purpose, linked issues, how to run (commands), sample request/response (or logs), and any schema changes.

## Security & Configuration Tips
- Never commit secrets; keep `.env` local. Update `.env.example` when adding variables.
- PostgreSQL runs on `localhost:5432`; scripts will create vector tables/indexes if missing.
- For large embeds, prefer `--limit`/`--max-batches` to avoid long runs.

## Agent Notes
- Keep changes minimal and focused; do not rename files casually.
- Mirror existing patterns (modules in `services/`, config in `config/`). Update docs and examples when interfaces change.
