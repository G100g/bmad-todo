# Story 4.1: App.tsx Unit Tests with MSW

Status: ready-for-dev

## Story

As a developer,
I want unit tests for App.tsx covering all task mutations and error paths,
So that the frontend meets the 70% coverage threshold without relying solely on E2E tests.

## Acceptance Criteria

1. **Given** MSW (Mock Service Worker) is installed and configured in the Vitest environment
2. **When** the unit test suite runs (`cd frontend && npm run test:coverage`)
3. **Then** all task mutations (create, edit, complete, delete) are tested for both success and API error paths
4. **And** overall frontend coverage meets or exceeds 70% for lines, statements, functions, and branches

## Tasks / Subtasks

- [ ] Task 1: Install and configure MSW (AC: 1)
  - [ ] Run `npm install --save-dev msw` inside `frontend/`
  - [ ] Create `frontend/src/mocks/handlers.ts` with default handlers for all task API endpoints
  - [ ] Create `frontend/src/mocks/server.ts` exporting the MSW Node server
  - [ ] Update `frontend/src/test-setup.ts` to wire up MSW server lifecycle (beforeAll/afterEach/afterAll)

- [ ] Task 2: Export TaskApp for per-test QueryClient isolation (AC: 1)
  - [ ] Add `export` keyword to `function TaskApp()` in `frontend/src/App.tsx` — **no other changes**
  - [ ] This allows tests to render `<TaskApp />` wrapped in a fresh `QueryClient` (with `retry: false`) per test, preventing inter-test cache pollution

- [ ] Task 3: Write App.test.tsx covering all mutations and error paths (AC: 3, 4)
  - [ ] Create `frontend/src/App.test.tsx` (co-located with `App.tsx`)
  - [ ] Implement `renderTaskApp()` helper creating a fresh `QueryClient({ retry: false })` per test
  - [ ] Test: initial render — empty state shows "No tasks yet."
  - [ ] Test: initial render — task list populated from GET /tasks
  - [ ] Test: GET /tasks failure — inline error message "Failed to load tasks. Please refresh the page."
  - [ ] Test: create task success — optimistic task appears immediately, input cleared, focus restored to task input after mutation settles
  - [ ] Test: create task error — POST returns 500, toast shown with "Failed to add task", draft title restored in input
  - [ ] Test: edit task success — click Edit, change title, click Save, updated title shown in list
  - [ ] Test: cancel edit — click Edit then Cancel, editing form disappears, original title unchanged
  - [ ] Test: edit task error — PATCH returns 500, toast shown, edit form restored with original title
  - [ ] Test: complete task success — checkbox checked, task title gets line-through styling
  - [ ] Test: complete task error — PATCH returns 500, toast shown, checkbox reverted
  - [ ] Test: delete task success — task removed from list
  - [ ] Test: delete task error — DELETE returns 500, toast shown, task restored in list
  - [ ] Test: button disabled when input empty — Add Task button is disabled with no text

- [ ] Task 4: Verify 70% threshold is met (AC: 4)
  - [ ] Run `cd frontend && npm run test:coverage`
  - [ ] Confirm all thresholds (lines, statements, functions, branches) show ≥ 70% in console output
  - [ ] If below 70%, add targeted tests for uncovered branches before marking done

## Dev Notes

### ⚠️ CRITICAL: Current Coverage State

Coverage is failing **hard** — 2.27% total, way below the 70% threshold:

| File | Lines | Statements | Functions | Branches |
|------|-------|-----------|-----------|---------|
| `App.tsx` | 0% (0/129) | 0% (0/148) | 0% (0/65) | 0% (0/94) |
| `Toaster.tsx` | 100% (3/3) | 100% (4/4) | 100% (2/2) | 100% (2/2) |
| **TOTAL** | **2.27%** | **2.63%** | **2.98%** | **2.08%** |

To reach 70% aggregate, App.tsx must reach approximately 69%+ coverage (since Toaster is already 100%). The tests specified in Task 3 cover all 4 mutation paths (success + error) and initial render, which will easily push App.tsx past 75%.

Coverage config is already correct in `frontend/vitest.config.ts`:
```ts
thresholds: {
  lines: 70, statements: 70, functions: 70, branches: 70
}
```
The thresholds are **global** (not per-file), so Toaster.tsx's 100% contributes.

---

### ⚠️ CRITICAL: MSW v2 API — Do NOT Use v1 Syntax

MSW v2 has completely different APIs. Almost all tutorials and AI training data use the old v1 API (`rest.get`, `ctx.json`). **These will not work.**

