# Story 4.2: E2E Task Management Full Suite

Status: done

## Story

As a developer or evaluator,
I want a comprehensive E2E test suite covering the full task lifecycle with API error scenarios,
so that all core user flows are validated end-to-end including failure handling.

## Acceptance Criteria

1. Given the application stack is running
2. When the E2E suite runs
3. Then it covers create, edit, and delete flows as explicit test cases
4. And API error interception tests exist for create, edit, and delete operations
5. And all tests pass

## Tasks / Subtasks

- [x] Task 1: Add explicit lifecycle E2E coverage for create/edit/delete (AC: 3, 5)
  - [x] Create a dedicated spec for this story: `e2e/tests/task-management-full-suite.spec.ts`
  - [x] Add explicit success tests for create, edit, and delete lifecycle flows
  - [x] Use stable selectors and scoped locators per row to avoid cross-row collisions
  - [x] Ensure all tests pass locally with `npm run test:e2e`

- [x] Task 2: Add API error interception tests for create/edit/delete (AC: 4, 5)
  - [x] Add POST failure interception test with toast + UI rollback assertions
  - [x] Add PATCH failure interception test (edit) with toa 6st + edit-form restoration assertions
  - [x] Add DELETE failure interception test with toast + task restoration assertions
  - [x] Ensure error assertions verify visible user behavior, not internal implementation details

- [x] Task 3: Remove flakiness hazards and align with Playwright best practices (AC: 5)
  - [x] Register response waiters before triggering actions that fire requests
  - [x] Use web-first assertions (`toBeVisible`, `toContainText`, `toHaveValue`, `toBeChecked`)
  - [x] Avoid hard waits and avoid `page.waitForTimeout()` entirely
  - [x] Avoid broad route handlers leaking across tests; unroute after each route-heavy test if needed

- [x] Task 4: Keep architecture and repo conventions intact (AC: 5)
  - [x] Keep tests in root `e2e/tests/` only (no relocation)
  - [x] Reuse existing fixture entry point `e2e/support/fixtures/index.ts`
  - [x] Keep `playwright.config.ts` reporter and tracing behavior unchanged unless required by failing stability

## Developer Context and Guardrails

### Technical Requirements

- Use Playwright test runner and existing config in `e2e/playwright.config.ts`.
- Validate explicit create/edit/delete success paths and explicit create/edit/delete error paths.
- Continue using `data-testid="task-input"` and `data-testid="task-list"` as primary anchors.
- Keep tests deterministic in a shared local DB environment:
  - Generate unique task titles with timestamp suffixes.
  - Scope row actions with `taskList.locator("li").filter({ hasText: title })` before pressing row-level buttons.
- Preserve existing API contract expectations from frontend behavior:
  - Create failures show `Failed to add task. Please try again.`
  - Edit failures show `Failed to update task. Please try again.`
  - Delete failures may surface backend message or fallback `Failed to delete task. Please try again.`

### Architecture Compliance

- Keep monorepo boundaries intact:
  - E2E in `e2e/tests/`
  - Frontend app behavior in `frontend/src/App.tsx`
- Do not change backend API contracts for this story.
- Do not move existing test files; add focused suite and keep existing smoke/keyboard/optimistic/accessibility tests green.
- Respect Fastify + React decoupling and test via HTTP-driven UI interactions only.

### Library and Framework Requirements

- Playwright in repo: `@playwright/test` `^1.43.0`.
- Current docs emphasize:
  - Prefer locator-driven interactions and web-first assertions.
  - Avoid deprecated selector APIs and manual assertions.
  - `page.route()` notes:
    - matching requests stall until `continue`/`fulfill`/`abort`.
    - most recently registered route takes precedence.
    - routing disables HTTP cache.
- Keep route interception surgical:
  - Intercept only intended methods (`POST`, `PATCH`, `DELETE`).
  - Continue other methods with `route.continue()`.

### File Structure Requirements

Expected file actions for this story:

- `e2e/tests/task-management-full-suite.spec.ts` (NEW)
  - Main story 4.2 explicit suite (success + API error interception for create/edit/delete).
- `e2e/tests/optimistic-updates.spec.ts` (UPDATE, optional)
  - Only if refactoring shared helpers reduces duplication without obscuring scenario intent.
- `e2e/support/helpers/factories.ts` (UPDATE, optional)
  - Only if introducing typed factory helpers for unique titles improves readability.
- `e2e/support/fixtures/index.ts` (UPDATE, optional)
  - Only if adding reusable fixture utilities that preserve existing test API.

Files that should remain untouched unless strictly required:

- `e2e/playwright.config.ts`
- `frontend/src/App.tsx`
- `backend/src/**`

### Testing Requirements

- Run: `npm run test:e2e`
- Validate all existing specs plus the new 4.2 suite pass.
- Ensure no hidden inter-test coupling:
  - Each test must create its own data.
  - No test should rely on prior test artifacts.
