# Story 1.5: Delete Task

Status: done

## Story

As a user,
I want to permanently delete an existing task,
so that I can remove items I no longer need to track.

## Acceptance Criteria

1. Given I have an existing task in my list
   When I select the option to delete the task
   Then the task is permanently removed from the database
   And the task is no longer visible in the UI list

## Tasks / Subtasks

- [x] Task 1: Add backend DELETE endpoint (AC: 1)
  - [x] Add `DELETE /tasks/:id` route in `backend/src/routes/tasks/index.ts` with params schema `{ id: { type: "integer" } }`
  - [x] Reuse existing API envelope patterns:
    - Success: `{ data: ... }`
    - Not found: `{ error: { code: "NOT_FOUND", message: "Task not found" } }`
    - Internal error: `{ error: { code: "DB_ERROR", message: "Internal server error during delete" } }`
  - [x] Keep boolean normalization consistent by using existing `mapTask` for deleted task response
  - [x] Preserve existing GET/POST/PATCH behavior without side effects

- [x] Task 2: Add backend integration tests for DELETE (AC: 1)
  - [x] Add test: delete existing task returns success with deleted task payload
  - [x] Add test: deleted task no longer appears in `GET /tasks`
  - [x] Add test: deleting non-existent task returns 404 with `NOT_FOUND`
  - [x] Add test: deleting one task does not remove other tasks
  - [x] Follow established test setup pattern (`clearDb()`, `build(t as any)`, `inject`)

- [x] Task 3: Add frontend delete mutation and UI action (AC: 1)
  - [x] Add `deleteMutation` in `frontend/src/App.tsx` using `useMutation`
  - [x] Call `DELETE ${API_BASE}/tasks/${id}` and surface backend message on failure when present
  - [x] On success, update React Query cache immutably using `filter` to remove deleted task
  - [x] Add a Delete button in each non-editing task row with accessible label and disabled state while pending
  - [x] Add delete error alert using current `role="alert"` pattern

- [x] Task 4: Validate keyboard and interaction behavior (AC: 1)
  - [x] Ensure Delete button is keyboard-focusable and operable with Enter/Space
  - [x] Ensure focus ring visibility remains clear for keyboard-only users
  - [x] Ensure task row remains readable with existing checkbox + title + date + edit layout

- [x] Task 5: Regression verification (AC: 1)
  - [x] Run backend tests: `cd backend && npm test`
  - [x] Verify no regressions in create, list, edit, complete/uncomplete flows
  - [x] Verify lint/TypeScript remain clean for touched files

## Dev Notes

### Story Context

- This story implements FR6 from the planning artifacts: permanent deletion of a task.
- Epic sequencing context:
  - Story 1.4 is completed and introduced boolean normalization for task payloads.
  - Story 1.5 should preserve those response shape guarantees and mutation patterns.

### Existing Code State (Read Before Editing)

- `backend/src/routes/tasks/index.ts`
  - Currently contains GET, POST, PATCH handlers.
  - Uses `TaskRow` and `mapTask` to normalize `isCompleted` to boolean.
  - PATCH uses unified update query and 404 behavior; preserve this style.

- `backend/test/routes/tasks/index.test.ts`
  - Uses Tap with `clearDb()` + `build(t as any)` pattern.
  - Contains route-integration tests covering GET/POST/PATCH and edge cases.
  - Add DELETE tests in same style and keep assertions explicit on envelopes.

- `frontend/src/App.tsx`
  - Uses React Query (`useQuery`, `useMutation`) for all server interactions.
  - Current task row includes checkbox toggle and Edit action.
  - Error reporting already uses inline alert blocks; follow same pattern for delete failures.

### Architecture Compliance Requirements

- Keep REST path conventions and response envelope contracts from architecture:
  - Path style: `/tasks/:id`
  - Success envelope: `{ data: ... }`
  - Error envelope: `{ error: { code, message } }`
- Keep JSON payload naming in camelCase.
- Keep DB access raw SQL via existing `better-sqlite3` usage.
- Do not introduce ORM/framework changes or new dependencies.

### Library / Framework Requirements

- Fastify + JSON schema validation: continue validating route params with schema.
- React Query v5 cache updates should be immutable in `setQueryData` callbacks.
- Preserve existing Tailwind styling conventions and accessibility utility classes.

### Implementation Guidance

- Backend delete behavior:
  - Fetch target task first for deterministic response payload.
  - If target not found, return 404 envelope.
  - Delete by id and return deleted task mapped through `mapTask`.

- Frontend mutation behavior:
  - Mirror existing mutation style from `editMutation` and `completeMutation`.
  - Use backend error message if present, fallback to a stable default message.
  - On success, remove task from cache using immutable array `filter`.

### Testing Requirements

- Add integration tests in `backend/test/routes/tasks/index.test.ts` for:
  - Successful deletion.
  - Post-delete list exclusion.
  - 404 not found deletion.
  - Isolation with multiple tasks.
- Maintain all existing passing tests.
- Verify backend coverage remains above required threshold.

