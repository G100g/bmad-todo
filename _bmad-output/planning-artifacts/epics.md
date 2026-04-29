---
stepsCompleted: ["1", "2", "3"]
inputDocuments:
  [
    "_bmad-output/planning-artifacts/prd.md",
    "_bmad-output/planning-artifacts/architecture.md",
  ]
---

# bmad-todo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad-todo, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The user can create a new task by providing text input.
FR2: The user can view a list of all existing tasks.
FR3: The user can edit the text of an existing task.
FR4: The user can mark an existing task as completed.
FR5: The user can mark a completed task as incomplete (uncheck).
FR6: The user can permanently delete an existing task.
FR7: The user can interact with all primary application controls (creating, editing, deleting, completing tasks) using only a keyboard.
FR8: The user receives immediate visual feedback when a task is successfully created, updated, or deleted.
FR9: The evaluator can start the entire application suite (API and UI) utilizing a single orchestration command.
FR10: The evaluator can view static reports generated from the codebase detailing test coverage.
FR11: The evaluator can view static security and accessibility audit reports.

### NonFunctional Requirements

NFR1: The application codebase must maintain a minimum of 70% test coverage across Unit, Integration, and E2E suites.
NFR2: The project must compile and pass all linting protocols with zero warnings or errors.
NFR3: The system must be fully containerized. A developer must be able to start the entire stack locally using `docker-compose up` without installing system-level dependencies (other than Docker).
NFR4: The startup orchestration must utilize health checks to ensure the backend is fully initialized before the frontend container signals readiness.
NFR5: Core interactive elements (buttons, inputs) must be fully navigable via keyboard.
NFR6: Contrast ratios for text and primary UI components must meet baseline WCAG AA standards as provided by the chosen UI kit.
NFR7: The system must pass automated static analysis security testing (e.g., `npm audit` or equivalent) with zero "Critical" or "High" vulnerabilities.

### Additional Requirements

- **Starter Template:** Custom Decoupled Architecture (Vite + Fastify CLI)
- Infrastructure & Orchestration: Docker Compose with strict dependency health checks (`depends_on: { backend: { condition: service_healthy } }`)
- Backend container requires native `curl`-based `healthcheck`
- Database: SQLite implementation via `better-sqlite3` (~v12.9.0) with raw SQL (no ORM)
- Database testing: Must support simultaneous test executions using in-memory (`:memory:`) or ephemeral instances for test runners
- Technology Stack Versions: Frontend: Vite (v9+), React Query (v5+), Tailwind CSS (v4+), Radix UI Primitives. Backend: Fastify CLI (v8+), TypeScript, Node.js. Testing: Vitest (unit), Playwright (E2E), Fastify `inject` utility (API integration)
- API validation: Fastify Native JSON Schema with AJV
- Project Structure: Monorepo with discrete `frontend/` and `backend/` folders, each with own `package.json` and `Dockerfile`. Root `docker-compose.yml` orchestration
- Test locations: Unit/Integration tests must be co-located with source files. E2E tests in dedicated root-level `/e2e` folder
- API & Data Formatting: RESTful: plural nouns, kebab-case paths (`/tasks`, `/tasks/:id`). Success responses: `{ "data": {...} }` envelope. Error responses: `{ "error": { "code": "...", "message": "..." } }`. JSON payloads: `camelCase`. Dates: ISO 8601 strings only.
- Naming Conventions: Database: `snake_case` for tables/columns, `idx_table_column` for indices. API endpoints: kebab-case. React components: `PascalCase` (files), hooks/functions: `camelCase`.
- Security & Middleware: `fastify-helmet` for security headers. `@fastify/cors` for explicit CORS origins.

### UX Design Requirements

None

### FR Coverage Map

FR1: Epic 1 - Create task
FR2: Epic 1 - View tasks
FR3: Epic 1 - Edit task
FR4: Epic 1 - Complete task
FR5: Epic 1 - Uncomplete task
FR6: Epic 1 - Delete task
FR7: Epic 2 - Keyboard navigation
FR8: Epic 2 - Visual feedback
FR9: Epic 3 - Single command orchestration
FR10: Epic 3 - Test coverage reports
FR11: Epic 3 - Security & accessibility reports

## Epic List

### Epic 1: Core Task Lifecycle Management

Complete management of daily tasks allowing users to create, view, edit, complete, uncomplete, and delete tasks.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6

### Epic 2: Accessible & Responsive Experience

Users of all abilities can interact with the task list using keyboards, and receive immediate clear feedback for all their actions.
**FRs covered:** FR7, FR8

### Epic 3: Deployment & Quality Visibility

Evaluators and developers can instantly run the entire stack and review code quality, security, and accessibility metrics.
**FRs covered:** FR9, FR10, FR11

### Epic 4: Frontend Test Coverage Completeness

Developers and evaluators can confirm the frontend meets the 70% coverage requirement through comprehensive unit tests and a complete E2E task management suite.
**FRs covered:** NFR1

<!-- End story repeat -->

## Epic 1: Core Task Lifecycle Management

