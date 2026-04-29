# Story 3.2: Automated Quality Reporting

Status: done

## Story

As an evaluator or developer,
I want to view static reports generated from the codebase detailing test coverage, security, and accessibility,
So that I can verify the quality and compliance of the complete application.

## Acceptance Criteria

1. **Given** I have the repository cloned, **When** I run a designated quality reporting command, **Then** static reports are generated and displayed in the console.
2. **And** the reports clearly detail test coverage metrics (with 70% minimum threshold validation), security vulnerabilities from `npm audit`, and accessibility audit results.
3. **And** the reports are stored in `_bmad-output/qa-reports/` directory (or similar accessible location) for easy access by evaluators.
4. A root-level script or npm command (`npm run quality-report` or similar) exists that runs all quality checks (coverage, security, accessibility) and displays results.

## Tasks / Subtasks

- [x] Task 1: Setup test coverage reporting for backend (AC: 1, 2)
  - [x] Backend already uses `c8` for coverage collection (`npm test` runs with coverage)
  - [x] Generate a JSON coverage report from `c8` output
  - [x] Parse coverage data and display summary: lines, statements, functions, branches coverage percentages
  - [x] Validate 70% coverage threshold and flag if below
  - [x] Create `backend-coverage.json` report in `_bmad-output/qa-reports/`

- [x] Task 2: Setup test coverage reporting for frontend (AC: 1, 2)
  - [x] Install and configure Vitest for frontend (if not already done)
  - [x] Add npm test script to `frontend/package.json` with coverage flag
  - [x] Configure coverage collection in Vitest (threshold: 70%)
  - [x] Generate JSON coverage report
  - [x] Create `frontend-coverage.json` report in `_bmad-output/qa-reports/`

