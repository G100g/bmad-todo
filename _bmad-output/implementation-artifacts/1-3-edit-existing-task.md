# Story 1.3: Edit Existing Task

**Story Key:** 1-3-edit-existing-task
**Epic:** Epic 1: Core Task Lifecycle Management
**Story ID:** 1.3
**Status:** review

## Story

As a user,
I want to edit the text of an existing task,
so that I can correct mistakes or update my plans.

## Acceptance Criteria

1. **Given** I have an existing task in my list
   **When** I select the task to edit and submit new text
   **Then** the task's text is updated in the database
   **And** the UI reflects the modified text

## Tasks / Subtasks

- [x] Task 1: Backend — `PATCH /tasks/:id` endpoint (AC: 1)
  - [x] Add `PATCH /:id` handler in `backend/src/routes/tasks/index.ts` with JSON Schema for both params (`id` as integer) and body (`title` required, string, minLength: 1, maxLength: 500)
  - [x] If `UPDATE tasks SET title = ? WHERE id = ?` changes 0 rows, return 404 with `{ "error": { "code": "NOT_FOUND", "message": "Task not found" } }`
  - [x] On success, re-`SELECT` the updated row and return `{ "data": { id, title, isCompleted, createdAt } }` with 200
  - [x] Add inject tests in `backend/test/routes/tasks/index.test.ts`:
    - Success: create task via POST, PATCH title, verify 200 + updated title + unchanged id/isCompleted
    - 404: PATCH a non-existent id, verify 404 + error envelope
    - 400: PATCH with missing `title` field, verify 400 (Fastify schema validation)
    - 400: PATCH with empty string title, verify 400 (minLength: 1 violation)
- [x] Task 2: Frontend — inline edit mode in `frontend/src/App.tsx` (AC: 1)
  - [x] Add `editingId: number | null` state (initially `null`) and `editTitle: string` state to `TaskApp`
  - [x] Add `editMutation` using `PATCH ${API_BASE}/tasks/${id}` with body `{ title }`; on success, update cache via `qc.setQueryData(["tasks"], (old) => old.map(t => t.id === data.data.id ? data.data : t))`; reset `editingId`/`editTitle`
  - [x] Add `startEdit(task: Task)` helper (sets `editingId = task.id`, `editTitle = task.title`) and `cancelEdit()` helper (resets both to null/"")
  - [x] In `tasks.map()`: when `editingId === task.id`, render a `<form>` with a text `<input>` (value=`editTitle`, autoFocus) plus Save (`type="submit"`) and Cancel (`type="button"`) buttons; otherwise render existing title `<span>` plus an Edit `<button>` that calls `startEdit(task)`
  - [x] Show `editMutation.isError` alert using the same `role="alert"` pattern as `createMutation.isError`
- [x] Task 3: Run full test suite (AC: 1)
  - [x] `cd backend && npm test` — all tests pass with no regressions (previously 4 tests must still pass)

## Dev Notes

### Architecture Requirements

- **Endpoint:** `PATCH /tasks/:id` — partial update, only `title` in this story. Story 1.4 will extend the same route file with `completed` field support.
- **Params schema** (Fastify coerces string URL param → integer automatically when `type: 'integer'` is specified — this is default AJV behaviour with `coerceTypes: true`):
  ```json
  {
    "type": "object",
    "properties": { "id": { "type": "integer" } },
    "required": ["id"]
  }
  ```
