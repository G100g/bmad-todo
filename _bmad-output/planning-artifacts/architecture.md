---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  [
    "_bmad-output/planning-artifacts/prd.md",
    "_bmad-output/planning-artifacts/brief.md",
  ]
workflowType: "architecture"
lastStep: 8
status: "complete"
completedAt: "2026-04-28"
project_name: "bmad-todo"
user_name: "Giorgio"
date: "2026-04-28"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

- Standard CRUD operations for to-do tasks (Create, Read, Update, Delete)
- Headless architecture (React SPA decoupled from Fastify API)

**Non-Functional Requirements:**

- Flawless portability (< 3 minutes from clone to run)
- Minimum 70% test coverage across Unit, Integration, and E2E with QA reports
- Docker Containerization with health checks
- Basic accessibility (keyboard navigation, ARIA labels, contrast)
- Zero critical or high vulnerabilities
- Mobile-first responsive design

**Scale & Complexity:**

- Primary domain: Web Application (React SPA) & API Backend (Fastify)
- Complexity level: Low (Standard CRUD operations) but High Engineering Rigor
- Estimated architectural components: Frontend SPA, Backend API, SQLite Database, CI/Testing Pipeline, Docker Infrastructure

### Technical Constraints & Dependencies

- Must use local SQLite database isolated per container instance.
- Orchestration Constraint: Docker orchestration must implement strict dependency health checks (`depends_on` with `condition: service_healthy`) to prevent race conditions during startup.
- Database Concurrency Constraint: The SQLite setup must support simultaneous test executions without locking, mandating an in-memory (`:memory:`) or ephemeral instance for backend test runners.

### Cross-Cutting Concerns Identified

- Container Orchestration & Health Checks
- Comprehensive Testing Infrastructure & Static QA Reporting
- Security & Vulnerability Scanning
- Basic Accessibility (a11y) Standards

## Starter Template Evaluation

### Primary Technology Domain

Web Application (React SPA) & API Backend (Fastify) based on project requirements analysis.

### Starter Options Considered

Given the strict requirement for a headless, decoupled architecture and localized SQLite, we evaluated pre-packaged meta-frameworks against composing the exact stack manually.

- **Meta-Frameworks (e.g. Next.js, Remix):** Rejected. They strongly opine a unified full-stack architecture, breaking the requirement for an explicit HTTP decoupled Fastify backend and standalone SPA frontend orchestration.
- **Custom Decoupled Architecture:** Accepted. Initializing the precise technologies (Vite for React, Fastify-CLI for the backend) ensures we don't fight boilerplate constraints and retain absolute control over the Docker orchestration and test isolation.

### Selected Starter: Custom Decoupled Architecture (Vite + Fastify)

**Rationale for Selection:**
Provides the exact technologies requested by the Product Brief without fighting against the opinions of a larger boilerplate. Ensures maximum control over the Docker orchestration (`docker-compose`) and SQLite instance isolation required by the 70% test coverage and <3 min startup constraints.

**Initialization Command:**