- Assertion strategy:
  - Prefer `await expect(locator)...` over manual state polling.
  - Use `waitForResponse` only where request lifecycle synchronization is needed.

## Dev Agent Record

### Implementation Notes

Created `e2e/tests/task-management-full-suite.spec.ts` with 6 tests covering the full task lifecycle:

**Success tests (Task 1):**

- `create`: fills input, presses Enter, awaits POST + GET, asserts task in list.
- `edit`: creates task, clicks Edit button, fills new title (using `taskList`-scoped input locator to handle DOM replacement), awaits PATCH, asserts updated title.
- `delete`: creates task, clicks Delete, awaits DELETE response, asserts task removed.

**Error interception tests (Task 2):**

- `create error`: routes `**/tasks` POST → 500, asserts error toast + task not in list; calls `unrouteAll()` after.
- `edit error`: routes `**/tasks/*` PATCH → 500, asserts error toast + edit form restored to original title; calls `unrouteAll()` after.
- `delete error`: routes `**/tasks/**` DELETE → 500, asserts error toast + task restored in list; calls `unrouteAll()` after.

**Key learnings applied:**

- After clicking Edit, the `<li>` row replaces its text node with an `<input>`, so `taskItem.locator('input[type="text"]')` (filtered by `hasText: title`) fails because the filter no longer matches. Used `taskList.locator('li input[type="text"]')` per the established pattern in `optimistic-updates.spec.ts`.
- Removed spurious `not.toContainText(title)` assertion in the edit success test because `editedTitle` is a superset of `title` (`${title}-updated`).
- All `waitForResponse` calls are registered before triggering their respective actions.
- No `page.waitForTimeout()` calls anywhere.

### Completion Notes

✅ All 6 new tests pass. Full suite: 24 passed (7.0s), 0 failures. No regressions.

## File List

- `e2e/tests/task-management-full-suite.spec.ts` (NEW)

## Change Log

- 2026-04-29: Story 4.2 implemented — created `e2e/tests/task-management-full-suite.spec.ts` with 6 E2E tests covering explicit create/edit/delete success lifecycles and API error interception scenarios. All 24 E2E tests pass.

### `e2e/tests/keyboard-navigation.spec.ts`

Current state:

- Covers keyboard-only create, focus restore, complete, edit, delete, and focus ring.
- Uses unique titles and request waiters for POST/GET synchronization.

What this story changes:

- No direct behavior change required.
- Reuse style patterns from this file for unique naming and row-scoped locators.

What must be preserved:

- Keyboard flow coverage and stability assumptions.
- Existing focus assertions and unique aria-label targeting.

### `e2e/tests/optimistic-updates.spec.ts`

Current state:

- Already contains optimistic and failure tests across create/edit/delete/toggle completion.
- Uses route interception with method checks and delayed responses.

What this story changes:

- Add a dedicated explicit lifecycle suite for story traceability (4.2).
- Optional refactor only if it reduces duplication and keeps tests readable.

What must be preserved:

- Existing optimistic timing checks.
- Existing error rollback validations.

### `e2e/support/fixtures/index.ts`

Current state:

- Thin wrapper around Playwright base test.

What this story changes:

- Optional only: introduce helper fixtures if they improve consistency.

What must be preserved:

- Existing `test` and `expect` export shape used by all current specs.

### `e2e/support/helpers/factories.ts`

Current state:

- Minimal `createTask` helper.

What this story changes:

- Optional only: add helper for unique title generation to standardize naming.

What must be preserved:

- Backward compatibility with existing usage (`createTask({ title })`).

## Previous Story Intelligence (4.1)

Actionable learnings to apply:

- Maintain strict API contract awareness from frontend behavior.
- Distinguish request and response payload expectations when asserting UI effects.
- Prefer assertions that survive React Query refetches by waiting for settled UI state.
- Keep tests close to user-observable behavior (toasts, list content, input/focus) over internal cache assumptions.

Relevant deferred risks from prior work:

- Shared DB side effects are possible in E2E; use unique per-test titles.
- Some App mutation pending states disable multiple controls globally; tests must avoid assuming per-row enabled behavior during in-flight mutations.

## Git Intelligence Summary

Recent commit pattern (latest first):

1. `feat: Story 4.1: App.tsx Unit Tests with MSW`
2. `chore: udpate epic and stories`
3. `feat: Story 3.2: Automated Quality Reporting`
4. `feat: Story 3.1: Single Command Orchestration`
5. `feat: Story 2.2: Immediate Visual Feedback`

Insights:

- E2E and QA assets were established in stories 3.1 and 3.2.
- Mutation-focused behavior and error toasts were introduced/refined in story 2.2 and validated heavily in story 4.1 tests.
- New story should extend, not replace, this trajectory: clear flow coverage + explicit failure handling.

