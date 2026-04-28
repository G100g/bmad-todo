---
title: "TEA Test Design → BMAD Handoff Document"
version: "1.0"
workflowType: "testarch-test-design-handoff"
inputDocuments: ["prd.md", "architecture.md"]
sourceWorkflow: "testarch-test-design"
generatedBy: "TEA Master Test Architect"
generatedAt: "2026-04-28"
projectName: "bmad-todo"
---

# TEA → BMAD Integration Handoff

## Purpose

This document bridges TEA's test design outputs with BMAD's epic/story decomposition workflow (`create-epics-and-stories`). It provides structured integration guidance so that quality requirements, risk assessments, and test strategies flow into implementation planning.

## TEA Artifacts Inventory

| Artifact                 | Path                                                      | BMAD Integration Point                               |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------------------- |
| Test Design Architecture | `_bmad-output/test-artifacts/test-design-architecture.md` | Epic quality requirements, story acceptance criteria |
| Test Design QA           | `_bmad-output/test-artifacts/test-design-qa.md`           | Embedded test strategies in story details            |
| Risk Assessment          | `_bmad-output/test-artifacts/test-design-architecture.md` | Epic risk classification, story priority             |
| Coverage Strategy        | `_bmad-output/test-artifacts/test-design-qa.md`           | Story test requirements                              |

## Epic-Level Integration Guidance

### Risk References

- **SQLite Testing Concurrency (P0)**: Epic 3 (Deployment & Visibility) and every Backend Epic (Epic 1) must be implemented with Dependency Injection (`:memory:` database) in mind for testability.
- **Docker Compose Race Conditions (P0)**: Epic 3 requires a strict `/health` API endpoint on Fastify using standard `depends_on: service_healthy` semantics. Delay frontend load until backend is up.

### Quality Gates

- **Minimum 70% Coverage Limit**: A script or automated mechanism must definitively enforce line-coverage reporting before release is considered capable of "Evaluation".
- **Zero Critical/High Vulns**: Implement automated test for `npm audit`.

## Story-Level Integration Guidance

### P0/P1 Test Scenarios → Story Acceptance Criteria

- **Story 1.1 - 1.5**: Must pass independent API integration tests (`fastify.inject()`) and comprehensive Playwright E2E coverage.
- **Story 2.1 (A11y)**: Must utilize Radix UI and be testable via automated axe-core Playwright scripts for "Critical/Serious" accessibility violations.
- **Story 3.1 & 3.2**: Must test cleanly within 3 minutes on a clean Docker Daemon (`docker-compose up`).

### Data-TestId Requirements

To avoid Playwright React Query race conditions (R-02), all state-dependent UI elements MUST use static deterministic wait targets:

- Use `data-testid="task-list"`
- Use `data-testid="task-input"`
- Use `data-testid="task-item-complete-toggle"`
- Use `data-testid="task-item-delete-btn"`

## Risk-to-Story Mapping

| Risk ID | Category | P×I | Recommended Story/Epic  | Test Level         |
| ------- | -------- | --- | ----------------------- | ------------------ |
| R-01    | TECH     | 9   | Epic 1 (Task CRUD APIs) | Unit / Integration |
| R-02    | OPS      | 6   | Epic 3 (Docker Compose) | Infrastructure     |
| R-03    | BUS/QA   | 4   | Epic 3 (Coverage Rpt)   | Infrastructure     |
| R-04    | UI/QA    | 2   | Epic 2 (A11y Checks)    | E2E (Axe-Core)     |

## Recommended BMAD → TEA Workflow Sequence

1. **TEA Test Design** (`TD`) → produces this handoff document (COMPLETED)
2. **BMAD Create Epics & Stories** → consumes this handoff, embeds quality requirements
3. **TEA ATDD** (`AT`) → generates acceptance tests per story
4. **BMAD Implementation** → developers implement with test-first guidance
5. **TEA Automate** (`TA`) → generates full test suite
6. **TEA Trace** (`TR`) → validates coverage completeness

## Phase Transition Quality Gates

| From Phase          | To Phase            | Gate Criteria                                          |
| ------------------- | ------------------- | ------------------------------------------------------ |
| Test Design         | Epic/Story Creation | All P0 risks have mitigation strategy                  |
| Epic/Story Creation | ATDD                | Stories have acceptance criteria from test design      |
| ATDD                | Implementation      | Failing acceptance tests exist for all P0/P1 scenarios |
| Implementation      | Test Automation     | All acceptance tests pass                              |
| Test Automation     | Release             | Trace matrix shows ≥70% coverage of P0/P1 requirements |