**❌ v1 (WRONG — will throw import errors):**
```ts
import { rest } from 'msw'
rest.get('/tasks', (req, res, ctx) => res(ctx.json({ data: [] })))
```

**✅ v2 (CORRECT):**
```ts
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

http.get('http://localhost:3000/tasks', () => {
  return HttpResponse.json({ data: [] })
})
```

MSW v2 install: `npm install --save-dev msw` (installs latest v2.x).

---

### API Contract (Must Match Exactly in MSW Handlers)

The backend endpoints follow these exact contracts. MSW handlers MUST replicate them:

| Endpoint | Method | Request Body | Success Response | Status |
|----------|--------|-------------|-----------------|--------|
| `/tasks` | GET | — | `{ data: Task[] }` | 200 |
| `/tasks` | POST | `{ title: string }` | `{ data: Task }` | 201 |
| `/tasks/:id` | PATCH | `{ title?: string, completed?: boolean }` | `{ data: Task }` | 200 |
| `/tasks/:id` | DELETE | — | _(empty body)_ | 204 |

**⚠️ PATCH body vs. response field name mismatch:**
- Request body field: `completed` (lowercase, as App.tsx sends `JSON.stringify({ completed })`)
- Response object field: `isCompleted` (camelCase, as App.tsx reads `data.data.isCompleted`)

The MSW PATCH handler must map `completed` (from request) → `isCompleted` (in response).

**Task object shape:**
```ts
interface Task {
  id: number
  title: string
  isCompleted: boolean   // note: NOT "completed"
  createdAt: string      // ISO 8601
}
```

**Error envelope:**
```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Server error" } }
```

**`API_BASE` in App.tsx is `"http://localhost:3000"`** — all MSW handler URLs must use this exact prefix.

---

### File Structure

| File | Action | Notes |
|------|--------|-------|
| `frontend/package.json` | UPDATE | Add `msw` to `devDependencies` |
| `frontend/src/App.tsx` | UPDATE (minimal) | Add `export` keyword to `function TaskApp()` only |
| `frontend/src/test-setup.ts` | UPDATE | Append MSW server wiring below existing `@testing-library/jest-dom` import |
| `frontend/src/mocks/handlers.ts` | NEW | Default MSW handlers for all 5 endpoints |
| `frontend/src/mocks/server.ts` | NEW | `setupServer(...handlers)` export |
| `frontend/src/App.test.tsx` | NEW | All unit tests for `TaskApp` |

Architecture rule: **unit tests must be co-located** — `App.test.tsx` lives at `frontend/src/App.test.tsx`, NOT in a separate `__tests__` folder.

---

### MSW Setup Files (Reference Implementation)

**`frontend/src/mocks/handlers.ts`:**
```ts
import { http, HttpResponse } from 'msw'

const TASKS_URL = 'http://localhost:3000/tasks'

export const mockTask = {
  id: 1,
  title: 'Buy groceries',
  isCompleted: false,
  createdAt: '2026-04-29T10:00:00.000Z',
}

export const handlers = [
  http.get(TASKS_URL, () => {
    return HttpResponse.json({ data: [mockTask] })
  }),

  http.post(TASKS_URL, async ({ request }) => {
    const body = await request.json() as { title: string }
    return HttpResponse.json(
      { data: { id: 99, title: body.title, isCompleted: false, createdAt: new Date().toISOString() } },
      { status: 201 }
    )
  }),

  // Handles both edit (sends { title }) and complete (sends { completed }) mutations.
  // Maps request's `completed` field → response's `isCompleted` field.
  http.patch(`${TASKS_URL}/:id`, async ({ request }) => {
    const body = await request.json() as { title?: string; completed?: boolean }
    const { completed, title, ...rest } = body
    return HttpResponse.json({
      data: {
        ...mockTask,
        ...rest,
        ...(title !== undefined && { title }),
        ...(completed !== undefined && { isCompleted: completed }),
      },
    })
  }),

  http.delete(`${TASKS_URL}/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
```

**`frontend/src/mocks/server.ts`:**
```ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

**Updated `frontend/src/test-setup.ts`** (append to existing content):
```ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

`onUnhandledRequest: 'error'` makes tests fail if any unexpected API call is made — this catches bugs early.

---

### QueryClient Isolation in Tests — Critical Pattern

The `queryClient` in `App.tsx` is a **module-level singleton** with `staleTime: Infinity`. If you render `<App />` directly in tests, all tests share the same cache, causing false positives, missed re-renders, and order-dependent flakiness.

**The fix**: Export `TaskApp`, then each test creates its own `QueryClient`:

```tsx
// In App.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { TaskApp } from './App'   // requires `export` on TaskApp

