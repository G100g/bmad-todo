# Story 2.2: Immediate Visual Feedback

## Story Foundation

As a user,
I want to receive immediate visual feedback when an action occurs,
So that I feel confident the application has registered my input.

**Acceptance Criteria:**

- **Given** I am interacting with the application
- **When** I create, update, or delete a task
- **Then** the application provides immediate optimistic UI updates
- **And** the system displays a brief confirmation notification/toast indicating success or failure

_(Note: UX Design spec overrides generic AC regarding success toasts: The design strictly requires **Silent Success** (no success toasts) and **Loud Failure** (show toasts only for errors/failures).)_

## Developer Context

### Technical Requirements

1. **Optimistic Updates:** Implement React Query's `onMutate`, `onError`, and `onSettled` callbacks for all task mutations (`createMutation`, `editMutation`, `completeMutation`, `deleteMutation`) to execute actions immediately on the UI without waiting for the network round-trip.
2. **Error Handling (Revert):** If an optimistic update fails (e.g. network error, server error), the UI state MUST immediately revert to its previous state (using the context saved in `onMutate`).
3. **Toasts/Notifications:** Integrate a Toast component (e.g., from `shadcn/ui` or a simple custom React/Tailwind component if none exists) to provide subtle, transient visual error messages if network requests fail.
4. **Silent Success:** When an optimistic update successfully resolves with the API, the UI does nothing (no success toasts).
5. **Loading States:** Do not use loading spinners for these micro-interactions directly on the primary UI, as changes are optimistic. Small contextual indicators (like a muted color during saving) are acceptable but spinners are generally avoided for check, delete, add.

### Architecture Compliance

- **State Boundary:** Ephemeral data updates should be handled within React Query's mutation logic.
- **Components:** Add a global `<Toaster />` component as close to the app root as possible, and provide a way (e.g. via hook or context) to trigger toasts across the application.
- **File Structure:** Components like `Toast` should live in `frontend/src/components/ui/` or similar. React Query mutations stay in `App.tsx` or a hooks folder.

### Git & Previous Learnings Intelligence

- From Story 2.1, keyboard navigability is paramount. Ensure that focus states (`focus-visible:ring`) remain fully functional even when UI updates optimistically.
- Direct DOM manipulation `document.getElementById('newTask')?.focus()` was removed in favor of `useRef` in Story 2.1's review! Make sure any new input handling doesn't regress this.
- E2E tests are tied to DOM attributes (`data-testid="task-input"`, `data-testid="task-list"`). Do not remove or alter these structure points while implementing optimistic rendering.

### Testing Requirements