- **Body schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string", "minLength": 1, "maxLength": 500 }
    },
    "required": ["title"],
    "additionalProperties": false
  }
  ```
- **404 detection:** Use `db.prepare("UPDATE tasks SET title = ? WHERE id = ?").run(title, id)` and check `result.changes === 0`. This is simpler and more atomic than a prior SELECT. Return 404 with the standard error envelope.
- **Response after update:** Re-SELECT the full row using the established pattern:
  ```sql
  SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks WHERE id = ?
  ```
  Return `{ data: updatedTask }` with implicit 200 via `reply.send(...)`.
- **`isCompleted` is integer 0/1** from SQLite — do NOT cast to boolean in this story. Story 1.4 owns the canonical boolean handling decision.
- **No new dependencies** required. Uses only existing `better-sqlite3` (`db`) and Fastify.
- **Error envelope pattern** (already established):
  ```json
  { "error": { "code": "NOT_FOUND", "message": "Task not found" } }
  ```

### File Structure (UPDATE — no new files needed)

All changes are to **existing files** — do NOT create new files:

| File                                      | Change                                                    |
| ----------------------------------------- | --------------------------------------------------------- |
| `backend/src/routes/tasks/index.ts`       | Add `PATCH /:id` handler with schema + 404 + update logic |
| `backend/test/routes/tasks/index.test.ts` | Add 4 new inject tests for PATCH                          |
| `frontend/src/App.tsx`                    | Add edit state, editMutation, inline edit rendering       |

> **Architecture note:** The architecture doc references `frontend/src/components/features/TaskItem.tsx` as the ideal target for task item rendering. However, stories 1.1 and 1.2 kept all UI logic in `App.tsx`. This story continues the same pattern. Component extraction is deferred to a later story or refactoring pass to avoid unscoped changes.

### Backend Implementation Pattern

Follow the exact same handler style as the existing `POST /` handler in `backend/src/routes/tasks/index.ts`:

```typescript
fastify.patch(
  "/:id",
  {
    schema: {
      params: {
        type: "object",
        properties: { id: { type: "integer" } },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 500 },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  async function (request, reply) {
    const { id } = request.params as { id: number };
    const { title } = request.body as { title: string };

    const result = db
      .prepare("UPDATE tasks SET title = ? WHERE id = ?")
      .run(title, id);

    if (result.changes === 0) {
      reply.code(404).send({
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
      return;
    }

    const updated = db
      .prepare(
        "SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks WHERE id = ?",
      )
      .get(id);

    reply.send({ data: updated });
  },
);
```

### Backend Test Pattern

Follows the exact `tap` + `clearDb()` + `build(t as any)` pattern established in stories 1.1 and 1.2:

```typescript
test("updates task title", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Original title" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { title: "Updated title" },
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.title, "Updated title");
  t.equal(body.data.id, taskId);
  t.equal(body.data.isCompleted, 0); // unchanged
  t.ok(body.data.createdAt); // unchanged
});

test("returns 404 when patching non-existent task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "PATCH",
    url: "/tasks/99999",
    payload: { title: "Ghost update" },
  });

  t.equal(res.statusCode, 404);
  const body = res.json();
  t.equal(body.error.code, "NOT_FOUND");
});

test("returns 400 when title is missing", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "PATCH",
    url: "/tasks/1",
    payload: {},
  });

  t.equal(res.statusCode, 400);
});

test("returns 400 when title is empty string", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "PATCH",
    url: "/tasks/1",
    payload: { title: "" },
  });

  t.equal(res.statusCode, 400);
});
```

### Frontend Implementation Pattern

The edit state and mutation follow the exact same hook and `setQueryData` patterns established in stories 1.1/1.2 within `TaskApp`:

```typescript
// New state (add alongside existing useState hooks)
const [editingId, setEditingId] = useState<number | null>(null);
const [editTitle, setEditTitle] = useState("");

// Helpers
const startEdit = (task: Task) => {
  setEditingId(task.id);
  setEditTitle(task.title);
};
const cancelEdit = () => {
  setEditingId(null);
  setEditTitle("");
};

// Edit mutation (add alongside createMutation)
const editMutation = useMutation({
  mutationFn: async ({ id, title }: { id: number; title: string }) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    return res.json();
  },
  onSuccess: (data) => {
    qc.setQueryData(["tasks"], (old: Task[] = []) =>
      old.map((t) => (t.id === data.data.id ? data.data : t)),
    );
    setEditingId(null);
    setEditTitle("");
  },
});

