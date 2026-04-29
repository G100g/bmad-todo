# Deferred Work

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
