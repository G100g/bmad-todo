---
workflowStatus: "completed"
totalSteps: 5
stepsCompleted:
  [
    "step-01-detect-mode",
    "step-02-load-context",
    "step-03-risk-and-testability",
    "step-04-coverage-plan",
    "step-05-generate-output",
  ]
lastStep: "step-05-generate-output"
nextStep: "completed"
lastSaved: "2026-04-28"
---

# Step 5: Generate Outputs & Validate

Mode Used: **System-Level Mode**
Execution Mode: **Sequential** (Auto)

## Output Files Generated:

- `{test_artifacts}/test-design-architecture.md` (Architecture/Dev contract)
- `{test_artifacts}/test-design-qa.md` (QA Execution Recipe)
- `{test_artifacts}/test-design/bmad-todo-handoff.md` (BMAD Handoff Guidance)

## Key Risks and Gate Thresholds:

- **R-01: SQLite DB Test Locking** (Score: 9) - Must use isolated or `:memory:` databases per integration runner.
- **R-02: Docker Compose Startup Race Conditions** (Score: 6) - Must use Native Fastify `curl` healthcheck and explicitly define `service_healthy`.
- **Primary Gate Threshold**: Minimum 70% coverage. 100% P0 pass rate. Zero Critical/High NPM Audit vulnerabilities.

## Open Assumptions:

- Testing the application implicitly assumes Vitest and Playwright are used as outlined in the PRD architecture details.
- End-to-End browser rendering defaults to Playwright's Chromium execution (sufficient for the intended "Evaluator" persona).

# Step 1: Detect Mode & Prerequisites

Mode Determined: **System-Level Mode**
Reasoning: No `sprint-status.yaml` found in implementation artifacts. Planning artifacts (`prd.md`, `architecture.md`) are present.
Prerequisites Confirmed: Found `prd.md` and `architecture.md`.

# Step 2: Load Context & Knowledge Base

Loaded Configuration:

- `tea_use_playwright_utils`: true
- `tea_use_pactjs_utils`: false
- `tea_pact_mcp`: none
- `tea_browser_automation`: auto
- `test_stack_type`: fullstack (React SPA frontend + Fastify backend)

Loaded Artifacts:

- `prd.md` (FRs, NFRs, Success Criteria)
- `architecture.md` (Custom Decoupled Architecture, SQLite, Docker orchestrations)
- `epics.md` (Epic 1-3, Stories 1.1-1.5, 2.1-2.2, 3.1-3.2)

Stack Detection:
Detected `fullstack` architecture based on React/Vite frontend and Fastify backend.

Knowledge Fragments loaded implicitly for context:

- `adr-quality-readiness-checklist.md`
- `test-levels-framework.md`
- `risk-governance.md`
- `test-quality.md`
- `playwright-cli.md`
- Full UI+API Playwright profile

# Step 3: Testability & Risk Assessment

## 1. Testability Review

**🚨 Testability Concerns**

- **[ACTIONABLE] SQLite Concurrent Testing Access**: Vitest runs tests in parallel by default, which can cause DB lock errors in file-based SQLite tests.
  _Mitigation_: Must use an in-memory (`:memory:`) DB instance per test runner context, or explicitly configure sequential testing for DB tests.
- **[ACTIONABLE] E2E Wait States**: E2E tests run against React Query could hit race conditions while fetching.
  _Mitigation_: Playwright tests need strict network assertions and data-testid waiting rather than arbitrary timeouts.

**✅ Testability Assessment Summary**

- **Controllability**: High. Architecture decoupled frontend and Fastify backend allows pure API `inject()` testing, React Query makes mocking UI states straightforward.
- **Observability**: High. JSON standard envelope returns `{ data }` or `{ error }` making assertions highly deterministic.
- **Reliability**: High. Docker Compose orchestrates environment. Fastify-native `healthcheck` explicitly handles startup condition race conditions.

**Architecturally Significant Requirements (ASRs)**

- **ASR 1**: Flawless portability (< 3 min clone to run) - **[ACTIONABLE]** - Need CI or local verify to ensure Playwright doesn't inject heavy OS dependencies outside of Docker.
- **ASR 2**: Minimum 70% coverage. - **[FYI]** - Testing focus spans Unit, Integration, and E2E.
- **ASR 3**: Decoupled Headless UI. - **[FYI]** - Enables precise boundary testing (API layer independently of UI).

## 2. Risk Assessment Matrix