### Previous Story Intelligence (1.4)

- Keep `mapTask` as canonical boolean normalization path.
- Keep response/error envelope consistency already enforced through prior review.
- Continue using cache-update-on-success mutation pattern in frontend.
- Keep deferred items deferred unless explicitly required (optimistic UI and strict AJV coercion changes are currently deferred work).

### Git Intelligence Summary

Recent commits indicate stable implementation patterns for task lifecycle work:

- Route work concentrated in `backend/src/routes/tasks/index.ts`
- API integration tests in `backend/test/routes/tasks/index.test.ts`
- UI and mutation work in `frontend/src/App.tsx`
- Story tracking and deferred notes updated in implementation artifacts

Follow the same file boundaries for this story.

### Latest Technical Notes

- Fastify current docs confirm schema-based request validation with Ajv; route param schema should remain explicit.
- TanStack Query docs emphasize immutable `setQueryData` updates from mutation responses; do not mutate cached arrays in place.

### Project Structure Notes

- This story is UPDATE-only and should touch existing files:
  - `backend/src/routes/tasks/index.ts`
  - `backend/test/routes/tasks/index.test.ts`
  - `frontend/src/App.tsx`
- Do not create new service layers or folders for this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.5-Delete-Task]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format-Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience-Mechanics]
- [Source: _bmad-output/implementation-artifacts/1-4-complete-and-uncomplete-tasks.md]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md]
- [Source: backend/src/routes/tasks/index.ts]
- [Source: backend/test/routes/tasks/index.test.ts]
- [Source: frontend/src/App.tsx]

## Dev Agent Record

### Agent Model Used

Gemini 3.1 Pro (Preview)

### Debug Log References

- None

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story includes explicit implementation guardrails, existing-code preservation notes, and concrete tests for delete behavior.
- Implemented `DELETE /tasks/:id` following existing REST patterns and mapTask boolean normalization.
- Added 4 integration tests ensuring success, 404 handling, and no side-effects on other tasks.
- Updated React Query with `deleteMutation` adjusting cache immutably.
- Included accessible UI elements for Deletion action inside task rows.
- Validated regression, build, and lint checks.

### Change Log

- Added `DELETE` backend endpoint to `backend/src/routes/tasks/index.ts`
- Added 4 new integration tests to `backend/test/routes/tasks/index.test.ts`
- Added `deleteMutation` and "Delete" button UI to `frontend/src/App.tsx`

### File List

- backend/src/routes/tasks/index.ts
- backend/test/routes/tasks/index.test.ts
- frontend/src/App.tsx

### Senior Developer Review (AI)

Review Date: 2026-04-29
Outcome: Changes Requested
Action Items: 5 patch, 6 deferred, 5 dismissed

#### Action Items

- [x] [Review][Patch] DELETE handler atomicity — call `mapTask` before DELETE; check `result.changes === 0` for TOCTOU safety [backend/src/routes/tasks/index.ts]
- [x] [Review][Patch] Cross-mutation guard — Delete button should also disable when `editMutation.isPending` or `completeMutation.isPending` [frontend/src/App.tsx]
- [x] [Review][Patch] Missing test: `DELETE /tasks/abc` (non-integer ID) should return 400 [backend/test/routes/tasks/index.test.ts]
- [x] [Review][Patch] Missing test: double-delete same task should return 404 on second call [backend/test/routes/tasks/index.test.ts]
- [x] [Review][Patch] Success test: add assertions for `isCompleted` and `createdAt` in deletion response [backend/test/routes/tasks/index.test.ts]
- [x] [Review][Defer] `catch (e: any)` typing — pre-existing pattern in PATCH handler; use `unknown` in a future refactor
- [x] [Review][Defer] No response schema on DELETE route — pre-existing across all routes
- [x] [Review][Defer] `additionalProperties: false` absent from params schema — consistent with PATCH handler pattern
- [x] [Review][Defer] Delete error banner never clears — pre-existing pattern across all mutations in component
- [x] [Review][Defer] Fragile ordering assertions in isolation test — low risk given `ORDER BY created_at ASC`
- [x] [Review][Defer] Global `deleteMutation.isPending` disables all Delete buttons — consistent with existing codebase mutation pattern

### Review Follow-ups (AI)

- [x] [AI-Review][High] DELETE handler atomicity: map task before deleting, check `result.changes === 0` [backend/src/routes/tasks/index.ts]
- [x] [AI-Review][Med] Cross-mutation guard on Delete button: add `editMutation.isPending || completeMutation.isPending` to disabled prop [frontend/src/App.tsx]
- [x] [AI-Review][Med] Add test: `DELETE /tasks/abc` returns 400 (schema validation of non-integer ID) [backend/test/routes/tasks/index.test.ts]
- [x] [AI-Review][Med] Add test: double-delete returns 404 on second attempt [backend/test/routes/tasks/index.test.ts]
- [x] [AI-Review][Low] Extend success test: assert `isCompleted` and `createdAt` are present in delete response [backend/test/routes/tasks/index.test.ts]