- [x] Task 3: Setup E2E coverage reporting (AC: 1, 2)
  - [x] Determine if E2E coverage collection is applicable (typically Playwright doesn't collect code coverage directly, but can validate test count/pass rate)
  - [x] Create `e2e-test-report.json` documenting test count, pass rate, and critical flows covered
  - [x] Store in `_bmad-output/qa-reports/`

- [x] Task 4: Security audit integration (AC: 2)
  - [x] Run `npm audit` for both frontend and backend
  - [x] Parse output to extract vulnerability count by severity (Critical, High, Medium, Low)
  - [x] Flag if ANY Critical or High vulnerabilities exist (requirement: zero tolerance)
  - [x] Create `security-audit.json` report in `_bmad-output/qa-reports/`

- [x] Task 5: Accessibility audit integration (AC: 2)
  - [x] Install and configure axe-core or Lighthouse for accessibility checking
  - [x] Run accessibility audit against running application (requires Docker stack running)
  - [x] Parse results to identify failures, violations, and passes
  - [x] Flag if ANY violations exist on core UI elements (task input, task list)
  - [x] Create `accessibility-audit.json` report in `_bmad-output/qa-reports/`

- [x] Task 6: Create unified quality report generation script (AC: 1, 3, 4)
  - [x] Create `scripts/generate-quality-report.js` (or npm script) that orchestrates all checks
  - [x] Call coverage reports (backend + frontend + E2E)
  - [x] Call security audit
  - [x] Call accessibility audit
  - [x] Aggregate results into a single summary JSON: `_bmad-output/qa-reports/quality-report.json`
  - [x] Display human-readable summary in console with pass/fail indicators
  - [x] Add `npm run quality-report` to root `package.json`

- [x] Task 7: Integrate quality report into CI/documentation (AC: 4)
  - [x] Ensure quality reports are generated and stored in committed artifacts for evaluators
  - [x] Update README.md with a section on viewing quality reports
  - [x] Create `_bmad-output/qa-reports/README.md` explaining each report file

- [x] Task 8: E2E validation test (AC: 1, 2, 3, 4)
  - [x] Add a test or manual validation that confirms:
    - Running `npm run quality-report` produces all expected report files
    - Coverage meets 70% threshold (or clearly documents shortfall)
    - Security audit passes (zero Critical/High)
    - Accessibility audit passes (zero violations on core elements)
  - [x] Document any gaps or manual follow-up steps

### Review Findings

#### Decision Needed

- [x] [Review][Decision] **accessibility.skipped propagates to overallPassed=true** — Resolved: skipped now counts as FAIL; `allPassed` uses `accessibility.passed` only [scripts/generate-quality-report.js]
- [x] [Review][Decision] **Accessibility test silently passes moderate violations while JSON report marks passed=false** — Resolved: `summary.passed` now uses `criticalViolations.length === 0` matching the test assertion [e2e/tests/accessibility.spec.ts]
- [x] [Review][Decision] **E2E report reads stale XML rather than re-running tests** — Resolved: keep static; behavior is intentional and documented in README [scripts/generate-quality-report.js]

#### Patches

- [x] [Review][Patch] **E2E XML regex is attribute-order-dependent; parse failure silently yields passed=true** — Fixed: per-attribute extraction with explicit failure guard [scripts/generate-quality-report.js — `parseE2EReport`]
- [x] [Review][Patch] **Security audit parse failure silently reports passed=true** — Fixed: `_parseFailed` flag checked in `passed` expression [scripts/generate-quality-report.js — `runSecurityAudit`]
- [x] [Review][Patch] **Quality report script never exits non-zero on overall gate failure** — Fixed: `process.exit(1)` added after `printSummary` when `!report.overallPassed` [scripts/generate-quality-report.js — `main`]
- [x] [Review][Patch] **Frontend coverage `passed` field ignores test exit code** — Fixed: `passed: belowThreshold.length === 0 && result.ok` [scripts/generate-quality-report.js — `runFrontendCoverage`]
- [x] [Review][Patch] **`testsPass` field always true when old coverage summary file exists** — Fixed: `testsPass: result.status === 0` [scripts/generate-quality-report.js — `runFrontendCoverage`]
- [x] [Review][Patch] **JSON.parse on coverage-summary.json lacks try/catch** — Fixed: try/catch added in both `runBackendCoverage` and `runFrontendCoverage`; also added null-guard on `raw.total` in backend [scripts/generate-quality-report.js]
- [x] [Review][Patch] **Stale accessibility report could be from previous run if Playwright crashes before writing** — Fixed: report file purged before running test; JSON.parse wrapped in try/catch [scripts/generate-quality-report.js — `runAccessibilityAudit`]
- [x] [Review][Patch] **`spawnSync` calls have no timeout — script can hang indefinitely** — Fixed: `timeout: 300000` added to `run()` [scripts/generate-quality-report.js — `run`]
- [x] [Review][Patch] **Focused axe scan covers task-input only; task-list not scanned** — Fixed: second axe scan now includes both `task-input` and `task-list` [e2e/tests/accessibility.spec.ts]
- [x] [Review][Patch] **Per-file coverage entries accessed without null-check** — Fixed: optional chaining `data.lines?.pct ?? null` in both coverage functions [scripts/generate-quality-report.js]
- [x] [Review][Patch] **Unused `label` parameter in `run()` function** — Fixed: removed from function signature [scripts/generate-quality-report.js — `run`]

#### Deferred

- [x] [Review][Defer] **Backend c8 test script lacks `--check-coverage` threshold flags** — `npm test` in backend exits 0 at any coverage level; threshold only enforced post-hoc by report script. Pre-existing design choice. [backend/package.json] — deferred, pre-existing
- [x] [Review][Defer] **Path separator hardcoded as `/` in file-path stripping** — `file.replace(ROOT + "/", "")` breaks on Windows; project is macOS/Linux only [scripts/generate-quality-report.js] — deferred, pre-existing
- [x] [Review][Defer] **Hardcoded `curl` liveness check on fixed port** — Port and `curl` availability not configurable; works for current environment but not portable to all CI runners [scripts/generate-quality-report.js] — deferred, pre-existing
- [x] [Review][Defer] **No automated test confirming all report files produced** — Story Task 8 allows "manual validation"; current approach is acceptable per spec. [scripts/generate-quality-report.js] — deferred, pre-existing

## Dev Notes

### Current Infrastructure State

**Testing Stack Status:**

- Backend: Uses `c8` for coverage + Node.js `--test` runner with `tap` — coverage collection already active
- Frontend: No unit tests configured yet; needs Vitest setup
- E2E: Playwright configured at `e2e/playwright.config.ts` with 16 passing tests
- Coverage Threshold: Requirement is 70% minimum across all suites

**Quality Audit Status:**

- Security: `npm audit` available but not integrated into reporting
- Accessibility: No audit tools currently configured (Axe-Core or Lighthouse needed)

### Architecture Compliance

- **Test Framework Pattern:** Backend uses `c8` (already selected by Fastify CLI). Frontend should use Vitest (aligns with architecture decision).
- **Report Location:** `_bmad-output/qa-reports/` — keeps reports alongside planning/implementation artifacts for visibility
- **Zero Critical/High Vulnerabilities:** Requirement per NFR7 — `npm audit` is the enforcement mechanism
- **Accessibility Baseline:** Core elements (task input, task list) must pass axe-core validation (WCAG AA baseline per architecture)
- **70% Coverage Threshold:** Hard requirement per NFR1 — backend already configured, frontend needs setup

### Previous Story Intelligence

**Story 3.1 (Single Command Orchestration) Completed:**

- Docker Compose orchestration working; backend health check at `/health` route
- E2E smoke test confirms full stack startup
- All 16 E2E tests passing
- Backend tests: 64/64 passing with c8 coverage enabled

**Key Patterns from Story 3.1:**

- `docker compose up` successfully starts entire stack
- E2E tests use `import { test, expect } from "../support/fixtures"`
- Data-testid attributes used: `task-input`, `task-list`, etc.
- Frontend served on :5173, backend on :3000

**Potential Blockers from Previous Work:**

- Story 3.1 review flagged: "Incomplete Health Check Logic" — `/health` endpoint only checks Fastify, not DB. If DB isn't ready, health may signal false positive. Consider adding DB readiness check to `/health` endpoint.

### Git Analysis

**Recent Commits (Last 5):**

- 3-1: Added `/health` endpoint, updated docker-compose.yml, created smoke test
- 3-1: Fixed frontend dockerfile and created README.md for evaluator docs
- 2-2: E2E tests for optimistic updates — confirmed React Query patterns
- 2-2: Immediate visual feedback implemented in frontend components
- 2-1: Keyboard navigation tests — all core elements tab-navigable

**Patterns Established:**

- Test files co-located with source (e.g., `root.test.ts` next to `root.ts`)
- E2E tests follow fixture import pattern from `../support/fixtures`
- Both frontend and backend follow their standard test runners (c8 + Node, Playwright for E2E)

### Testing Standards & Requirements

**Backend Coverage (c8):**

- Already active: `npm test` script uses `c8 node --test`
- Current c8 invocation: `c8 node --test -r ts-node/register "test/**/*.ts"`
- Reports available in: `coverage/` directory (HTML + JSON)
- Must validate 70% threshold on: lines, statements, functions, branches

**Frontend Coverage (Vitest):**

- NOT YET CONFIGURED — needs Vitest setup
- Must configure: `vitest.config.ts` with coverage plugin (e.g., `@vitest/coverage-v8`)
- Must run: `npm run test:coverage` (frontend package.json)
- Must validate 70% threshold before report generated

**E2E Testing (Playwright):**

- 16 tests currently passing
- E2E runner: `npx playwright test --config=e2e/playwright.config.ts`
- Playwright doesn't collect code coverage; instead report test pass rate and coverage map to features (which FRs tested)

**Security Audit:**

- Backend dependencies: `npm audit` in `/backend`
- Frontend dependencies: `npm audit` in `/frontend`
- Root dependencies: `npm audit` in root
- ZERO tolerance for Critical or High severity vulnerabilities per NFR7

**Accessibility Audit:**

- Core elements to validate: `data-testid="task-input"`, `data-testid="task-list"`
- Tools: Axe-core (recommended) or Lighthouse
- Requirements: WCAG AA baseline per architecture
- Must run against live application (requires `docker compose up`)

### File Structure

| File                                               | Action  | Notes                                  |
| -------------------------------------------------- | ------- | -------------------------------------- |
| `frontend/package.json`                            | UPDATE  | Add `test:coverage` script with Vitest |
| `frontend/vitest.config.ts`                        | NEW     | Configure Vitest with coverage         |
| `scripts/generate-quality-report.sh`               | NEW     | Orchestrate all quality checks         |
| `package.json`                                     | UPDATE  | Add `npm run quality-report` script    |
| `_bmad-output/qa-reports/`                         | NEW DIR | Store all generated reports            |
| `_bmad-output/qa-reports/quality-report.json`      | NEW     | Aggregated summary report              |
| `_bmad-output/qa-reports/backend-coverage.json`    | NEW     | Backend coverage details               |
| `_bmad-output/qa-reports/frontend-coverage.json`   | NEW     | Frontend coverage details              |
| `_bmad-output/qa-reports/e2e-test-report.json`     | NEW     | E2E test results summary               |
| `_bmad-output/qa-reports/security-audit.json`      | NEW     | Security audit findings                |
| `_bmad-output/qa-reports/accessibility-audit.json` | NEW     | Accessibility audit findings           |
| `_bmad-output/qa-reports/README.md`                | NEW     | Documentation for reports              |
| `README.md`                                        | UPDATE  | Add section on quality reports         |

### Libraries & Tools Required

**Frontend Unit Testing:**

- `vitest` (already in ecosystem via dependencies)
- `@vitest/coverage-v8` (for coverage collection)
- `@vitest/ui` (optional, for test UI)
- `@testing-library/react` (for component testing)

**Accessibility Audit:**

- `axe-core` or `@axe-core/playwright` (for Playwright integration)
- Alternatively: `lighthouse` CLI for comprehensive audit

**Security Audit:**

- Built-in: `npm audit` (part of npm, no additional installation needed)

**Report Generation:**

- Bash scripting (for orchestration)
- Node.js JSON processing (via jq or Node script)

### Risk Mitigation

**Risk 1: Database Not Ready for Health Check**

- Story 3.1 review flagged: `/health` endpoint only checks Fastify, not database
- **Mitigation:** If DB readiness check is missing, this story should verify or add DB connection test to `/health` route before running E2E tests

**Risk 2: Frontend Coverage Collection with React Query**

- React Query network responses may cause flaky coverage reports
- **Mitigation:** Use Vitest with `isolate: true` and ensure test database is ephemeral (`:memory:`)

**Risk 3: Accessibility Audit Flakiness**

- Running against live Docker stack may timeout if container slow to start
- **Mitigation:** Ensure Docker `depends_on` health checks are working before running Axe audit; add retry logic with timeout

**Risk 4: Coverage Calculation Discrepancy**

- Backend c8 and Frontend Vitest may calculate coverage differently
- **Mitigation:** Document each tool's methodology in report; flag if totals don't align with 70% requirement

### References

- PRD: `_bmad-output/planning-artifacts/prd.md` → FR10, FR11, NFR1 (70% coverage), NFR7 (zero vulnerabilities)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` → Testing Standards, File Structure
- Backend test setup: `backend/package.json` — `c8` already active in `npm test` script
- Frontend test setup: `frontend/package.json` — currently no test runner
- E2E config: `e2e/playwright.config.ts` — 16 tests configured
- Test design docs: `_bmad-output/test-artifacts/test-design-qa.md` — Quality requirements and coverage plan
- Current coverage output: `backend/coverage/` — c8 generates HTML and JSON reports

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Backend container was running stale image without `/health` route → rebuilt both backend and frontend images
- `<ul>` contained `<p>` element (invalid HTML) causing axe-core `list` violation → changed to `<li>`
- Color contrast violation (`zinc-400`) → upgraded to `zinc-500`; missing `<main>` landmark → added
- Vitest `toHaveTextContent` failing → added `@testing-library/jest-dom` setup file
- Frontend coverage threshold gates configured; App.tsx coverage gap documented (requires MSW for React Query integration testing)
- `accessibility.passed` was undefined in aggregator due to top-level vs `summary.passed` mismatch → normalized in `runAccessibilityAudit()`

### Completion Notes List

- Task 1: Backend c8 coverage — added `--reporter=json-summary` flag; generates `backend/coverage/coverage-summary.json`; 87.07% lines, 74.35% branches (above 70% threshold)
- Task 2: Frontend Vitest setup — installed vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom, jsdom; created `vitest.config.ts` with 70% thresholds; 4 Toaster unit tests (100% component coverage); App.tsx gap documented
- Task 3: E2E report — parses `e2e/playwright-report/results.xml` JUnit output; 18/18 tests passing (100% pass rate)
- Task 4: Security audit — npm audit across root/backend/frontend; 0 critical, 0 high (24 moderate dev deps in backend, all acceptable)
- Task 5: Accessibility — `e2e/tests/accessibility.spec.ts` using @axe-core/playwright; fixed 3 violations: color contrast, missing `<main>` landmark, `<p>` inside `<ul>`; now 0 violations, 28 checks passing
- Task 6: `scripts/generate-quality-report.js` Node.js script with color-coded console output + JSON reports
- Task 7: `_bmad-output/qa-reports/README.md` + root `README.md` updated with quality reports section
- Task 8: Validated all report files exist, security passes (0 critical/high), accessibility passes (0 violations), coverage threshold documented with explicit gap note

### File List

- `backend/package.json` — added `--reporter=json-summary` to test script
- `frontend/package.json` — added `test` and `test:coverage` scripts
- `frontend/vitest.config.ts` — NEW: Vitest config with jsdom, jest-dom setup, v8 coverage, 70% thresholds
- `frontend/src/test-setup.ts` — NEW: imports @testing-library/jest-dom matchers
- `frontend/src/components/ui/Toaster.test.tsx` — NEW: 4 unit tests for Toaster component
- `frontend/src/App.tsx` — fixed 3 accessibility violations (color contrast, main landmark, ul>li)
- `scripts/generate-quality-report.js` — NEW: orchestration script for all quality checks
- `package.json` — added `quality-report` npm script
- `e2e/tests/accessibility.spec.ts` — NEW: axe-core WCAG AA accessibility spec
- `_bmad-output/qa-reports/README.md` — NEW: documentation for all report files
- `_bmad-output/qa-reports/quality-report.json` — NEW: aggregated quality summary (generated artifact)
- `_bmad-output/qa-reports/backend-coverage.json` — NEW: backend coverage report (generated artifact)
- `_bmad-output/qa-reports/frontend-coverage.json` — NEW: frontend coverage report (generated artifact)
- `_bmad-output/qa-reports/e2e-test-report.json` — NEW: E2E test summary (generated artifact)
- `_bmad-output/qa-reports/security-audit.json` — NEW: security audit report (generated artifact)
- `_bmad-output/qa-reports/accessibility-audit.json` — NEW: accessibility audit report (generated artifact)
- `README.md` — added Quality Reports section

## Change Log

- 2026-04-29: Story 3.2 implemented — automated quality reporting system. Backend c8 coverage reporting (87%/74% lines/branches), Vitest frontend testing infrastructure, axe-core accessibility audit (0 violations), security audit integration (0 critical/high), unified quality report script (`npm run quality-report`), fixed 3 accessibility violations in App.tsx (color-contrast, landmark-one-main, list structure), 18/18 E2E tests passing.