| Risk                                  | Category | Probability (1-3) | Impact (1-3) | Score        | Mitigation                                                                                           | Owner    | Timeline          |
| ------------------------------------- | -------- | ----------------- | ------------ | ------------ | ---------------------------------------------------------------------------------------------------- | -------- | ----------------- |
| **SQLite DB Test Locking**            | TECH     | 3 (High)          | 3 (High)     | **9 (High)** | Use `:memory:` database instances for backend integration test runs.                                 | Dev      | Unit Setup        |
| **Docker Compose Startup Race Cond.** | OPS      | 2 (Med)           | 3 (High)     | **6 (High)** | Ensure Fastify container implements `curl` healthcheck and UI container blocks on `service_healthy`. | Platform | Environment Setup |
| **Coverage < 70% threshold unmet**    | BUS/QA   | 2 (Med)           | 2 (Med)      | **4 (Med)**  | TDD during implementation. Integrate coverage reporting explicitly in Vitest.                        | QA/Dev   | Continuous        |
| **Accessibility standard slip**       | UI/QA    | 1 (Low)           | 2 (Med)      | **2 (Low)**  | Rely heavily on standard Radix primitives; leverage axe-core tests implicitly in Playwright.         | QA       | E2E Phase         |

## 3. Summary of Findings

The testability of this architecture is exceptional due to the headless decoupled design and clear schema boundaries. The primary structural risks stem from **SQLite concurrent locking** during unit test automation, and orchestrating the Docker environment startup perfectly. Mitigating these with in-memory DB setups and proper `service_healthy` depends_on configuration immediately addresses our highest (Score 9, 6) risks.

# Step 4: Coverage Plan & Execution Strategy

## 1. Coverage Matrix

| Req                | Scenario                                            | Test Level   | Priority | Notes                                                     |
| ------------------ | --------------------------------------------------- | ------------ | -------- | --------------------------------------------------------- |
| **FR1 (Create)**   | Can create a new task and persist to DB             | Backend API  | P0       | Validate payload rejection and successful insert.         |
| **FR1/FR2**        | Full creation and view flow (UI + Form UI)          | E2E          | P0       | Playwright filling form and seeing new list item.         |
| **FR3 (Edit)**     | Inline edit saves to DB successfully                | UI Component | P1       | RTL to assert UI behavior and mock fetch patch.           |
| **FR4 (Complete)** | Toggle completion status                            | Backend API  | P0       | Fastify `inject()` PUT `/tasks/:id` with payload.         |
| **FR5 (Delete)**   | Remove task and cascade                             | Backend API  | P1       |                                                           |
| **FR6 (Delete)**   | Deleting item removes it from list view             | E2E          | P1       | Playwright clicking delete.                               |
| **FR7 (Keyboard)** | Core interactions are keyboard navigable            | E2E (Axe)    | P1       | Automated a11y run leveraging Axe plugin over Playwright. |
| **FR8 (Visuals)**  | Fastify container healthcheck responds correctly    | Infra Test   | P0       | Validate `service_healthy` signal in Docker daemon.       |
| **NFR1 (70% Cov)** | Codebase hits threshold of 70% coverage test suites | Tooling      | P0       | Generate report locally or via Github Actions.            |

## 2. Execution Strategy

- **PR/Commit Hooks**:
  - Exclusively run all Frontend (Vitest) Component tests, Backend (Vitest + SQLite In-Memory) DB/Integration tests, and Linting. Target completion: < 2 minutes.
  - Run Fast Playwright local checks.
- **Nightly / Deployment Gates**:
  - Full `docker-compose build` and `docker-compose up` dry-run cycle to validate ASR 1 (0 to running app in < 3 minutes).
  - Executing full Playwright cross-browser matrix test suite.
  - Generation of comprehensive Coverage Report from combined pipelines.

## 3. Resource Estimates

- **P0 Items (Core CRUD + Docker orchestration):** ~10–20 hours
- **P1 Items (Edit, Delete E2E, Keyboard Nav):** ~8–15 hours
- **P2 Items (Visual toast assertions, secondary flows):** ~4–8 hours
- **P3 Items (Exploratory edge cases):** ~2–5 hours
- **Total Estimated Effort:** ~24–48 hours

## 4. Quality Gates

- **P0 Pass Rate:** 100% required. (Application MUST run in Docker and MUST allow basic creation and checking of tasks).
- **P1 Pass Rate:** ≥ 95% required.
- **Coverage Target:** ≥ 70% aggregated line coverage across JS/TS source files.
- **Accessibility Gate:** Zero strict failures in Axe-core base rules for forms/buttons.
- **Security Check:** `npm audit` flags no CRITICAL or HIGH severity items in `package-lock.json`.
