# Story 1.4: Complete and Uncomplete Tasks

**Story Key:** 1-4-complete-and-uncomplete-tasks
**Epic:** Epic 1: Core Task Lifecycle Management
**Story ID:** 1.4
**Status:** review

## Story

As a user,
I want to mark tasks as completed or incomplete,
so that I can track my progress.

## Acceptance Criteria

1. **Given** I have a task in my list
   **When** I toggle the completion status of the task
   **Then** the task's status is updated in the database
   **And** the UI visually distinguishes between completed and incomplete tasks

## Tasks / Subtasks

- [x] Task 1: Backend — Extend PATCH + Boolean Normalization (AC: 1)
  - [x] Add `mapTask` helper function in `backend/src/routes/tasks/index.ts` to cast `isCompleted` to proper boolean: `const mapTask = (row: any) => ({ ...row, isCompleted: Boolean(row.isCompleted) })`. Apply it to ALL SELECT results in GET `/`, POST `/`, and PATCH `/:id` handlers (this story owns the canonical boolean decision deferred from 1.3)
  - [x] Add `completed: { type: "boolean" }` to the PATCH `/:id` body schema `properties`. Update the body TypeScript cast to `{ title?: string; completed?: boolean } | undefined`. Add conditional update block inside the existing `try/catch`: if `completed !== undefined`, run `UPDATE tasks SET completed = ? WHERE id = ?` with `completed ? 1 : 0` and handle `result.changes === 0` → 404
  - [x] Update existing tests in `backend/test/routes/tasks/index.test.ts` that check for integer `0` — three assertions must change: (a) "creates a task" `isCompleted === 0` → `false`, (b) "lists tasks after creating one" `isCompleted === 0` → `false`, (c) "updates task title" `isCompleted === 0` → `false`
  - [x] Add new inject tests in `backend/test/routes/tasks/index.test.ts`:
    - PATCH `{ completed: true }` on existing task → 200, `isCompleted === true`, title unchanged
    - PATCH `{ completed: false }` on previously-completed task → 200, `isCompleted === false`
    - PATCH `{ completed: true }` on non-existent id → 404 with `error.code === "NOT_FOUND"`
    - PATCH `{ title: "new", completed: true }` (both fields) → 200, both title and `isCompleted` updated

### Review Findings

- [ ] [Review][Patch] Inefficient Backend Updates / Missing Transaction / Race Condition [backend/src/routes/tasks/index.ts] - Separate UPDATE queries instead of one, no transaction boundary, and redundant checks.
- [ ] [Review][Patch] mapTask 'any' typing & null crash [backend/src/routes/tasks/index.ts] - Uses `any` and crashes on null argument.
- [ ] [Review][Patch] PATCH empty body non-existent task returns 500 instead of 404 [backend/src/routes/tasks/index.ts]
- [ ] [Review][Patch] Shallow Error Handling on Frontend [frontend/src/App.tsx] - Drops backend error payload.
- [ ] [Review][Patch] UI/UX: Missing label for checkbox [frontend/src/App.tsx] - Checkbox doesn't wrap text in `<label>` making click target tiny.
- [ ] [Review][Patch] Query cache 'old' is undefined initialized as empty array [frontend/src/App.tsx] - `old ? old.map...` sets empty array if undefined.
- [x] [Review][Defer] No Optimistic UI Updates [frontend/src/App.tsx] — deferred, pre-existing
- [x] [Review][Defer] Lax Input Validation [backend/src/routes/tasks/index.ts] — deferred, pre-existing

- [x] Task 2: Frontend — Checkbox Toggle (AC: 1)
  - [x] Update `Task` interface in `frontend/src/App.tsx`: change `isCompleted: number` to `isCompleted: boolean`
  - [x] Add `completeMutation` using `PATCH ${API_BASE}/tasks/${id}` with body `{ completed }`. On success, update cache via `qc.setQueryData(["tasks"], (old) => old.map(t => t.id === data.data.id ? data.data : t))`. Follow the exact same mutation pattern as `editMutation`.
  - [x] In `tasks.map()`, for the non-editing view: add a `<input type="checkbox" checked={task.isCompleted} onChange={() => completeMutation.mutate({ id: task.id, completed: !task.isCompleted })}` before the title `<span>`. Add `aria-label` for accessibility. Disable while `completeMutation.isPending`. Apply line-through to `<span>` when `task.isCompleted` is `true` (existing conditional already works with booleans).
  - [x] Show `completeMutation.isError` alert using the same `role="alert"` pattern as `createMutation.isError` and `editMutation.isError`

- [x] Task 3: Run full test suite (AC: 1)
  - [x] `cd backend && npm test` — all tests pass with no regressions (all previously passing tests must still pass after boolean conversion and new tests must pass)

## Dev Notes

### Critical Decision: Boolean Normalization (Owned by This Story)

Story 1.3 explicitly deferred the `isCompleted` boolean handling to story 1.4:

> "**`isCompleted` is integer 0/1** from SQLite — do NOT cast to boolean in this story. Story 1.4 owns the canonical boolean handling decision."

