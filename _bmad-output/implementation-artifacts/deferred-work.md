# Deferred Work

## Deferred from: code review of 5-1-integration-test-framework-setup (2026-04-30)

- **Dual test runner architecture** — `backend/package.json` has two test runners: legacy `node --test` (unit tests) and new Vitest (integration tests). They coexist but create maintenance complexity; consolidation is a future cleanup task. Pre-existing design.
- **Database cleanup only clears tasks table** — `setup.ts` and fixture cleanup hooks only `DELETE FROM tasks`; future tables added to the schema won't be cleaned between tests, risking cross-test contamination. Pre-existing limitation.
- **Performance test flakiness** — `expect(elapsed).toBeLessThan(500)` assertions in the Performance describe block are environment-dependent and will fail on slow/loaded machines. Required by spec NFR; threshold is lenient (tests run ~20ms) but the risk remains.
- **Helper error robustness** — `statusCode` validation before comparisons and sanitizing `response.payload` in error messages were flagged but are low-priority test-code quality concerns. Pre-existing pattern.

## Deferred from: code review of 4-2-e2e-task-management-full-suite (2026-04-29)

- `waitUntil: "networkidle"` documented Playwright antipattern — background polling or any open connection can stall the signal indefinitely; the subsequent `task-input.waitFor` already provides a reliable readiness anchor. Pre-existing risk; current tests pass locally. [e2e/tests/task-management-full-suite.spec.ts:20]
- Edit input locator uses `taskList` scope instead of row scope — App only allows one item in edit mode at a time, making the broader locator safe in practice. Add `data-testid="task-edit-input"` to the frontend input in a future hardening story to enable strict row-scoped targeting. [e2e/tests/task-management-full-suite.spec.ts:73,82,192,199]

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

## Deferred from: code review of 4-1-app-unit-tests-msw (2026-04-29)

- PATCH handler always uses `mockTask` as base — title edits to completed tasks silently reset `isCompleted` to false; no current test exercises this path [frontend/src/mocks/handlers.ts]
- `completeMutation` singleton disables all checkboxes while any one is in-flight — pre-existing App.tsx design [frontend/src/App.tsx]
- `deleteMutation` singleton disables all delete buttons while any one is in-flight — pre-existing App.tsx design [frontend/src/App.tsx]
- `deletedTaskIndex === -1` produces misplaced splice in delete `onError` — pre-existing App.tsx edge case [frontend/src/App.tsx]
- `editMutation.onError` silently skips rollback when `context.previousTask` is undefined — pre-existing App.tsx edge case [frontend/src/App.tsx]
- `fetchCount` closure fragile under unexpected background refetches — works in practice in controlled vitest environment [frontend/src/App.test.tsx]
- `document.activeElement` assertion unreliable in jsdom — works in practice; theoretical jsdom focus model limitation [frontend/src/App.test.tsx]
- Non-deterministic `createdAt` timestamp in POST handler — no current test compares timestamps [frontend/src/mocks/handlers.ts]

## Deferred from: code review of 3-1-single-command-orchestration.md (April 29, 2026)

- Dangerous Test Instructions [README.md]: `README.md` documents `npm run test:e2e` for Playwright but the stack mounts `./data:/app/data` to the local filesystem. Running E2E tests against the running Docker stack will mutate the local development database, causing side effects for the developer's manual testing.
