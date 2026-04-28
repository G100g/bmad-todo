# Deferred Work

## Deferred from: code review of 1-2-view-task-list (2026-04-28)

- No response schema on `GET /tasks` route — pre-existing pattern, response schemas not used anywhere
- `API_BASE` hardcoded to `localhost:3000` — env var config is deployment concern, not MVP scope
- No index on `created_at` column used in ORDER BY — pre-existing schema design
- No error handling wrapping `db.prepare().all()` in GET route — same pattern as POST; Fastify global handler catches
- No `AbortController`/timeout on `fetch` calls — pre-existing pattern from story 1-1
- No frontend component tests for task list rendering — not in scope for this story
