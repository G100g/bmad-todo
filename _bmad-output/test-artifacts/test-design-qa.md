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
nextStep: ""
lastSaved: "2026-04-28"
workflowType: "testarch-test-design-qa"
inputDocuments: ["prd.md", "architecture.md"]
---

# Test Design for QA: bmad-todo

**Purpose:** Test execution recipe for QA team. Defines what to test, how to test it, and what QA needs from other teams.

**Date:** April 28, 2026
**Author:** TEA Master Test Architect
**Status:** Draft
**Project:** bmad-todo

**Related:** See Architecture doc (`test-design-architecture.md`) for testability concerns and architectural blockers.

---

## Executive Summary

**Scope:** End-to-End, Integration, and Unit testing of the core feature set of `bmad-todo` (creating, editing, viewing, and completing tasks).

**Risk Summary:**

- Total Risks: 4 (2 high-priority score ≥6, 1 medium, 1 low)
- Critical Categories: TECH (SQLite locking), OPS (Docker Startups)

**Coverage Summary:**

- P0 tests: 3 core features + infra orchestration
- P1 tests: 4 secondary features + security + keyboard nav
- P2 tests: 1 edge case (visual assertions)
- P3 tests: 1 exploratory scenarios
- **Total**: ~9 test suites (~15-30 hours with 1 QA/Dev)

---

## Not in Scope

**Components or systems explicitly excluded from this test plan:**

| Item                                   | Reasoning                                                          | Mitigation                                                          |
| -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Auth/Identity (OAuth, JWT)**         | Explicitly defined as a Post-MVP feature.                          | Validated manually in phase 1, covered by strict feature scopes.    |
| **Complex Load Testing**               | Showcase targets 1 local user evaluators. RPS testing is overkill. | Ensure unit tests pass consistently; rely on FastAPI optimizations. |
| **Cloud Deployments (K8s, Terraform)** | Outside the scope of the local orchestrator constraints.           | Tested heavily on Docker Compose exclusively.                       |

---

## Dependencies & Test Blockers

**CRITICAL:** QA cannot proceed without these items from other teams.

### Backend/Architecture Dependencies (Pre-Implementation)

1. **R-01/B-01: In-Memory DB setup** - Dev Lead - Pre-Implementation Setup
   - Provide a connection mechanism allowing `:memory:` databases.
   - Tests will fail or become non-deterministic if writing to the physical `database.sqlite` file used for the actual app.

2. **R-02/B-02: Fastify Healthcheck API** - Dev Lead - Environment Setup
   - A `GET /health` endpoint mapped inside `docker-compose.yml`.
   - CI tests cannot wait accurately for the service to accept network requests without this.

### QA Infrastructure Setup (Pre-Implementation)

1. **Playwright Config and Axe-Core Setup**
   - Need standard Playwright matrix config with Axe injected for keyboard accessibility tests.

2. **Vitest and Fastify `inject()` helpers**
   - Need simple wrappers to spin up an ephemeral Fastify app instance per integration test.

**Example fastify-inject pattern:**

```typescript
import { test, expect } from "vitest";
import buildServer from "../src/server"; // assuming server builder
import db from "../src/db";

test("create task API @p0", async () => {
  const app = await buildServer({ dbPath: ":memory:" });
  await db.run("CREATE TABLE tasks ..."); // setup basic schema for memory

  const response = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Test Task" },
  });

  expect(response.statusCode).toBe(201);
  expect(response.json().data.title).toBe("Test Task");
});
```

---

## Entry Criteria

**QA testing cannot begin until ALL of the following are met:**

- [x] All requirements and assumptions agreed upon by QA, Dev, PM
- [ ] Test environments provisioned and accessible
- [ ] Pre-implementation blockers resolved (In-Memory DB setup)
- [ ] Codebase has standard linting (e.g., Biome or ESLint) configured locally.

## Exit Criteria

**Testing phase is complete when ALL of the following are met:**

- [ ] All P0 tests passing locally and in automated CI/Docker setups.
- [ ] All P1 tests passing (or failures triaged and accepted).
- [ ] No open high-priority / high-severity bugs.
- [ ] Test coverage measured at **≥ 70%** (via c8 or istanbul/v8 reports).
- [ ] Application starts in Docker `< 3 minutes`.
- [ ] Zero CRITICAL or HIGH npm audit vulnerabilities.

---

## Test Coverage Plan

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (≥6) + Affects evaluator experience directly

| Test ID    | Requirement              | Test Level       | Risk Link | Notes                                                                      |
| ---------- | ------------------------ | ---------------- | --------- | -------------------------------------------------------------------------- |
| **P0-001** | FR1 (Create Task)        | BE API (Fastify) | R-01      | Test payload validation (AJV), success insert.                             |
| **P0-002** | FR1-FR2 (Create + View)  | E2E (UI)         | R-02      | User inputs task, task is visible in UI using Playwright logic.            |
| **P0-003** | FR4 (Complete Task)      | BE API (Fastify) | R-01      | PUT `/tasks/:id` works identically for complete and incomplete assertions. |
| **P0-004** | FR9 (Single command run) | Infrastructure   | R-02      | Validate `docker-compose up` completes and responds 200 within 3 minutes.  |
| **P0-005** | NFR1 (70% Coverage)      | Tooling          | R-03      | Final coverage generation must output explicitly in terminal.              |

**Total P0:** 5 tests

---

### P1 (High)

**Criteria:** Important features + Accessibility Baselines + E2E workflows

| Test ID    | Requirement           | Test Level       | Risk Link | Notes                                                 |
| ---------- | --------------------- | ---------------- | --------- | ----------------------------------------------------- |
| **P1-001** | FR3/FR5 (Edit/Delete) | BE API (Fastify) | R-01      | DB updates or cascades as necessary.                  |
| **P1-002** | FR3/FR4/FR5           | E2E (UI)         | R-02      | Full edit and completion toggles on frontend.         |
| **P1-003** | FR7 (Keyboard/A11y)   | E2E (Axe)        | R-04      | Ensure no severe Axe violations on loaded form views. |
| **P1-004** | FR11 (Security Audit) | Infra            |           | Run `npm audit` implicitly in deployment script.      |

**Total P1:** 4 tests

---

### P2 (Medium)

**Criteria:** Secondary features + Edge cases + Regressions

| Test ID    | Requirement         | Test Level      | Risk Link | Notes                                                        |
| ---------- | ------------------- | --------------- | --------- | ------------------------------------------------------------ |
| **P2-001** | FR8 (Toast/Visuals) | Component (RTL) |           | Unit test assertions on toaster triggers and loading states. |
