# Story: Project Initialization and Task Creation

**Story Key:** 1-1-project-initialization-and-task-creation
**Epic:** Epic 1: Core Task Lifecycle Management
**Story ID:** 1.1
**Status:** done

## User Story

As a user,
I want to create a new task by providing text input,
So that I can keep track of things I need to do.

## Acceptance Criteria

- [ ] **Given** the application is initialized with the starter template (Custom Decoupled Architecture: Vite + Fastify CLI, SQLite)
- [ ] **When** I enter text into the new task input field and submit
- [ ] **Then** a new task is created and persisted in the database
- [ ] **And** the UI updates to show the new task in the list

## Tasks/Subtasks

- [x] Task 1: Setup project monorepo structure
  - [x] Initialize `frontend` with Vite + React + TS
  - [x] Initialize `backend` with Fastify-CLI + TS
  - [x] Setup `docker-compose.yml` with health checks (`curl` based healthcheck for backend)
  - [x] Configure `package.json` at root if needed for monorepo scripts
- [x] Task 2: Setup Database
  - [x] Install `better-sqlite3` in backend
  - [x] Create SQLite database initialization script and schema for `tasks` table (`snake_case` tables/columns)
- [x] Task 3: Backend API (Create Task)
  - [x] Create `POST /tasks` endpoint using Fastify
  - [x] Add JSON Schema validation using Fastify Native JSON Schema (AJV) for the task creation payload (expect `camelCase` payload)
  - [x] Implement saving task to SQLite DB
  - [x] Return success response wrapped in `{ "data": {...} }`
  - [x] Add Fastify `inject` tests for the endpoint
- [x] Task 4: Frontend UI (Create Task)
  - [x] Install `@tanstack/react-query`, `tailwindcss`, and Radix UI Primitives in frontend
  - [x] Create accessible task input form using Radix UI
  - [x] Implement React Query mutation to call `POST /tasks`
  - [x] Optimistically or actively update the UI to show the new task
  - [x] Ensure keyboard navigation works for the input and submit button (Enter to submit)

## Dev Notes

**Architecture Requirements:**

- **Architecture Strategy:** Custom Decoupled Architecture (React SPA + Fastify API)
- **Database:** SQLite via `better-sqlite3` (~v12.9.0). Use raw SQL, no ORMs.
- **Table Naming:** `snake_case` (e.g., `tasks`, `created_at`)
- **API Naming:** RESTful, plural nouns, `kebab-case` paths (e.g., `/tasks`)
- **JSON Payloads:** `camelCase` for requests and responses. Dates should be ISO 8601 strings.
- **Frontend State:** React Query (v5+) for server state.
- **Frontend Styling:** Tailwind CSS (v4+).
- **Accessibility:** Radix UI Primitives must be used for interactive elements to ensure baseline WCAG AA standards and keyboard navigation.

**Previous Learnings:**

- This is the first story. Emphasize setting up the foundations solidly to avoid refactoring later.

## Dev Agent Record

### Implementation Plan

_(Agent will document approach here during implementation)_

### Code Review (AI)

_(Review results will be populated here)_

### Review Findings (AI)

- [x] [Review][Patch] Remove `verbose: console.log` from production DB — SQL with user data logged to stdout [backend/src/db/index.ts:16]
- [x] [Review][Patch] Add `maxLength` to title JSON schema — unbounded string accepted and stored [backend/src/routes/tasks/index.ts:13]
- [x] [Review][Patch] Display error state to user when `createMutation.isError` — currently silent failure [frontend/src/App.tsx]
- [x] [Review][Patch] Add `start_period: 30s` to healthcheck — premature failure on cold container boot [docker-compose.yml:9]
- [x] [Review][Patch] Null-check `db.get()` result after INSERT — can return `undefined`, sends `{ data: undefined }` [backend/src/routes/tasks/index.ts:26]
- [x] [Review][Patch] Remove redundant `rm -rf node_modules/better-sqlite3/build` in Dockerfile — `.dockerignore` already excludes `node_modules` [backend/Dockerfile:7]
- [x] [Review][Patch] Remove duplicate `initDb()` call in test — already called via `app.ts` in `build()` [backend/test/routes/tasks/index.test.ts:7]
- [x] [Review][Defer] Task list session-only (GET /tasks deferred to story 1.2 by design) [frontend/src/App.tsx:26] — deferred, pre-existing
- [x] [Review][Defer] Radix Label primitive not used — native `<label>` is semantically equivalent [frontend/src/App.tsx:61] — deferred, pre-existing
- [x] [Review][Defer] `t as any` cast in test — tap/fastify-cli type incompatibility, pre-existing [backend/test/routes/tasks/index.test.ts:6] — deferred, pre-existing

### Completion Notes

_(Final summary of implementation will be added here)_

## File List

- `docker-compose.yml` (NEW)
- `frontend/package.json` (NEW)
- `backend/package.json` (NEW)
- _(Agent will list all created/modified files here)_

## Change Log

_(Agent will document changes made during implementation here)_
