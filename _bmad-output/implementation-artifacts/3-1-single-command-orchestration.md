# Story 3.1: Single Command Orchestration

Status: done

## Story

As an evaluator or developer,
I want to start the entire application suite (API and UI) utilizing a single orchestration command,
so that I can quickly run the application locally without manual setup.

## Acceptance Criteria

1. **Given** I have Docker installed and the repository cloned, **When** I run `docker compose up`, **Then** the entire stack (database, backend, frontend) starts up successfully.
2. **And** the frontend is exposed on port 5173 and fully functional, communicating with the backend on port 3000.
3. The backend container must be healthy (via `curl`-based healthcheck) before the frontend container starts.
4. A root-level `README.md` exists that clearly documents the single-command startup, prerequisites, and port information for evaluators.

## Tasks / Subtasks

- [x] Task 1: Create root README.md (AC: 1, 2, 4)
  - [x] Document prerequisites: Docker + Docker Compose (no other system deps required)
  - [x] Document the single startup command: `docker compose up`
  - [x] Document exposed ports: frontend :5173, backend :3000
  - [x] Document how to run backend unit/integration tests: `cd backend && npm test`
  - [x] Document how to run E2E tests: `npm run test:e2e` (from root, requires Docker stack running)
  - [x] Brief project structure overview (frontend/, backend/, e2e/)
- [x] Task 2: Verify & document docker-compose.yml health orchestration (AC: 1, 2, 3)
  - [x] Confirm healthcheck uses `curl -f http://localhost:3000/` against the backend `/` route
  - [x] Confirm `frontend` service has `depends_on: backend: condition: service_healthy`
  - [x] If the root `/` healthcheck is insufficient (e.g. DB not yet ready), add a dedicated GET `/health` route to `backend/src/routes/root.ts` and update `docker-compose.yml` healthcheck URL to `http://localhost:3000/health`
- [x] Task 3: E2E smoke test (AC: 1, 2)
  - [x] Add a `e2e/tests/smoke.spec.ts` that navigates to `/`, asserts the task input is visible, and verifies the page title — confirming the entire stack is up and communicating

## Dev Notes

### Current Infrastructure State

**The core docker-compose.yml orchestration already exists** (implemented in Story 1.1). Do not recreate or modify it unless a genuine gap is found in Task 2.

Current `docker-compose.yml` (at repo root):

```yaml
services:
  backend:
    build:
      context: ./backend
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      backend:
        condition: service_healthy
```

This satisfies NFR3 (fully containerized, `docker-compose up` only) and NFR4 (health check + `depends_on`).

### Architecture Compliance

- **No new npm dependencies** expected for this story.
- Monorepo root `package.json` already has `test:e2e` script wired to `npx playwright test --config=e2e/playwright.config.ts`.
- Backend Dockerfile installs `curl` via `apk add --no-cache curl` — required for the `healthcheck` command. Do NOT remove it.
- Backend current health target: `GET /` → returns `{ root: true }`. Architecture docs mention "a viable `/health` route" for clarity. Either approach is valid — use judgment: if the current `/` route is stable and sufficient, leave it. If a dedicated `/health` endpoint improves clarity (e.g. returns `{ status: "ok" }`), add it in `backend/src/routes/root.ts` and update `docker-compose.yml`.

### File Structure

| File                         | Action                      | Notes                                         |
| ---------------------------- | --------------------------- | --------------------------------------------- |
| `README.md` (root)           | **NEW**                     | Primary deliverable — evaluator documentation |
| `e2e/tests/smoke.spec.ts`    | **NEW**                     | Minimal smoke test verifying stack is live    |
| `docker-compose.yml`         | **VERIFY** (possibly no-op) | Only edit if healthcheck gap found            |
| `backend/src/routes/root.ts` | **OPTIONAL EDIT**           | Add `/health` endpoint if deemed cleaner      |

### Testing Standards

- E2E tests run from the **host machine** against the Docker stack (`BASE_URL=http://localhost:5173`).
- Playwright config is at `e2e/playwright.config.ts`. Test timeout: 60s, expect timeout: 15s.
- All existing E2E tests pass (`15 tests` as of Story 2.2 completion). Do not break them.
- The smoke test should be minimal: navigate to `/`, verify the task input is present. This confirms the frontend is served and communicates with the backend.
- Follow existing test file patterns: use `import { test, expect } from "../support/fixtures"`.

### Learnings from Previous Stories

- **Story 2.2 Docker insight:** Docker layer caching can serve stale frontend images. When testing locally, use `docker compose build --no-cache frontend` if front-end changes don't appear. Document this in the README tip section.
- **E2E test fixture pattern:** All E2E tests use `import { test, expect } from "../support/fixtures"` — not from `@playwright/test` directly.
- **data-testid attributes**: `task-input` (create input), `task-list` (UL element). Use these in the smoke test for reliable selectors.
- **Port**: Frontend is on 5173 (Vite dev server). The `playwright.config.ts` uses `baseURL: process.env.BASE_URL || "http://localhost:5173"`.

### References

- Architecture: `_bmad-output/planning-artifacts/architecture.md` — "Infrastructure & Deployment" and "NFR4 health strategy" sections
- NFR3 (containerization), NFR4 (health checks): `_bmad-output/planning-artifacts/epics.md` → Non-Functional Requirements
- FR9: Single command orchestration — `_bmad-output/planning-artifacts/epics.md`
- Current docker-compose: `docker-compose.yml` (root)
- Backend Dockerfile: `backend/Dockerfile`
- Frontend Dockerfile: `frontend/Dockerfile`
- Root package.json test scripts: `package.json`
- E2E config: `e2e/playwright.config.ts`
- E2E fixture: `e2e/support/fixtures/` (use `import { test, expect } from "../support/fixtures"`)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- Created root `README.md` with prerequisites, single-command startup, port table, test instructions, Docker cache tip, and project structure overview.
- Verified `docker-compose.yml` healthcheck and `depends_on` — both already correct. Added dedicated `GET /health` endpoint to `backend/src/routes/root.ts` returning `{ status: 'ok' }` for clearer health signaling; updated `docker-compose.yml` healthcheck URL to `/health`.
- Added unit test for `/health` route in `backend/test/routes/root.test.ts`; all backend tests pass.
- Created `e2e/tests/smoke.spec.ts` — navigates to `/`, asserts both `task-input` and `task-list` are visible, and verifies page title. All E2E tests pass.

### File List

- README.md
- docker-compose.yml
- backend/src/routes/root.ts
- backend/test/routes/root.test.ts
- e2e/tests/smoke.spec.ts

### Review Findings

- [x] [Review][Decision] Incomplete Health Check Logic — The `/health` endpoint only verifies that the Fastify server is listening, but does not check if the database connection is ready. The frontend container could spin up believing the backend is fully ready leading to UI errors. How should the SQLite readiness be verified?
- [x] [Review][Patch] Weak Smoke Test / Missing task-list Assertion [e2e/tests/smoke.spec.ts]
- [x] [Review][Patch] Fragile Page Title Assertion [e2e/tests/smoke.spec.ts]
- [x] [Review][Patch] Hardcoded Test Counts in Documentation [_bmad-output/implementation-artifacts/3-1-single-command-orchestration.md]
- [x] [Review][Patch] Misleading Pre-requisite Instructions [README.md]
- [x] [Review][Patch] Redundant Await [e2e/tests/smoke.spec.ts]
- [x] [Review][Defer] Dangerous Test Instructions [README.md] — deferred, pre-existing, E2E tests mount development database directly
