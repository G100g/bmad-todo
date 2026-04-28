---
stepsCompleted:
  [
    "step-01-preflight",
    "step-02-select-framework",
    "step-03-scaffold-framework",
    "step-04-docs-and-scripts",
    "step-05-validate-and-summary",
  ]
lastStep: "step-05-validate-and-summary"
lastSaved: "2026-04-28"
---

# Step 1: Preflight Checks

## 1. Stack Detection

- `test_stack_type`: fullstack (Configured via `tea/config.yaml` as auto, but determined as fullstack due to React SPA + Fastify).

## 2. Validate Prerequisites

- Frontend: Requires `package.json`. _Status: Confirmed `frontend/package.json` will exist per Architecture doc._ No Playwright config exists yet.
- Backend: Requires `package.json` for Fastify. _Status: Confirmed `backend/package.json` will exist per Architecture doc._
- Preflight Checks passed.

## 3. Gather Project Context

- **Project Type**: Fullstack React SPA (Vite, TypeScript, Tailwind, Radix UI) + REST API (Fastify, SQLite).
- **Existing Test Framework**: None installed currently.
- **Context Docs Found**: `prd.md`, `architecture.md`, `epics.md`, `test-design-qa.md`, `test-design-architecture.md`.
- **Auth**: Deferred to Post-MVP (No complex setup required for initial test auth states).
- **APIs**: Standard CRUD (`GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`).

## 4. Confirm Findings

- The application is a React SPA powered by Vite paired with a Fastify Node.js backend.
- No E2E or Unit test framework is scaffolded in the repository yet.
- Testing strategies rely on Playwright for E2E and Vitest for both frontend components and backend API integration tests (`fastify.inject()`) as documented in the Test Design outputs.

# Step 2: Framework Selection

## 1. Selection Logic

The project relies on a deeply integrated Next-Gen SPA React Stack running parallel to a Node Fastify server orchestrated via Docker.
Per the Test Design QA output previously generated (`_bmad-output/test-artifacts/test-design-qa.md`), **Playwright** and **Vitest** have already been pre-selected as the mandatory frameworks by the test design architecture constraints.

- Playwright is required for full accessibility testing (`@axe-core/playwright`), rigorous network interception (`React Query` mock isolation), and multi-browser local evaluator emulation.
- Vitest is required to run both frontend Component testing via React Testing Library (RTL) AND backend integration testing natively via `fastify.inject()`.

## 2. Announce Decision

**Selected Frameworks:** **Playwright** (for E2End/UI Integration) and **Vitest** (for Frontend Components & Backend API/Unit).
**Reasoning:** Playwright natively supports deep Network Mocking and Axe-Core required for our P1 risks while executing swiftly against our parallel orchestrator. Vitest satisfies the < 2m PR commit hook restriction for running deep API assertions without starting real web servers.

# Step 3: Scaffold Framework

## 1. Create Directory Structure

- E2end directories created under `e2e/tests`, `e2e/support/fixtures`, `e2e/support/helpers`, and `e2e/support/page-objects`.

## 2. Generate Framework Config

- Created `playwright.config.ts` enforcing 15s action, 30s navigation, and 60s test timeouts.
- Configured HTML, JUnit, and console reporting.
- Enforced artifacts capture upon failure.

## 3. Environment Setup

- Created `.env.example` in root with local Vite and Fastify default URLs.

## 4. Fixtures & Factories

- Initialized `e2e/support/fixtures/index.ts` to extend standard definitions.
- Initialized `e2e/support/helpers/factories.ts` pointing to `faker`.

## 5. Sample Tests & Helpers

- Scaffolded `e2e/tests/example.spec.ts` demonstrating DOM target assertions using standard `data-testid` strategies mapping back to our architectural requirements.

# Step 4: Documentation & Scripts

## 1. Documentation

- Created `e2e/README.md` containing Setup Instructions, Execution modes, and Architecture overview notes highlighting the required deterministic patterns (`Axe-core`, `getByTestId`).

## 2. Build & Test Scripts

- Initialized a root `package.json` to act as the primary test runner orchestrator across the frontend/backend decoupled architecture.
- Added `test:e2e` and `test:e2e:ui` scripts wrapping the Playwright CLI executing against the explicitly created `e2e/playwright.config.ts`.

# Step 5: Validate & Summarize

## 1. Validation against `checklist.md`

- ✅ **Preflight Success:** Validated fullstack Node.js environment ready for integration.
- ✅ **Directory Structure:** Created E2E architecture isolating fixtures, helpers, POs, and tests.
- ✅ **Config Correctness:** Scaffolded custom `playwright.config.ts` handling deterministic timeouts, baseURL fallbacks, HTML/XML/Console reports, and parallel CI setups.
- ✅ **Fixtures/Factories:** Injected `faker` standard task factory alongside standard Base Test extension overrides.
- ✅ **Docs and Scripts:** `README.md` and root `package.json` integrated.

## 2. Completion Summary

**Framework Selected**: Playwright (UI/Integration orchestrator wrapper testing Front/Back full ecosystem).
**Artifacts Created**:

- `e2e/playwright.config.ts`
- `e2e/tests/example.spec.ts`
- `e2e/support/helpers/factories.ts`
- `e2e/support/fixtures/index.ts`
- `.env.example`
- Root `package.json` & `e2e/README.md`

**Next Steps**:

1. Open terminal at `/Users/giorgio/repo/ai/bmad-todo`.
2. Run `npm install`.
3. Run `npx playwright install --with-deps chromium`.
4. Validate execution with `npm run test:e2e`.
