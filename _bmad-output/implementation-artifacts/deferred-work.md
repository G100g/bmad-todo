# Deferred Work

## Deferred from: code review of 3-2-automated-quality-reporting (2026-04-29)

- **Backend c8 no `--check-coverage` flags** — `npm test` always exits 0 regardless of coverage level; threshold only checked post-hoc by the report script. Pre-existing design choice; acceptable for current workflow. [backend/package.json]
- **Path separator hardcoded as `/`** — File path stripping uses `file.replace(ROOT + "/", "")` which breaks on Windows. Project is macOS/Linux-only; no Windows CI requirement. [scripts/generate-quality-report.js]
- **Hardcoded `curl` liveness check on fixed port** — Port and `curl` availability are not configurable; works for current dev/CI environment but is not portable. [scripts/generate-quality-report.js]
- **No automated test confirming all report files produced** — Story Task 8 explicitly allows "manual validation"; reports were validated manually during implementation. [scripts/generate-quality-report.js]

## Deferred from: code review of 1-2-view-task-list (2026-04-28)

- No response schema on `GET /tasks` route — pre-existing pattern, response schemas not used anywhere
- `API_BASE` hardcoded to `localhost:3000` — env var config is deployment concern, not MVP scope
- No index on `created_at` column used in ORDER BY — pre-existing schema design
- No error handling wrapping `db.prepare().all()` in GET route — same pattern as POST; Fastify global handler catches
- No `AbortController`/timeout on `fetch` calls — pre-existing pattern from story 1-1
- No frontend component tests for task list rendering — not in scope for this story

## Deferred from: code review of 1-3-edit-existing-task.md (2026-04-29)

- No concurrent edit handling (optimistic locking): Backend has no version checking, optimistic locking, or conflict detection. Simultaneous edits silently overwrite each other without notification. Pre-existing architectural limitation, deferred for future sprint.
- Missing audit trail and updated_at timestamp: No change logging, no `updated_at` timestamp, no user attribution for modifications. Compliance and debugging nightmare. Pre-existing feature gap, deferred.
- No retry or error recovery UI: Frontend edit mutation fails silently with generic message. No retry button, exponential backoff, or state recovery. Pre-existing UX limitation, deferred as nice-to-have.

## Deferred from: code review of 1-4-complete-and-uncomplete-tasks.md (2026-04-29)

- No Optimistic UI Updates [frontend/src/App.tsx] — Checkbox locks during request instead of optimistic update.
- Lax Input Validation [backend/src/routes/tasks/index.ts] — Fastify accepts coerced types for boolean `completed` instead of strict validation.

## Deferred from: code review of 1-5-delete-task.md (2026-04-29)

- `catch (e: any)` in DELETE handler — pre-existing pattern in PATCH handler; replace with `unknown` and narrow in a future cleanup pass.
- No response schema on DELETE route — pre-existing across all routes; add response schemas in a future hardening story.
- `additionalProperties: false` absent from params schema on DELETE — consistent with PATCH handler pattern; apply globally in a future hardening story.
- Delete error banner never clears — pre-existing pattern across all mutations; add `mutation.reset()` on a future UX polish story.
- Fragile ordering assertions in isolation test — low risk given `ORDER BY created_at ASC`; revisit if query order ever changes.
- Global `deleteMutation.isPending` disables all Delete buttons — consistent with existing codebase mutation pattern; per-task pending state is an improvement for a future UX story.

## Deferred from: code review of 3-1-single-command-orchestration.md (April 29, 2026)

- Dangerous Test Instructions [README.md]: `README.md` documents `npm run test:e2e` for Playwright but the stack mounts `./data:/app/data` to the local filesystem. Running E2E tests against the running Docker stack will mutate the local development database, causing side effects for the developer's manual testing.
