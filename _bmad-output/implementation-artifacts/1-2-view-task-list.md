# Story: View Task List

**Story Key:** 1-2-view-task-list
**Epic:** Epic 1: Core Task Lifecycle Management
**Story ID:** 1.2
**Status:** done

## User Story

As a user,
I want to view a list of all my existing tasks,
So that I can see what I need to accomplish.

## Acceptance Criteria

- [ ] **Given** there are tasks in the database
- [ ] **When** I load the application
- [ ] **Then** I see a list of all existing tasks
- [ ] **And** the list accurately reflects the current state of tasks (title, completed status, creation time)

## Tasks/Subtasks

- [x] Task 1: Backend — `GET /tasks` endpoint
  - [x] Add `GET /` handler to `backend/src/routes/tasks/index.ts` (next to existing `POST /`)
  - [x] Query `SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks ORDER BY created_at ASC` and return `{ "data": [...] }`
  - [x] Add Fastify inject test(s) in `backend/test/routes/tasks/index.test.ts` covering:
    - Empty list returns `{ "data": [] }` with 200
    - List with tasks returns all persisted tasks with correct shape
- [x] Task 2: Frontend — real query replacing mock
  - [x] Extract the API base URL into a constant (e.g., `const API_BASE = "http://localhost:3000"`) in `frontend/src/App.tsx`
  - [x] Replace the mock `queryFn` in the `useQuery` call with a real `fetch("${API_BASE}/tasks")` that:
    - Returns `res.json().data` as the `Task[]` result
    - Throws if `!res.ok`
  - [x] Ensure the `queryKey: ["tasks"]` remains consistent with story 1-1's `setQueryData` call (no regression)
  - [x] Verify task list renders correctly with real data from the API (title, isCompleted styling already present from story 1-1)
  - [x] Add query error state: when the query errors, show a visible `role="alert"` message (similar pattern to `createMutation.isError` already in the file)
- [x] Task 3: Run full test suite
  - [x] `cd backend && npm test` — all tests pass (no regressions)
  - [x] Manually verify in browser: tasks persisted from story 1-1 testing appear on page load

## Dev Notes

### Architecture Requirements

- **API endpoint:** `GET /tasks` — returns full list, no pagination for MVP. Response envelope: `{ "data": [...] }`.
- **SQL query:** `SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks ORDER BY created_at ASC` — maps DB `snake_case` columns to JSON `camelCase` keys inline in the SELECT statement (same pattern used in `POST /tasks`).
- **Response shape per task:**
  ```json
  {
    "id": 1,
    "title": "Do laundry",
    "isCompleted": 0,
    "createdAt": "2026-04-28 10:00:00"
  }
  ```
  Note: `isCompleted` is returned as `0`/`1` integer from SQLite (BOOLEAN stored as integer). Do NOT cast to JS boolean in the backend — story 1-4 will handle completion toggle and will establish the canonical boolean handling. Keep consistent with the shape returned by `POST /tasks` in story 1-1.
- **No schema validation needed** on `GET /tasks` request (no body/params).
- **Test isolation:** Backend tests use in-memory SQLite (`:memory:`) via `NODE_ENV=test`. Each `build(t)` call creates a fresh app with a fresh DB. When testing `GET /tasks`, first `POST` a task in the same test to seed data, or test empty state first.
- **Frontend state:** `queryKey: ["tasks"]` is already used by `setQueryData` in the `createMutation.onSuccess` handler from story 1-1. The real `queryFn` must remain compatible — it returns `Task[]` directly (the `.data` envelope is unwrapped in the queryFn itself).
- **No new dependencies** are needed for this story.

### File Structure (UPDATE — no new files)

All changes are to **existing files** — no new files should be created:

| File                                      | Change                               |
| ----------------------------------------- | ------------------------------------ |
| `backend/src/routes/tasks/index.ts`       | Add `GET /` handler                  |
| `backend/test/routes/tasks/index.test.ts` | Add tests for `GET /tasks`           |
| `frontend/src/App.tsx`                    | Replace mock queryFn with real fetch |

