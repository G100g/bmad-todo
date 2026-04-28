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
workflowType: "testarch-test-design"
inputDocuments: ["prd.md", "architecture.md"]
---

# Test Design for Architecture: bmad-todo

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review by Architecture/Dev teams. Serves as a contract between QA and Engineering on what must be addressed before test development begins.

**Date:** April 28, 2026
**Author:** TEA Master Test Architect
**Status:** Architecture Review Pending
**Project:** bmad-todo
**PRD Reference:** \_bmad-output/planning-artifacts/prd.md
**ADR Reference:** \_bmad-output/planning-artifacts/architecture.md

---

## Executive Summary

**Scope:** Testing the bmad-todo application, focusing on full-stack CRUD capabilities, seamless Docker orchestration, code quality thresholds (70% coverage), and basic accessibility without compromising the <3-minute runnable constraint.

**Business Context** (from PRD):

- **Revenue/Impact:** Technical Showcase / Evaluator credibility
- **Problem:** Existing portfolio projects lack tests, quality reports, and easy local orchestration.
- **GA Launch:** MVP Showcase

**Architecture** (from ADR):

- **Key Decision 1:** Custom Decoupled Architecture (Vite + Fastify CLI)
- **Key Decision 2:** Local SQLite database accessed via raw SQL (`better-sqlite3`)
- **Key Decision 3:** Strict `docker-compose` dependencies based on native healthchecks

**Expected Scale** (from ADR):

- Local ephemeral evaluation deployments (1 user concurrency)

**Risk Summary:**

- **Total risks**: 4
- **High-priority (≥6)**: 2 risks requiring immediate mitigation
- **Test effort**: ~9 core test scenarios (~24-48 hours for 1 QA/Dev)

---

## Quick Guide

### 🚨 BLOCKERS - Team Must Decide (Can't Proceed Without)

**Pre-Implementation Critical Path** - These MUST be completed before QA can write integration tests:

1. **B-01: SQLite Testing Concurrency** - Architecture must explicitly support providing an isolated, in-memory (`:memory:`) or uniquely named database file per test suite runner to prevent file lock crashes during parallel Vitest runs. (recommended owner: Dev Lead)
2. **B-02: Fastify Healthcheck Endpoint** - The backend application must expose a deterministic `/health` endpoint that signals true readiness (DB connected, APIs listening) to unblock Playwright tests and the Docker frontend container. (recommended owner: Dev Lead)

**What we need from team:** Complete these 2 items pre-implementation or test development is blocked.

---

### ⚠️ HIGH PRIORITY - Team Should Validate (We Provide Recommendation, You Approve)

1. **R-02: Playwright React Query Race Conditions** - We recommend relying exclusively on strict DOM assertions (e.g., `await expect(locator).toBeVisible()`) rather than waiting on network-idle, as React Query refetches might artificially prolong test suites. (implementation phase)
2. **R-04: Testing Environment Portability** - We recommend using the official `@playwright/test` container image for CI pipelines to guarantee tests behave identically to the evaluator's local run. (implementation phase)

**What we need from team:** Review recommendations and approve (or suggest changes).

---

### 📋 INFO ONLY - Solutions Provided (Review, No Decisions Needed)

1. **Test strategy**: E2E (UI+API via Playwright), API Integration (Fastify Inject), Component (Vitest + RTL). Ensures headless decoupling is respected.
2. **Tooling**: Playwright, Vitest, axe-core (embedded in Playwright), AJV (Fastify native).
3. **Tiered CI/CD**: PR (Component + API Integration) `< 2m`, Nightly/Deployment (Full Docker stack + Playwright) `< 5m`.
4. **Coverage**: ~9 test scenarios prioritized P0-P3 with risk-based classification ensuring 70%+ code coverage minimum.
5. **Quality gates**: 100% pass on P0s, 70% line coverage minimum, 0 Axe-core violations on forms, 0 Critical/High NPM Audit vulnerabilities.

**What we need from team:** Just review and acknowledge (we already have the solution).

---

## For Architects and Devs - Open Topics 👷

### Risk Assessment

**Total risks identified**: 4 (2 high-priority score ≥6, 1 medium, 1 low)

#### High-Priority Risks (Score ≥6) - IMMEDIATE ATTENTION