function renderTaskApp() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },     // CRITICAL: fail immediately on error
      mutations: { retry: false },   // CRITICAL: don't retry mutations in tests
    },
  })
  return render(
    <QueryClientProvider client={qc}>
      <TaskApp />
    </QueryClientProvider>
  )
}
```

**Why `retry: false` is mandatory**: React Query's default retries network errors 3 times with exponential backoff. Without `retry: false`, error-path tests will time out (30+ seconds) waiting for retries to exhaust.

---

### App.tsx Mutation Behavior Map (READ BEFORE WRITING TESTS)

Understanding what each mutation does in each lifecycle callback is essential for writing correct assertions:

| Mutation | `onMutate` | `onSuccess` | `onError` | `onSettled` |
|----------|-----------|-------------|-----------|-------------|
| `createMutation` | Adds optimistic task (`isPending: true`, `id: -Date.now()`), clears `title` state | Replaces optimistic task with server data | Removes optimistic task, **restores draft `title` state**, shows toast | `invalidateQueries(['tasks'])` → re-fetches GET |
| `editMutation` | Updates title in cache optimistically, clears `editingId` + `editTitle` | Replaces task with server data | Reverts task title in cache, **restores `editingId` + `editTitle`** (re-opens edit form), shows toast | `invalidateQueries(['tasks'])` |
| `completeMutation` | Toggles `isCompleted` in cache optimistically | Replaces task with server data | Reverts `isCompleted` in cache, shows toast | `invalidateQueries(['tasks'])` |
| `deleteMutation` | Removes task from cache (saves task + index for restore) | — | Splices task back at saved index, shows toast | `invalidateQueries(['tasks'])` |

**`showToast` behavior**: Uses a ref-based counter for unique IDs (`nextToastIdRef`). Toasts auto-dismiss after 4 seconds via `setTimeout`. Tests only need to verify the toast **appears** — do NOT await 4 seconds for dismissal.

**`useEffect` for focus**: Runs when `createMutation.isSuccess` becomes true AND `createMutation.isPending` is false. After a successful create, the `#newTask` input is focused. Assert: `expect(document.activeElement).toBe(screen.getByTestId('task-input'))`.

**`cancelEdit`**: Sets `editingId` to null, `editTitle` to empty, calls `editMutation.reset()`. Verify the Save/Cancel buttons disappear and the original title remains.

---

### Test Writing Patterns