### Key Patterns Established in Story 1-1 (MUST Follow)

1. **Route handler pattern** (`backend/src/routes/tasks/index.ts`):

   ```typescript
   fastify.get("/", async function (request, reply) {
     const tasks = db.prepare("SELECT ...").all();
     reply.send({ data: tasks });
   });
   ```

   - Use `db.prepare(...).all()` for list queries (returns `unknown[]`).
   - Return `reply.send({ data: tasks })` — no explicit status code needed for 200.

2. **Test pattern** (`backend/test/routes/tasks/index.test.ts`):

   ```typescript
   import { test } from "tap";
   import { build } from "../../helper";

   test("lists tasks when empty", async (t) => {
     const app = await build(t as any);
     const res = await app.inject({ method: "GET", url: "/tasks" });
     t.equal(res.statusCode, 200);
     t.same(res.json(), { data: [] });
   });

   test("lists tasks after creating one", async (t) => {
     const app = await build(t as any);
     // Seed via POST first
     await app.inject({
       method: "POST",
       url: "/tasks",
       payload: { title: "Buy milk" },
     });
     const res = await app.inject({ method: "GET", url: "/tasks" });
     t.equal(res.statusCode, 200);
     const body = res.json();
     t.equal(body.data.length, 1);
     t.equal(body.data[0].title, "Buy milk");
   });
   ```

   - Each `build(t as any)` call creates an isolated in-memory DB — no cross-test contamination.
   - Import from `"../../helper"` (no `.js` extension — ts-node runtime).
   - Do NOT call `initDb()` separately — it is already called inside `build()` via `app.ts`.

3. **Frontend queryFn pattern** (`frontend/src/App.tsx`):

   ```typescript
   const { data: tasks = [], isError: isTasksError } = useQuery<Task[]>({
     queryKey: ["tasks"],
     queryFn: async () => {
       const res = await fetch(`${API_BASE}/tasks`);
       if (!res.ok) throw new Error("Failed to fetch tasks");
       const json = await res.json();
       return json.data as Task[];
     },
   });
   ```

   - Unwrap the `.data` envelope inside `queryFn` so the query data type is `Task[]` — the `setQueryData(["tasks"], ...)` call in `onSuccess` already pushes `Task[]` format.
   - Keep the `const { data: tasks = [] }` destructure — default to `[]` for loading/error states.

4. **Error display pattern** (already in `App.tsx` for `createMutation.isError`):
   ```tsx
   {
     isTasksError && (
       <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
         Failed to load tasks. Please refresh the page.
       </p>
     );
   }
   ```
   Place this near the top of the task list section, before the `<ul>`.

### Previous Story Learnings (1-1)

- **Import extension:** Use `"../../helper"` not `"../../helper.js"` — ts-node resolves without extensions.
- **tap type cast:** `build(t as any)` — tap/fastify-cli type incompatibility is known; do not try to fix it.
- **`initDb()` is idempotent** (uses `CREATE TABLE IF NOT EXISTS`) but must NOT be called in tests — `build()` already invokes it via `app.ts`.
- **`db.prepare(...).get()` returns `unknown`** — cast or type-assert the result as needed.
- **`db.prepare(...).all()` returns `unknown[]`** — same casting applies.
- **`better-sqlite3` completed value:** `isCompleted` is returned as integer `0`/`1` from SQLite. The existing test in 1-1 asserts `t.equal(body.data.isCompleted, 0)` — maintain this behavior for consistency.
- **CORS already configured** in `app.ts` for `http://localhost:5173` and `http://127.0.0.1:5173` — no changes needed.
- **API base URL** in `App.tsx` is currently hardcoded inline (`"http://localhost:3000/tasks"`). Extract to a constant as part of this story to reduce duplication.

### Testing Framework Details

- **Backend:** `tap` + `ts-node/register` + `c8` coverage. Run: `cd backend && npm test`.
- **Test command:** `npm run build:ts && tsc -p test/tsconfig.json && c8 node --test -r ts-node/register "test/**/*.ts"`.
- **Frontend:** Vitest (unit, not yet configured for component tests in story 1-1 — no frontend unit tests required for this story unless the task specifies it).
- **E2E:** Playwright in `/e2e/` — not required for this story.