**Architecture mandate** (from `architecture.md` → Format Patterns):

> "**Booleans:** Strict boolean types (`true`/`false`), not integers (`1`/`0`)."

Therefore, this story MUST introduce `mapTask` and apply it across all task response routes. This is not optional.

### PATCH Endpoint Extension

The existing `PATCH /:id` in `backend/src/routes/tasks/index.ts` already supports partial updates (no required fields in body schema). This story extends it with the `completed` field. The body schema currently:

```typescript
body: {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 500 },
  },
  additionalProperties: false,
},
```

After this story:

```typescript
body: {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 500 },
    completed: { type: "boolean" },
  },
  additionalProperties: false,
},
```

Note: Fastify's default AJV has `coerceTypes: true`. A JSON body of `{ "completed": 1 }` may be coerced to `true`. This is acceptable for MVP — the frontend always sends proper booleans.

### mapTask Helper Pattern

Add near the top of the route function body (inside the `export default async function`), before the route registrations:

```typescript
const mapTask = (row: any) => ({
  ...row,
  isCompleted: Boolean(row.isCompleted),
});
```

Apply it to EVERY place a task row is returned:

| Handler      | Change                                                   |
| ------------ | -------------------------------------------------------- |
| GET `/`      | `.all()` result → `tasks.map(mapTask)`                   |
| POST `/`     | `.get(info.lastInsertRowid)` result → `mapTask(newTask)` |
| PATCH `/:id` | `.get(id)` result → `mapTask(updated)`                   |

### Handler Extension: completed Update Logic

Add INSIDE the existing `try/catch` block in the PATCH handler, after the `title` conditional:

```typescript
const body = request.body as
  | { title?: string; completed?: boolean }
  | undefined;
const title = body?.title;
const completed = body?.completed;

try {
  if (title !== undefined) {
    const result = db
      .prepare("UPDATE tasks SET title = ? WHERE id = ?")
      .run(title, id);
    if (result.changes === 0) {
      reply.code(404).send({
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
      return;
    }
  }

  if (completed !== undefined) {
    const result = db
      .prepare("UPDATE tasks SET completed = ? WHERE id = ?")
      .run(completed ? 1 : 0, id);
    if (result.changes === 0) {
      reply.code(404).send({
        error: { code: "NOT_FOUND", message: "Task not found" },
      });
      return;
    }
  }

  const updated = db
    .prepare(
      "SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks WHERE id = ?",
    )
    .get(id);

  if (!updated) {
    reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch updated task",
      },
    });
    return;
  }

  reply.send({ data: mapTask(updated) });
} catch (e: any) {
  fastify.log.error(e);
  reply.code(500).send({
    error: {
      code: "DB_ERROR",
      message: "Internal server error during update",
    },
  });
}
```

### Existing Tests That Need Updating (boolean conversion)

Three specific assertions in `backend/test/routes/tasks/index.test.ts` use integer 0 and must be updated to boolean `false`:

| Test name                        | Old assertion                          | New assertion                              |
| -------------------------------- | -------------------------------------- | ------------------------------------------ |
| "creates a task"                 | `t.equal(body.data.isCompleted, 0)`    | `t.equal(body.data.isCompleted, false)`    |
| "lists tasks after creating one" | `t.equal(body.data[0].isCompleted, 0)` | `t.equal(body.data[0].isCompleted, false)` |
| "updates task title"             | `t.equal(body.data.isCompleted, 0)`    | `t.equal(body.data.isCompleted, false)`    |

### New Backend Test Patterns

Follow the established `tap` + `clearDb()` + `build(t as any)` pattern:

```typescript
test("marks task as completed", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task to complete" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { completed: true },
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.isCompleted, true);
  t.equal(body.data.title, "Task to complete"); // unchanged
  t.equal(body.data.id, taskId);
});

test("unmarks task as incomplete", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task to uncomplete" },
  });
  const taskId = create.json().data.id;

  // First, complete it
  await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { completed: true },
  });

  // Then uncomplete
  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { completed: false },
  });

  t.equal(res.statusCode, 200);
  t.equal(res.json().data.isCompleted, false);
});

test("returns 404 when completing non-existent task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "PATCH",
    url: "/tasks/99999",
    payload: { completed: true },
  });

  t.equal(res.statusCode, 404);
  t.equal(res.json().error.code, "NOT_FOUND");
});

test("can update both title and completed in one PATCH", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Original" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { title: "Renamed", completed: true },
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.title, "Renamed");
  t.equal(body.data.isCompleted, true);
});
```

### Frontend completeMutation Pattern

Add alongside the existing `createMutation` and `editMutation` in `TaskApp`:

```typescript
const completeMutation = useMutation({
  mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    return res.json();
  },
  onSuccess: (data) => {
    qc.setQueryData(["tasks"], (old: Task[] = []) =>
      old.map((t) => (t.id === data.data.id ? data.data : t)),
    );
  },
});
```

### Frontend Checkbox Rendering