**Import block for App.test.tsx:**
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import { mockTask } from './mocks/handlers'
import { TaskApp } from './App'
```

**Success path test pattern** (`waitFor` after user actions):
```tsx
it('deletes a task', async () => {
  const user = userEvent.setup()
  renderTaskApp()
  // Wait for initial load
  await screen.findByText('Buy groceries')

  await user.click(screen.getByRole('button', { name: /delete "buy groceries"/i }))

  // Task removed from list
  await waitFor(() => {
    expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument()
  })
})
```

**Error path test pattern** (override handler with `server.use`):
```tsx
it('shows toast when delete fails', async () => {
  server.use(
    http.delete('http://localhost:3000/tasks/:id', () => {
      return HttpResponse.json(
        { error: { code: 'DB_ERROR', message: 'Failed to delete task' } },
        { status: 500 }
      )
    })
  )

  const user = userEvent.setup()
  renderTaskApp()
  await screen.findByText('Buy groceries')

  await user.click(screen.getByRole('button', { name: /delete "buy groceries"/i }))

  // Toast appears with error message
  await waitFor(() => {
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
  // Task restored
  expect(screen.getByText('Buy groceries')).toBeInTheDocument()
})
```

**Handlers reset automatically** after each test via `afterEach(() => server.resetHandlers())` in `test-setup.ts` — the `server.use` override in an error test does NOT bleed into other tests.

---

### ⚠️ Gotchas and Edge Cases

1. **DELETE mutationFn returns the `id` number (not `res.json()`)**: The `deleteMutation.mutationFn` calls `res.json()` only in the error path, then returns `id`. The `onSettled` doesn't receive the id but calls `invalidateQueries` unconditionally. MSW delete handler returns 204 with no body — this is correct and expected.

2. **PATCH body field `completed` ≠ response field `isCompleted`**: The completeMutation sends `{ completed: true/false }`, but App.tsx reads `data.data.isCompleted` in `onSuccess`. The MSW PATCH handler **must map** `completed` → `isCompleted` in the response. See handlers.ts reference above.

3. **`onSettled` triggers a GET re-fetch after every mutation**: After each mutation, `invalidateQueries(['tasks'])` fires, which makes MSW receive a GET /tasks request. The default GET handler returns `[mockTask]`. This means after a "create" mutation, the optimistic new task may disappear when the GET re-fetch re-populates the list with only `[mockTask]`. **Tests should `waitFor` the settled state**, not assert during the pending window (unless specifically testing optimistic behavior with `page.route` delays — leave that for E2E story 4.2).

4. **`completeMutation.onMutate` snapshots with `previousTask`**: When testing the complete-error path, the task's `isCompleted` should revert. After the PATCH fails, the cache is restored from the snapshot. Assert `isCompleted` via the checkbox state: `expect(checkbox).not.toBeChecked()`.

5. **`editMutation.onError` re-opens the edit form**: After an edit fails, `setEditingId(context.previousTask.id)` fires — the edit form for that task should reappear. Assert: `expect(screen.getByDisplayValue('Buy groceries')).toBeInTheDocument()`.

6. **`startEdit` is blocked while `editMutation.isPending`**: This guard is difficult to test synchronously without delayed handlers. It's acceptable to leave this branch uncovered — the 70% threshold does not require every single branch.

7. **`handleEditSubmit` guard `if (editMutation.isPending) return`**: Same as above — leave uncovered if it reduces test complexity significantly.

8. **`tasks.length === 0` branch**: Test the empty state by overriding the GET handler to return `{ data: [] }` in one test:
   ```ts
   server.use(http.get('http://localhost:3000/tasks', () => HttpResponse.json({ data: [] })))
   ```

9. **Focus assertion after create**: `useEffect` fires after the DOM commits. Use `waitFor` to check focus:
   ```ts
   await waitFor(() => {
     expect(document.activeElement).toBe(screen.getByTestId('task-input'))
   })
   ```

10. **Aria labels on Delete buttons**: App.tsx renders `aria-label={`Delete "${task.title}"`}`. Use `getByRole('button', { name: /delete/i })` or the exact label for precise targeting.

---

### Files NOT to Touch

- `frontend/src/components/ui/Toaster.tsx` — already at 100% coverage, do not modify
- `frontend/src/components/ui/Toaster.test.tsx` — already passing, do not modify
- `frontend/vitest.config.ts` — coverage thresholds are already correctly configured
- `frontend/src/main.tsx` — excluded from coverage, no tests needed
- All E2E files in `e2e/` — out of scope for this story (scope is unit tests only)

---

### Previous Story Learnings

From **Story 2.2 (Immediate Visual Feedback)** dev notes:
- `staleTime: Infinity` + `refetchOnWindowFocus: false` are set on the **app's** module-level `queryClient` to prevent background refetches. The **test** `QueryClient` should NOT use these — it needs `retry: false` but can use default stale times.
- `data-testid="task-input"` and `data-testid="task-list"` are stable DOM anchors — use them for selectors.
- The edit input auto-focuses via `autoFocus` attribute — no need to manually click into it.
- After creating a task, `setTitle("")` fires in `onMutate` (not `onSuccess`) — the input clears immediately, before the server responds.
- The Toaster renders as a sibling to the card, outside `data-testid="task-list"` — `getByRole('alert')` will find it anywhere in the DOM.

From **Story 1.2 deferred work**:
- "No frontend component tests for task list rendering" — this story directly addresses that gap.

---

### Project Structure Notes

Alignment with architecture:
- Test co-location rule (`App.test.tsx` at `frontend/src/App.test.tsx`) ✅
- Mocks at `frontend/src/mocks/` (conventional MSW location, not forbidden by architecture) ✅
- No changes to backend, Docker, or root scripts ✅
- `vitest.config.ts` coverage thresholds already set at 70% ✅

### References

- [Epic 4 - Frontend Test Coverage Completeness](_bmad-output/planning-artifacts/epics.md) — AC source
- [Architecture - Testing Standards](_bmad-output/planning-artifacts/architecture.md) — co-location rule, Vitest framework
- [Story 2.2 Dev Notes](_bmad-output/implementation-artifacts/2-2-immediate-visual-feedback.md) — mutation patterns, QueryClient config
- [Current coverage baseline](frontend/coverage/coverage-summary.json) — 0% on App.tsx
- [Vitest config with thresholds](frontend/vitest.config.ts) — already set correctly
- [App.tsx full source](frontend/src/App.tsx) — complete mutation code to test
- [Backend PATCH handler](backend/src/routes/tasks/index.ts) — confirms `completed` in body, `isCompleted` in response

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