- E2E tests should verify that the UI updates instantly before the network completes, and gracefully handles network errors (e.g. Playwright's `page.route` to simulate network errors, reverting the UI state, and displaying the toast).
- Continue to keep test coverage high via `keyboard-navigation.spec.ts` or a new `optimistic-updates.spec.ts`.

## Tasks / Subtasks

- [x] Task 1: Create Toaster UI component
  - [x] Create `frontend/src/components/ui/Toaster.tsx` with `Toast` type and `Toaster` component
  - [x] Toaster renders fixed-position accessible alerts at bottom-right
  - [x] Add toast state and `showToast()` helper inside `TaskApp`
- [x] Task 2: Implement optimistic updates for all mutations
  - [x] `createMutation`: add `onMutate` (snapshot + optimistic insert), `onError` (revert + toast), `onSettled` (invalidate), move `setTitle("")` to `onMutate`
  - [x] `editMutation`: add `onMutate` (snapshot + optimistic title update + close form), `onError` (revert + toast), `onSettled` (invalidate)
  - [x] `completeMutation`: add `onMutate` (snapshot + optimistic toggle), `onError` (revert + toast), `onSettled` (invalidate)
  - [x] `deleteMutation`: add `onMutate` (snapshot + optimistic remove), `onError` (revert + toast), `onSettled` (invalidate)
- [x] Task 3: Clean up inline mutation error blocks & wire Toaster
  - [x] Remove `{createMutation.isError && ...}`, `{editMutation.isError && ...}`, `{completeMutation.isError && ...}`, `{deleteMutation.isError && ...}` inline blocks (replaced by toasts)
  - [x] Keep `{isTasksError && ...}` inline block (initial load failure, not a mutation)
  - [x] Render `<Toaster toasts={toasts} />` in `TaskApp` return (sibling to the card)
- [x] Task 4: Write E2E tests for optimistic feedback
  - [x] Create `e2e/tests/optimistic-updates.spec.ts`
  - [x] Test: task appears in list immediately on create (before API resolves — delay POST by 3s, assert within 1500ms)
  - [x] Test: error toast shown and list reverted when create fails
  - [x] Test: task removed from list immediately on delete (before API resolves)
  - [x] Test: error toast shown and task restored when delete fails

### Review Findings

- [x] [Review][Patch] Optimistic row can be mutated before server ID exists, causing requests against negative IDs and unstable rollback behavior [frontend/src/App.tsx:65]
- [x] [Review][Patch] Full-list rollback strategy can clobber overlapping optimistic mutations from other actions [frontend/src/App.tsx:69]
- [x] [Review][Patch] Optimistic feedback is delayed by awaiting query cancellation before local state update [frontend/src/App.tsx:69]
- [x] [Review][Patch] Failed create clears user input and does not restore draft title on rollback [frontend/src/App.tsx:83]
- [x] [Review][Patch] Toast IDs use Date.now(), risking duplicate keys and dropped notifications under rapid failures [frontend/src/App.tsx:40]
- [x] [Review][Patch] E2E response waiters register GET after Enter, creating race-prone timing and potential flakiness [e2e/tests/keyboard-navigation.spec.ts:56]
- [x] [Review][Patch] Story requires optimistic coverage for edit and complete flows, but new E2E tests only cover create/delete [e2e/tests/optimistic-updates.spec.ts:12]

## Dev Agent Record

### Implementation Plan

Implement true optimistic UI updates using React Query's `onMutate` / `onError` / `onSettled` lifecycle for all four mutations. Replace inline `isError` error blocks (for mutations) with a custom `Toaster` component driven by local toast state. Keep the `isTasksError` inline block for initial-load failure. No new npm packages required.

### Debug Log

- Optimistic "instant create" and "instant delete" tests initially failed because the Vite dev server runs inside Docker without a `src/` volume mount — Docker's layer cache was serving stale images. Required `docker compose build --no-cache` to pick up source changes.
- Focus regression (keyboard nav tests) caused by React Query's background GET refetch (from `invalidateQueries` in `onSettled`) replacing the optimistic task's fake negative ID with the real server ID, causing React to unmount/remount the `<li>` and drop focus. Fixed by adding `staleTime: Infinity` + `refetchOnWindowFocus: false` to `QueryClient` defaults, so background refetches only happen explicitly via `invalidateQueries` in `onSettled`.
- `useEffect` for focus restoration needed to be placed after `createMutation` declaration to satisfy the `react-hooks/immutability` ESLint rule.
- E2E tests use `waitForResponse(POST)` + `waitForResponse(GET)` chaining (rather than `waitForLoadState('networkidle')`) to synchronise after create before interacting with a task, avoiding Vite HMR WebSocket keeping network permanently non-idle.

### Completion Notes List

- All 4 mutations (`createMutation`, `editMutation`, `completeMutation`, `deleteMutation`) now use the full React Query optimistic update pattern: `onMutate` snapshots cache + applies optimistic change, `onError` reverts and shows toast, `onSettled` invalidates.
- `QueryClient` configured with `staleTime: Infinity` and `refetchOnWindowFocus: false` — server data is synced exclusively through `invalidateQueries` in each `onSettled`, not via background polling.
- Focus after create moved from `setTimeout` in `onSuccess` to `useEffect` on `createMutation.isSuccess`, guaranteeing the input is enabled before `focus()` is called.
- `Toaster` component created in `frontend/src/components/ui/Toaster.tsx`. Toasts auto-dismiss after 4 seconds. Rendered as a sibling to the card (not inside it) using a React Fragment.
- Inline `isError` blocks removed for all 4 mutations; the initial-load `isTasksError` block retained.
- 4 new E2E tests in `e2e/tests/optimistic-updates.spec.ts`: instant create, create-error revert+toast, instant delete, delete-error revert+toast. All use `page.route` to simulate delays or failures.
- All keyboard navigation tests updated to wait for POST + GET responses before interacting with created tasks, ensuring stable real task IDs.
- Full suite: 11/11 E2E tests pass, zero TypeScript errors, zero lint errors.

### Change Log

- Implemented Story 2.2: Immediate Visual Feedback — optimistic UI updates + error toasts (Date: 2026-04-29)

### File List

- frontend/src/App.tsx
- frontend/src/components/ui/Toaster.tsx
- e2e/tests/optimistic-updates.spec.ts
- e2e/tests/keyboard-navigation.spec.ts

## Story Completion Status

**Status:** done
**Completion Note:** Story implementation and review patches complete. 15/15 E2E tests pass. Zero TS errors, zero lint errors.