const handleEditSubmit = (e: React.FormEvent, taskId: number) => {
  e.preventDefault();
  if (editTitle.trim()) {
    editMutation.mutate({ id: taskId, title: editTitle.trim() });
  }
};
```

Task list item render (replace the existing `<li>` content inside `tasks.map()`):

```tsx
{
  tasks.map((task) => (
    <li
      key={task.id}
      className="flex items-center gap-3 p-3 bg-zinc-50 rounded border border-zinc-200 dark:bg-zinc-700 dark:border-zinc-600"
    >
      {editingId === task.id ? (
        <form
          onSubmit={(e) => handleEditSubmit(e, task.id)}
          className="flex flex-1 gap-2"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            className="flex-1 px-2 py-1 border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-600 dark:border-zinc-500 dark:text-white"
            disabled={editMutation.isPending}
          />
          <button
            type="submit"
            disabled={!editTitle.trim() || editMutation.isPending}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={editMutation.isPending}
            className="px-3 py-1 bg-zinc-200 text-zinc-700 text-sm rounded hover:bg-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-600 dark:text-zinc-200"
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <span
            className={
              task.isCompleted
                ? "line-through text-zinc-400"
                : "text-zinc-800 dark:text-white"
            }
          >
            {task.title}
          </span>
          <span className="ml-auto text-xs text-zinc-400">
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
          <button
            onClick={() => startEdit(task)}
            className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded dark:text-blue-400 dark:hover:text-blue-300"
          >
            Edit
          </button>
        </>
      )}
    </li>
  ));
}
```

Error alert (add alongside the existing `createMutation.isError` alert block):

```tsx
{
  editMutation.isError && (
    <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
      Failed to update task. Please try again.
    </p>
  );
}
```

### Key Patterns Established in Stories 1.1 and 1.2 (MUST Follow)

1. **Route handler placement:** All route handlers go in `backend/src/routes/tasks/index.ts` as `fastify.verb(...)` calls inside the default exported async function.
2. **Test isolation:** Call `clearDb()` at the top of every `test(...)` block — the `db` module is a process-level singleton, shared across all tests in the file.
3. **Import style:** `import { clearDb } from "../../../src/db/index"` (no `.js` extension — ts-node runtime resolves without it).
4. **tap type cast:** `build(t as any)` — known type incompatibility, do not attempt to fix.
5. **`db.prepare(...).get()` returns `unknown`** — type-assert the result when needed.
6. **`db.prepare(...).run()` returns `RunResult`** with `.changes` (number of affected rows) and `.lastInsertRowid`. Use `.changes === 0` to detect not-found on UPDATE.
7. **React Query cache update:** Use `qc.setQueryData(["tasks"], ...)` in `onSuccess` — do not invalidate and refetch (no network round-trip needed; full updated task is returned in the PATCH response).
8. **`queryKey: ["tasks"]`** must remain `["tasks"]` — it is shared by `useQuery`, the create `setQueryData`, and now the edit `setQueryData`.

### Forward-Compatibility Note for Story 1.4

Story 1.4 (Complete and Uncomplete Tasks) will need to update the `completed` column via the same `PATCH /tasks/:id` route. When implementing story 1.4, extend the existing handler to accept `{ completed?: boolean }` in addition to `{ title?: string }` and make **at least one field required** via AJV `anyOf` or keep as two separate schema-validated fields with at least one present. Alternatively, story 1.4 could add a dedicated endpoint. Either way, story 1.3 does NOT implement `completed` support — leave the current body schema as `{ title }` required only.

### Testing Framework Details (Unchanged)

- **Backend:** `tap` + `ts-node/register` + `c8` coverage. Run: `cd backend && npm test`.
- **Test command:** `npm run build:ts && tsc -p test/tsconfig.json && c8 node --test -r ts-node/register "test/**/*.ts"` (as configured in `backend/package.json`).
- **No frontend unit tests** required for this story — the current project has no Vitest component test setup.
- **E2E:** Playwright in `/e2e/` — not required for this story.

### References

- Previous story dev notes and patterns: [\_bmad-output/implementation-artifacts/1-2-view-task-list.md](_bmad-output/implementation-artifacts/1-2-view-task-list.md)
- Backend route handler: [backend/src/routes/tasks/index.ts](backend/src/routes/tasks/index.ts)
- Backend DB module: [backend/src/db/index.ts](backend/src/db/index.ts)
- Backend tests: [backend/test/routes/tasks/index.test.ts](backend/test/routes/tasks/index.test.ts)
- Frontend App: [frontend/src/App.tsx](frontend/src/App.tsx)
- Architecture — API patterns: [\_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md#format-patterns)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (dev-story workflow, 2026-04-28)

### Debug Log References

### Completion Notes List

- Task 1: Added `PATCH /:id` handler to `backend/src/routes/tasks/index.ts`. Uses AJV schema validation for both params (`id` as integer via coercion) and body (`title` required, minLength:1, maxLength:500, additionalProperties:false). 404 detection via `result.changes === 0` on the UPDATE. Re-SELECTs full row on success and returns `{ data: updatedTask }`. All 4 new inject tests pass (success, 404, missing title, empty title). 30/30 backend tests pass total.
- Task 2: Updated `frontend/src/App.tsx` with `editingId`/`editTitle` state, `startEdit`/`cancelEdit` helpers, `editMutation` (PATCH + setQueryData cache update), `handleEditSubmit`, conditional task row rendering (edit form with autoFocus input + Save/Cancel buttons vs. title span + Edit button), and `editMutation.isError` alert. TypeScript compiles clean.
- Task 3: Full backend test suite — 30/30 pass, 0 regressions.

### File List

- `backend/src/routes/tasks/index.ts` (MODIFIED — added `PATCH /:id` handler)
- `backend/test/routes/tasks/index.test.ts` (MODIFIED — added 4 PATCH inject tests)
- `frontend/src/App.tsx` (MODIFIED — added edit state, editMutation, inline edit UI, error alert)

### Change Log

- 2026-04-28: Story created via create-story workflow with full implementation context from stories 1.1 and 1.2
- 2026-04-28: Implemented `PATCH /tasks/:id` endpoint with 4 inject tests (30 total pass, 0 regressions)
- 2026-04-28: Frontend inline edit mode added to `App.tsx` — edit state, mutation, conditional rendering, error alert

### Review Findings

- [x] [Review][Patch] Incomplete CORS methods whitelist [backend/src/app.ts:19-20]
- [x] [Review][Patch] Missing authorization checks on PATCH [backend/src/routes/tasks/index.ts]
- [x] [Review][Patch] Partial update semantic violation in PATCH [backend/src/routes/tasks/index.ts]
- [x] [Review][Patch] Frontend race condition on rapid edits [frontend/src/App.tsx:52-82]
- [x] [Review][Patch] Type safety mismatch in test [backend/test/routes/tasks/index.test.ts]
- [x] [Review][Patch] Untested schema constraint validation [backend/test/routes/tasks/index.test.ts]
- [x] [Review][Patch] Missing import validation for test helper [backend/test/routes/tasks/index.test.ts]
- [x] [Review][Patch] Missing SQL injection validation test [backend/test/routes/tasks/index.test.ts]
- [x] [Review][Patch] Response structure validation missing [frontend/src/App.tsx:65-82]
- [x] [Review][Patch] NULL returned after successful UPDATE [backend/src/routes/tasks/index.ts:85-89]
- [x] [Review][Patch] Unhandled database errors in PATCH handler [backend/src/routes/tasks/index.ts:75-91]
- [x] [Review][Patch] Stale error state persists after cancel [frontend/src/App.tsx:65-82]
- [x] [Review][Defer] No concurrent edit handling (optimistic locking) [backend/src/routes/tasks/index.ts] — deferred, pre-existing
- [x] [Review][Defer] Missing audit trail and updated_at timestamp [backend/src/db/index.ts] — deferred, pre-existing
- [x] [Review][Defer] No retry or error recovery UI [frontend/src/App.tsx] — deferred, pre-existing