Complete management of daily tasks allowing users to create, view, edit, complete, uncomplete, and delete tasks.

### Story 1.1: Project Initialization and Task Creation

As a user,
I want to create a new task by providing text input,
So that I can keep track of things I need to do.

**Acceptance Criteria:**
**Given** the application is initialized with the starter template (Custom Decoupled Architecture: Vite + Fastify CLI, SQLite)
**When** I enter text into the new task input field and submit
**Then** a new task is created and persisted in the database
**And** the UI updates to show the new task in the list

### Story 1.2: View Task List

As a user,
I want to view a list of all my existing tasks,
So that I can see what I need to accomplish.

**Acceptance Criteria:**
**Given** there are tasks in the database
**When** I load the application
**Then** I see a list of all existing tasks
**And** the list accurately reflects the current state of tasks

### Story 1.3: Edit Existing Task

As a user,
I want to edit the text of an existing task,
So that I can correct mistakes or update my plans.

**Acceptance Criteria:**
**Given** I have an existing task in my list
**When** I select the task to edit and submit new text
**Then** the task's text is updated in the database
**And** the UI reflects the modified text

### Story 1.4: Complete and Uncomplete Tasks

As a user,
I want to mark tasks as completed or incomplete,
So that I can track my progress.

**Acceptance Criteria:**
**Given** I have a task in my list
**When** I toggle the completion status of the task
**Then** the task's status is updated in the database
**And** the UI visually distinguishes between completed and incomplete tasks

### Story 1.5: Delete Task

As a user,
I want to permanently delete an existing task,
So that I can remove items I no longer need to track.

**Acceptance Criteria:**
**Given** I have an existing task in my list
**When** I select the option to delete the task
**Then** the task is permanently removed from the database
**And** the task is no longer visible in the UI list

---

## Epic 2: Accessible & Responsive Experience

Users of all abilities can interact with the task list using keyboards, and receive immediate clear feedback for all their actions.

### Story 2.1: Keyboard Navigation

As a keyboard-only user,
I want to interact with all primary controls (creating, editing, deleting, completing tasks) using only my keyboard,
So that I can use the application effectively without a mouse.

**Acceptance Criteria:**
**Given** I am navigating the application using only the 'Tab', 'Enter', 'Space', and arrow keys
**When** I navigate to interactive elements like inputs, buttons, and task items
**Then** I can clearly see which element has focus
**And** I can trigger all primary actions (create, edit, complete, delete) using keyboard commands

### Story 2.2: Immediate Visual Feedback

As a user,
I want to receive immediate visual feedback when an action occurs,
So that I feel confident the application has registered my input.

**Acceptance Criteria:**
**Given** I am interacting with the application
**When** I create, update, or delete a task
**Then** the application provides immediate optimistic UI updates
**And** the system displays a brief confirmation notification/toast indicating success or failure

---

## Epic 3: Deployment & Quality Visibility

Evaluators and developers can instantly run the entire stack and review code quality, security, and accessibility metrics.

### Story 3.1: Single Command Orchestration

As an evaluator or developer,
I want to start the entire application suite (API and UI) utilizing a single orchestration command,
So that I can quickly run the application locally without manual setup.

**Acceptance Criteria:**
**Given** I have Docker installed and the repository cloned
**When** I run `docker-compose up`
**Then** the entire stack (database, backend, frontend) starts up successfully
**And** the frontend is exposed on its configured port and fully functional, communicating with the backend

### Story 3.2: Automated Quality Reporting

As an evaluator or developer,
I want to view static reports generated from the codebase detailing test coverage, security, and accessibility,
So that I can verify the quality and compliance of the complete application.

**Acceptance Criteria:**
**Given** I have access to the codebase
**When** I run the designated script or command for quality checks
**Then** static reports are generated or displayed in the console
**And** the reports clearly detail test coverage metrics, security vulnerabilities, and accessibility audit results

---

## Epic 4: Frontend Test Coverage Completeness

Developers and evaluators can confirm the frontend meets the 70% coverage requirement through comprehensive unit tests and a complete E2E task management suite.

**FRs covered:** NFR1 (70% coverage threshold)

### Story 4.1: App.tsx Unit Tests with MSW

As a developer,
I want unit tests for App.tsx covering all task mutations and error paths,
So that the frontend meets the 70% coverage threshold without relying solely on E2E tests.

**Acceptance Criteria:**
**Given** MSW (Mock Service Worker) is installed and configured in the Vitest environment
**When** the unit test suite runs
**Then** all task mutations (create, edit, complete, delete) are tested for both success and API error paths
**And** overall frontend coverage meets or exceeds 70% for lines, statements, functions, and branches

### Story 4.2: E2E Task Management Full Suite

As a developer or evaluator,
I want a comprehensive E2E test suite covering the full task lifecycle with API error scenarios,
So that all core user flows are validated end-to-end including failure handling.

**Acceptance Criteria:**
**Given** the application stack is running
**When** the E2E suite runs
**Then** it covers create, edit, and delete flows as explicit test cases
**And** API error interception tests exist for create, edit, and delete operations
**And** all tests pass