## Latest Technical Information (Web Research)

From current Playwright docs and best practices:

- Use locator-centric actions and web-first assertions for resilience.
- Avoid manual immediate assertions like `expect(await locator.isVisible()).toBe(true)`.
- For request mocking/interception with `page.route()`:
  - Route handlers must always resolve with `continue`, `fulfill`, or `abort`.
  - Latest registered route has precedence.
  - Keep route scope minimal to avoid unintended capture.
- `networkidle` is generally discouraged as primary readiness signal; prefer assertions tied to visible UI state.

Applied guidance for this story:

- Keep readiness checks anchored to `task-input` and `task-list` visibility.
- Use targeted `waitForResponse` predicates where mutation timing matters.
- Avoid introducing sleeps/timeouts as synchronization primitives.

## Project Context Reference

- Persistent project-context facts file was not found during activation (`**/project-context.md`).
- Story context is grounded in:
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/implementation-artifacts/4-1-app-unit-tests-msw.md`

### Review Findings

- [x] [Review][Defer] Edit input locator uses taskList-scope workaround — App only allows one item in edit mode at a time, making `taskList.locator('li input[type="text"]')` unambiguous in practice. Accepted workaround; `data-testid="task-edit-input"` deferred to a future hardening story. [e2e/tests/task-management-full-suite.spec.ts:73, 82, 192, 199] — deferred, accepted workaround (single edit-mode invariant holds)
- [x] [Review][Patch] GET waitForResponse filter too broad — `r.url().includes("/tasks")` also matches `/tasks/{id}` and other sub-paths, so the waiter can resolve on the wrong response [e2e/tests/task-management-full-suite.spec.ts:39,63,101,169,226]
- [x] [Review][Patch] Route intercept not guarded with try/finally — if any assertion throws before `page.unrouteAll()`, the 500-returning handler bleeds into the next test [e2e/tests/task-management-full-suite.spec.ts:155,213,263]
- [x] [Review][Patch] Success-path waitForResponse waiters don't verify HTTP status — a 4xx/5xx response silently satisfies the waiter and the test proceeds as if the operation succeeded [e2e/tests/task-management-full-suite.spec.ts:36,66,108,129]
- [x] [Review][Patch] Delete button uses page scope instead of row scope — `page.getByRole("button", { name: \`Delete "${title}"\` })` violates spec's "scope row actions with taskList row locator" constraint and couples tests to exact aria-label format [e2e/tests/task-management-full-suite.spec.ts:117,247]
- [x] [Review][Patch] Route glob inconsistency — delete error test uses `**/tasks/**` (matches nested paths like `/tasks/123/tags`) while edit error correctly uses `**/tasks/*` [e2e/tests/task-management-full-suite.spec.ts:233]
- [x] [Review][Patch] Date.now() titles not unique under parallel workers — `fullyParallel: true` with default workers means two tests can produce identical titles and collide in the shared DB [e2e/tests/task-management-full-suite.spec.ts:32,55,98,138,162,221]
- [x] [Review][Defer] `waitUntil: "networkidle"` documented Playwright antipattern — background polling or any open connection can stall the signal indefinitely; the subsequent `task-input.waitFor` already provides a reliable readiness anchor [e2e/tests/task-management-full-suite.spec.ts:20] — deferred, pre-existing

## References

- `_bmad-output/planning-artifacts/epics.md` (Epic 4 / Story 4.2 acceptance criteria)
- `_bmad-output/planning-artifacts/architecture.md` (testing standards, structure conventions)
- `_bmad-output/planning-artifacts/prd.md` (NFR1 and quality goals)
- `_bmad-output/planning-artifacts/ux-design-specification.md` (feedback and accessibility principles)
- `e2e/playwright.config.ts` (timeouts, reporter, trace/video/screenshot policy)
- `e2e/tests/keyboard-navigation.spec.ts` (keyboard test patterns)
- `e2e/tests/optimistic-updates.spec.ts` (network interception and rollback patterns)
- `e2e/support/fixtures/index.ts` (fixture contract)
- `e2e/support/helpers/factories.ts` (test data helper)
- `frontend/src/App.tsx` (observable mutation and toast behavior)
- `e2e/playwright-report/results.xml` (baseline pass state)

## Story Completion Status

- Story context file created and validated for developer readiness.
- Status set to `ready-for-dev`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Completion Notes List

- Parsed explicit story key `4-2-e2e-task-management-full-suite` from user input.
- Completed exhaustive artifact review across planning docs, previous story, current E2E suite, and git history.
- Added architecture and test guardrails targeted to prevent flakiness and regressions.
- Included latest Playwright guidance relevant to interception and assertion strategy.

### File List

- `_bmad-output/implementation-artifacts/4-2-e2e-task-management-full-suite.md`