### Architecture Boundary Notes

- This story completes the read half of the frontend↔backend contract: after this story, tasks created by `POST /tasks` will immediately appear in the `GET /tasks` response, and the UI query will populate from real data.
- The `queryKey: ["tasks"]` cache is shared between `useQuery` and `createMutation.onSuccess` — this is intentional and correct. After task creation, `setQueryData` adds the new task to the cached list without requiring a refetch.

## Dev Agent Record

### Implementation Plan

1. Added `GET /` handler in `backend/src/routes/tasks/index.ts` using `db.prepare(...).all()` with inline column aliasing.
2. Added `clearDb()` export to `backend/src/db/index.ts` to reset shared in-memory DB singleton between test cases (the db module is a process-level singleton — `build()` does not create a new DB instance per test).
3. Added 3 new inject tests: empty list, single seeded task, multiple tasks in order. All 4 tests call `clearDb()` at the top for isolation.
4. Replaced mock `queryFn` in `frontend/src/App.tsx` with real `fetch` to `GET /tasks`; extracted `API_BASE` constant; added `isTasksError` alert.

### Completion Notes

- `GET /tasks` endpoint implemented and tested (21/21 tests pass, 0 regressions)
- `clearDb()` utility added to db module for test isolation — important learning: `db` is a module singleton, not per-`build()` instance
- Frontend `queryFn` now real; `API_BASE` constant extracted; query error state added
- TypeScript compiles clean (no errors)

### Review Findings (AI)

- [x] [Review][Decision] `createdAt` not displayed in task list UI — AC says "the list accurately reflects the current state of tasks (title, completed status, creation time)" but no `createdAt` is rendered in the `<li>` markup [frontend/src/App.tsx]
- [x] [Review][Patch] `clearDb()` exported from production code with no runtime guard — should throw if `NODE_ENV !== 'test'` [backend/src/db/index.ts:33]
- [x] [Review][Patch] Frontend `Task.isCompleted` typed as `boolean` but API returns integer `0`/`1` — type mismatch [frontend/src/App.tsx:16]
- [x] [Review][Defer] No response schema on `GET /tasks` route — pre-existing pattern, response schemas not used anywhere [backend/src/routes/tasks/index.ts:5] — deferred, pre-existing
- [x] [Review][Defer] `API_BASE` hardcoded to `localhost:3000` — env var config is deployment concern, not MVP scope [frontend/src/App.tsx:11] — deferred, pre-existing
- [x] [Review][Defer] No index on `created_at` column used in ORDER BY — pre-existing schema design [backend/src/db/index.ts] — deferred, pre-existing
- [x] [Review][Defer] No error handling wrapping `db.prepare().all()` in GET route — same pattern as POST; Fastify global handler catches [backend/src/routes/tasks/index.ts:5] — deferred, pre-existing
- [x] [Review][Defer] No `AbortController`/timeout on `fetch` calls — pre-existing pattern from story 1-1 [frontend/src/App.tsx] — deferred, pre-existing
- [x] [Review][Defer] No frontend component tests for task list rendering — not in scope for this story [frontend/src/App.tsx] — deferred, pre-existing

## File List

- `backend/src/routes/tasks/index.ts` (MODIFIED — added `GET /` handler)
- `backend/src/db/index.ts` (MODIFIED — added `clearDb()` export for test isolation)
- `backend/test/routes/tasks/index.test.ts` (MODIFIED — added 3 GET tests + `clearDb()` calls)
- `frontend/src/App.tsx` (MODIFIED — real queryFn, `API_BASE` constant, `isTasksError` alert)

## Change Log

- 2026-04-28: Implemented `GET /tasks` backend endpoint with 4 inject tests (21 total pass)
- 2026-04-28: Added `clearDb()` to db module for test isolation between shared in-memory DB tests
- 2026-04-28: Frontend migrated from mock to real `GET /tasks` query; extracted `API_BASE`; added query error display