Add inside the `tasks.map()` non-editing `<>...</>` branch, BEFORE the title `<span>`:

```tsx
<input
  type="checkbox"
  checked={task.isCompleted}
  onChange={() =>
    completeMutation.mutate({ id: task.id, completed: !task.isCompleted })
  }
  disabled={completeMutation.isPending}
  aria-label={`Mark "${task.title}" as ${task.isCompleted ? "incomplete" : "complete"}`}
  className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
/>
```

The existing line-through conditional `task.isCompleted ? "line-through text-zinc-400" : "text-zinc-800 dark:text-white"` works correctly with boolean `true`/`false` — no change needed there.

### Frontend Error Display

Add after the existing `editMutation.isError` block:

```tsx
{
  completeMutation.isError && (
    <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
      Failed to update task status. Please try again.
    </p>
  );
}
```

### File Structure (UPDATE — no new files needed)

All changes are to **existing files** — do NOT create new files:

| File                                      | Change                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `backend/src/routes/tasks/index.ts`       | Add `mapTask` helper, apply to all responses, extend PATCH schema + handler             |
| `backend/test/routes/tasks/index.test.ts` | Update 3 existing assertions, add 4 new PATCH tests                                     |
| `frontend/src/App.tsx`                    | Update `Task.isCompleted` type, add `completeMutation`, add checkbox, add error display |

### Architecture Compliance

- **API Response:** `{ "data": { id, title, isCompleted: boolean, createdAt } }` — strict boolean enforced via `mapTask`
- **Naming:** `isCompleted` (camelCase) in JSON; `completed` (snake_case) in SQLite — mapping preserved
- **No new dependencies:** only `better-sqlite3` and Fastify/React Query already installed
- **additionalProperties: false** remains on PATCH body schema — prevents unknown field injection
- **Error envelope:** `{ "error": { "code": "NOT_FOUND", "message": "..." } }` maintained

### Learnings from Previous Stories

- **Story 1.3 key learning:** The PATCH handler was deliberately relaxed to not require `title` in the body (partial update semantics). Story 1.4 continues this pattern — neither `title` nor `completed` is required. Empty body → returns current task state.
- **Deferred from 1.3:** No `updated_at` timestamp on the tasks table. Do NOT add this column in story 1.4 — it's explicitly deferred per `deferred-work.md`.
- **Deferred from 1.3:** No optimistic locking. Do NOT implement version checking in story 1.4.
- **Test pattern:** Always `clearDb()` first, then `build(t as any)`, then inject calls. Tap's `t` must be cast as `any`.
- **Frontend mutation pattern:** Always `onSuccess` updates the React Query cache via `qc.setQueryData(["tasks"], ...)` for instant UI update without a refetch.

### References

- Architecture booleans mandate: [Source: `_bmad-output/planning-artifacts/architecture.md#Format-Patterns`]
- PATCH handler current state: [Source: `backend/src/routes/tasks/index.ts`]
- Existing test patterns: [Source: `backend/test/routes/tasks/index.test.ts`]
- Frontend mutation patterns: [Source: `frontend/src/App.tsx`]
- Deferred items: [Source: `_bmad-output/implementation-artifacts/deferred-work.md`]
- Story 1.3 deferral note: [Source: `_bmad-output/implementation-artifacts/1-3-edit-existing-task.md#Dev-Notes`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

None required — implementation proceeded without blockers.

### Completion Notes List

- Introduced `mapTask` helper in `backend/src/routes/tasks/index.ts` to cast SQLite integer 0/1 → proper JS `boolean` for `isCompleted`. Applied to all three task-returning handlers: GET `/`, POST `/`, PATCH `/:id`.
- Extended PATCH `/:id` body schema with `completed: { type: "boolean" }`. Handler now processes `completed` conditional separately from `title`, each with its own 404 guard on `result.changes === 0`.
- Updated 3 existing backend test assertions from `isCompleted === 0` to `isCompleted === false` to reflect the boolean normalization.
- Added 4 new backend inject tests: mark completed, unmark to incomplete, 404 on non-existent, combined title+completed update. All pass.
- Updated `Task` interface in `frontend/src/App.tsx` from `isCompleted: number` to `isCompleted: boolean`.
- Added `completeMutation` following the same React Query pattern as `editMutation`. Cache updated on success via `qc.setQueryData`.
- Added checkbox `<input>` before task title span with `aria-label`, disabled state, and `accent-blue-600` styling. Line-through conditional unchanged — works correctly with boolean.
- Added `completeMutation.isError` alert block using `role="alert"` pattern.
- Final test run: 47 tests, 47 pass, 0 fail. TypeScript: 0 errors.

### File List

- `backend/src/routes/tasks/index.ts`
- `backend/test/routes/tasks/index.test.ts`
- `frontend/src/App.tsx`

### Change Log

- 2026-04-29: Story 1.4 implementation — complete/uncomplete task toggle. Added `mapTask` boolean normalization across all task routes, extended PATCH schema with `completed` field, updated 3 existing tests, added 4 new backend tests, added frontend checkbox with completeMutation.