```bash
# Frontend
npm create vite@latest frontend -- --template react-ts

# Backend
npx fastify-cli@latest generate backend --lang=ts
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript for both frontend and backend to ensure type safety across the network boundary. Node.js runtime.

**Styling Solution:**
Standard UI kit integration via Vite plugins.

**Build Tooling:**
Frontend uses Vite (v9+) for fast HMR and optimized production builds.
Backend uses Fastify CLI (v8+) building down to standard CommonJS/ESM.

**Testing Framework:**
Vitest for unit testing.
Playwright for E2E testing to ensure browser compatibility.
Fastify's native `inject` utility for backend API integration testing.

**Code Organization:**
Two distinct projects (`frontend` and `backend`) residing in a single monorepo, each with its own `package.json` and `Dockerfile`, combined via a root `docker-compose.yml`.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Custom Decoupled Architecture Setup (React Vite + Fastify CLI)
- Data Persistence & Access Pattern (SQLite)
- Frontend State & UI Foundation

**Important Decisions (Shape Architecture):**

- API Validation Schema
- Docker Health Check Protocol

**Deferred Decisions (Post-MVP):**

- Authentication & Authorization
- Cloud-native configurations (Kubernetes/Terraform)

### Data Architecture

- **Database Engine:** Local SQLite
- **Access Pattern:** Raw SQL via `better-sqlite3` (~v12.9.0).
  _Rationale: Chosen for maximum control over connections, lowest overhead, zero tertiary binaries (unlike Prisma), and granular testing configs._
- **Data Validation:** Fastify Native JSON Schema (AJV).
  _Rationale: Utilizes the highest-performance validation natively integrated into Fastify core routes._

### Authentication & Security

- **Authentication Method:** Deferred (Post-MVP).
- **Security Middleware:** `fastify-helmet` for security headers, `@fastify/cors` for explicit origins.
- **API Security:** Strict HTTP param and body validation utilizing Fastify Schema to block payload injection.

### API & Communication Patterns

- **API Design Patterns:** RESTful standard URL routing (`/tasks/:id`).
- **Data Exchange:** Standard JSON payloads.
- **Client Fetching:** `@tanstack/react-query` (v5+).
  _Rationale: Unifies caching, mutation reflections, and UI loading states without reinventing the wheel in React._

### Frontend Architecture

- **State Management:** React Query for server-state. Ephemeral form state handled via native React hooks.
- **Styling Solution:** `tailwindcss` (v4+) for zero-runtime utility styling.
- **Accessibility Framework:** Radix UI Primitives.
  _Rationale: Addresses the brief's requirement for standard keyboard navigation and ARIA attributes immediately out of the box._

### Infrastructure & Deployment

- **Container Orchestration:** Docker Compose.
- **Health Strategy:** Backend container natively specifies a `curl` based `healthcheck` in Compose. The frontend sets a `depends_on: { backend: { condition: service_healthy } }` property.

### Decision Impact Analysis

**Implementation Sequence:**

1. Stand up Docker infrastructure & networking (`docker-compose.yml` config).
2. Initialize Fastify and raw SQLite schemas.
3. Build standalone CRUD API and write injection tests.
4. Scaffold React Vite with Tailwind and React Query configs.
5. Create accessible UI components hooked into the API.
6. Write final Playwright E2E suites passing against an ephemeral instance.

**Cross-Component Dependencies:**

- Frontend components are strongly coupled to the shape of the JSON Schemas defined in Fastify.
- Compose synchronization completely relies on the backend serving a viable `/health` route immediately upon server initialization.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
4 areas where AI agents could make different choices (Naming, Architecture Structure, API Formatting, Process Patterns)

### Naming Patterns

**Database Naming Conventions:**

- **Tables & Columns (SQLite):** `snake_case` exclusively (e.g., `tasks`, `created_at`).
- **Indices:** `idx_table_column` (e.g., `idx_tasks_status`).

**API Naming Conventions:**

- **REST Endpoints:** Plural nouns, `kebab-case` paths (e.g., `/tasks`, `/tasks/:id`).
- **JSON Payloads:** `camelCase` exclusively for all requests and responses (e.g., `taskId`, `createdAt`).

**Code Naming Conventions:**

- **React Components:** `PascalCase` strictly (e.g., `TaskItem.tsx`).
- **Hooks & Functions:** `camelCase` (e.g., `useTasks.ts`, `formatDate.ts`).
- **Files/Folders:** `kebab-case` for standard files, `PascalCase` for React components.
- **Type/Interface Definitions:** `PascalCase` (e.g., `TaskResponse`, `CreateTaskBody`).

### Structure Patterns

**Project Organization:**

- **Monorepo:** Two discrete sibling folders (`frontend/` and `backend/`).
- **Test Co-location:** Unit and Integration tests must be co-located with their subject files (e.g., `TaskList.test.tsx` next to `TaskList.tsx`, or `routes.test.ts` next to `routes.ts`). This guarantees AI agents can always find the correct test file.
- **E2E Isolation:** Playwright End-to-End tests reside in a dedicated `/e2e` root-level folder.

### Format Patterns

**API Response Formats:**

- **Success:** Enveloped in a `data` object: `{ "data": { "id": 1, ... } }`. Lists return an array in data: `{ "data": [...] }`.
- **Errors:** Standardized error envelope: `{ "error": { "code": "VALIDATION_FAILED", "message": "..." } }`.

**Data Exchange Formats:**

- **Dates:** ISO 8601 strings (e.g., `2026-04-28T10:00:00.000Z`) exclusively across the wire.
- **Booleans:** Strict boolean types (`true`/`false`), not integers (`1`/`0`).

### Process Patterns

**Error Handling:**

- **Backend:** Global Fastify error handler catches exceptions and standardizes the output via the JSON error envelope.
- **Frontend:** React Error Boundaries at the route level. React Query handles component-level mutation/query errors gracefully without redundant global state.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
bmad-todo/
├── package.json (Root scripts for running tests)
├── docker-compose.yml
├── README.md
├── e2e/
│   ├── tests/ (Playwright E2E tests orchestrating both services)
│   └── playwright.config.ts
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── ui/ (Generic Radix components)
│       │   └── features/ (e.g., TaskList.tsx, TaskList.test.tsx)
│       ├── hooks/ (React Query mutations/queries)
│       └── lib/
└── backend/
    ├── package.json
    ├── Dockerfile
    └── src/
        ├── app.ts (Fastify instance setup)
        ├── server.ts
        ├── db/ (SQLite better-sqlite3 connection and raw migrations)
        ├── routes/
        │   └── tasks/ (index.ts, schema.ts, index.test.ts)
        └── plugins/ (CORS, Helmet middleware)
```