| Risk ID  | Category | Description                                          | Probability | Impact | Score | Mitigation                                                                                           | Owner    | Timeline   |
| -------- | -------- | ---------------------------------------------------- | ----------- | ------ | ----- | ---------------------------------------------------------------------------------------------------- | -------- | ---------- |
| **R-01** | **TECH** | SQLite DB Test Locking due to parallel runner access | 3           | 3      | **9** | Use `:memory:` database instances for backend integration test suites.                               | Dev      | Unit Setup |
| **R-02** | **OPS**  | Docker Compose Startup Race Condition                | 2           | 3      | **6** | Ensure Fastify container implements `curl` healthcheck and UI container blocks on `service_healthy`. | Platform | Env Setup  |

#### Medium-Priority Risks (Score 3-5)

| Risk ID  | Category   | Description                    | Probability | Impact | Score | Mitigation                                                                                        | Owner  |
| -------- | ---------- | ------------------------------ | ----------- | ------ | ----- | ------------------------------------------------------------------------------------------------- | ------ | ---------- |
| **R-03** | **BUS/QA** | Coverage < 70% threshold unmet | 2           | 2      | **4** | TDD approach; integrate coverage thresholds directly in Vitest config to break builds if lowered. | QA/Dev | Continuous |

#### Low-Priority Risks (Score 1-2)

| Risk ID  | Category  | Description                 | Probability | Impact | Score | Action                                                                                       |
| -------- | --------- | --------------------------- | ----------- | ------ | ----- | -------------------------------------------------------------------------------------------- | --- |
| **R-04** | **UI/QA** | Accessibility standard slip | 1           | 2      | **2** | Rely heavily on standard Radix primitives; leverage axe-core tests implicitly in Playwright. | QA  |

#### Risk Category Legend

- **TECH**: Technical/Architecture
- **OPS**: Operations
- **BUS**: Business Impact
- **UI**: Quality/User Interface

---

### Testability Concerns and Architectural Gaps

**🚨 ACTIONABLE CONCERNS - Architecture Team Must Address**

#### 1. Blockers to Fast Feedback (WHAT WE NEED FROM ARCHITECTURE)

| Concern                        | Impact                                   | What Architecture Must Provide                                                         | Owner    | Timeline           |
| ------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------- | -------- | ------------------ |
| **SQLite Test Concurrency**    | Test suite flakiness or outright crashes | Dependency injection or environment flags allowing `:memory:` DB for integration tests | Dev      | Pre-Implementation |
| **Orchestration Healthchecks** | E2E setup failure in CI                  | `/health` route on Fastify and `healthcheck` definition in `docker-compose.yml`        | Platform | Pre-Implementation |

---

### Testability Assessment Summary

**📊 CURRENT STATE - FYI**

#### What Works Well

- ✅ **Decoupled Architecture**: Fastify API and React SPA separation allows extremely fast API-only execution via Fastify's `inject()` without spinning up HTTP servers or browsers.
- ✅ **Standardized Error Handling**: JSON envelopes (`{ error: { code, message } }`) support deterministic API assertions.
- ✅ **Accessibility Foundation**: Radix UI Primitives drastically reduce the burden of testing manual keyboard traps and ARIA attributes.

#### Accepted Trade-offs (No Action Required)

For bmad-todo Phase 1, the following trade-offs are acceptable:

- **No Test Seeding API** - We accept setting up standard SQLite insert routines directly within the backend unit tests, as this is a strict MVP and full database factories are overkill. Keep test tables small.

---

### Risk Mitigation Plans (High-Priority Risks ≥6)

#### R-01: SQLite DB Test Locking (Score: 9) - CRITICAL

**Mitigation Strategy:**

1. Ensure the `backend/src/db/` connection utility accepts an injectable connection string, defaulting to `process.env.DB_PATH`.
2. Configure Vitest's `setupFiles` to supply `:memory:` for the in-memory database instance.
3. Configure Vitest to run database integration tests sequentially if isolated threads cannot secure independent `:memory:` allocations.

**Owner:** Dev Lead
**Timeline:** Pre-Implementation Setup
**Status:** Planned
**Verification:** Run `npm run test` twice simultaneously; no `SQLITE_BUSY` errors should be thrown.

#### R-02: Docker Compose Startup Race Condition (Score: 6) - HIGH

**Mitigation Strategy:**

1. Fastify must implement a GET `/health` endpoint returning `200 OK`.
2. The `backend` service in `docker-compose.yml` must implement a `healthcheck` polling `curl -f http://localhost:PORT/health`.
3. The `frontend` and any E2E container services must declare `depends_on: backend: condition: service_healthy`.

**Owner:** Dev Lead / Platform
**Timeline:** Environment Setup
**Status:** Planned
**Verification:** Running `docker-compose up` cleanly starts the frontend only after the backend signals health.