### Architectural Boundaries

**API Boundaries:**

- The frontend and backend are completely decoupled. The frontend (`frontend/src/hooks/`) communicates with the backend purely via HTTP over standard REST endpoints (`/tasks`).
- **Validation Boundary:** Fastify JSON schemas in `backend/src/routes/tasks/schema.ts` act as the absolute boundary. No request enters the routing handler logic without passing AJV validation.

**Component Boundaries:**

- **State Boundary:** React Query (`frontend/src/hooks/`) sits at the literal edge of the frontend, caching network responses as server state. Local React state (`useState`) is strictly relegated to ephemeral interactions (e.g., typing in the "New Task" input).
- **UI Boundary:** `frontend/src/components/ui/` handles pure, unopinionated, accessible styling (Radix + Tailwind). `frontend/src/components/features/` orchestrates `ui/` components using data from `hooks/`.

**Data Boundaries:**

- **Persistence Boundary:** `backend/src/db/` abstracts raw SQLite queries. The route handlers in `routes/tasks/` call db interface methods and map SQLite results back to standard JSON representations.

### Requirements Mapping

**Core MVP Feature: Task Management**

- **Frontend Components:** `frontend/src/components/features/` (TaskList, TaskItem, CreateTaskForm)
- **Frontend State:** `frontend/src/hooks/useTasks.ts`
- **Backend Routes:** `backend/src/routes/tasks/index.ts`
- **Backend DB:** `backend/src/db/index.ts`

**Core MVP Feature: Testing Infrastructure**

- **Backend Unit/DB Integration:** Co-located in `backend/src/routes/tasks/index.test.ts` (using Vitest + Fastify `inject()` over an in-memory SQLite mapping).
- **Frontend Component/Unit:** Co-located in `frontend/src/components/features/` (e.g., `TaskList.test.tsx` using Vitest + React Testing Library).
- **E2E Integration:** `e2e/tests/` (Playwright spinning up the fully built stack).

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
The selected technology stack (Vite React + Fastify CLI + SQLite) is perfectly compatible. By defining strict JSON schemas at the API boundary, we decouple the frontend and backend, avoiding integration friction.

**Pattern Consistency:**
Implementation patterns directly support our decoupled decisions. Data stays `snake_case` in the backend SQLite and transforms to `camelCase` for the frontend matching standard JavaScript conventions.

**Structure Alignment:**
The monorepo structure physically enforces the network decoupling (no shared code leaking besides the network contract).

### Requirements Coverage Validation ✅

**Core Feature Coverage:**
Standard CRUD operations for Tasks are supported natively by Fastify route handlers interfacing with better-sqlite3.

**Non-Functional Requirements Coverage:**

- **<3min Docker limit:** Ensured by avoiding heavy ORMs and waiting for native Docker health checks.
- **70% Test Coverage:** The structure explicitly mandates co-located tests for Unit/Integration and a root `/e2e` folder to ensure accountability.
- **Accessibility:** Addressed natively by adopting Radix UI.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Critical architectural dependencies (Vite v9, Fastify v8, better-sqlite3 v12, React Query v5) are version-locked and documented.

**Structure Completeness:**
Every domain (frontend, backend, tests, infrastructure) has an exact, specified folder in the project tree map. No guesswork required.

**Pattern Completeness:**
Naming conflicts (e.g., casing collisions) and state management ambivalences have explicit rules in place.

### Gap Analysis Results

- **Minor Gap (Deferred):** The exact CI/CD pipeline YAML (GitHub Actions) is undefined. This is intentional per the PRD which scopes formal CI/CD to Post-MVP.
- **Minor Gap (Deferred):** The database schema layout is not detailed. This correctly belongs in the next phase (Solutioning).

### Validation Issues Addressed

None. The architecture directly satisfies the constraints defined in the PRD and Brief.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented
