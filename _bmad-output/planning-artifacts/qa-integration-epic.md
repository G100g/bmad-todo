---
epicCode: "EPIC-5"
epicTitle: "QA Integration Testing - Backend API Endpoint Validation"
epicStatus: backlog
createdDate: "2026-04-30"
description: "Comprehensive integration test suite validating all backend API endpoints (Task CRUD) with contract validation, error handling, and end-to-end flow testing."
relatedFRs: ["NFR1"]
relatedNFRs: ["NFR1 - 70% test coverage requirement"]
---

# Epic 5: QA Integration Testing - Backend API Endpoint Validation

## Epic Overview

This epic delivers a production-grade integration test suite that validates all Task API endpoints (GET, POST, PATCH, DELETE) with full coverage of happy paths, edge cases, error conditions, and data contracts. Tests are written with Fastify's native `inject` utility and Vitest, co-located with backend source code per the architecture spec.

**Why This Matters:**

- Validates the API contract between frontend and backend.
- Catches integration issues before E2E tests run (faster feedback loop).
- Provides test coverage for the 70% NFR1 requirement.
- Catches edge cases and error handling paths that unit tests alone miss.

## Acceptance Criteria (Epic Level)

- [ ] All four Task endpoints (GET, POST, PATCH, DELETE) have integration test coverage
- [ ] Each endpoint test covers happy path, validation failures, not-found scenarios, and data contract
- [ ] Tests use Fastify `inject()` utility; no external HTTP calls
- [ ] Response payloads match schema: `{ "data": {...} }` (success) or `{ "error": { "code": "...", "message": "..." } }` (errors)
- [ ] Test database is isolated per test file (in-memory or ephemeral SQLite)
- [ ] All tests pass with 100% success rate in CI/CD
- [ ] Test run completes in < 5 seconds (performance baseline)
- [ ] Coverage metrics: Backend integration tests contribute to 70% overall coverage goal

## Related Requirements

**From PRD:**

- NFR1: Minimum 70% test coverage across Unit, Integration, and E2E suites

**From Architecture:**

- Test Technology Stack: Fastify `inject()` utility for API integration, Vitest for test runner, co-located tests
- API Response Format: RESTful endpoints with `camelCase` JSON payloads; responses wrapped in `{ "data": {...} }` envelope
- Error Responses: `{ "error": { "code": "...", "message": "..." } }` format
- Database Testing: SQLite with in-memory or ephemeral instance for test isolation
- Performance Baseline: Tests should execute in < 5 seconds total

## API Endpoints Under Test

### 1. GET /tasks

**Purpose:** Retrieve all tasks  
**Spec:** RESTful GET, returns array of tasks ordered by creation date  
**Response Schema:** `{ "data": [{ id, title, isCompleted, createdAt }, ...] }`

### 2. POST /tasks

**Purpose:** Create a new task  
**Spec:** RESTful POST with JSON body `{ title: string }`, returns 201 with created task  
**Response Schema:** `{ "data": { id, title, isCompleted, createdAt } }`  
**Validation:** Title required, 1-500 chars

### 3. PATCH /tasks/:id

**Purpose:** Update a task (title and/or completed status)  
**Spec:** RESTful PATCH with optional `{ title?, completed? }`  
**Response Schema:** `{ "data": { id, title, isCompleted, createdAt } }`  
**Errors:** 404 if task not found

### 4. DELETE /tasks/:id

**Purpose:** Delete a task permanently  
**Spec:** RESTful DELETE, returns 200 with deleted task payload  
**Response Schema:** `{ "data": { id, title, isCompleted, createdAt } }`  
**Errors:** 404 if task not found; TOCTOU guard for concurrent deletes

## User Stories

### Story 5-1: Integration Test Framework Setup

**Description:** Initialize Vitest integration test infrastructure with test database fixtures, helper utilities, and before/after hooks.

**Acceptance Criteria:**

- Test runner configured in `backend/vitest.config.ts` for integration tests
- Test database setup with in-memory SQLite for test isolation
- Global test fixtures (db connection, schema initialization, cleanup hooks)
- Test helper utilities: `createTestApp()`, `seedTask()`, `cleanupDb()`
- All fixtures execute in < 500ms per test

---

### Story 5-2: Integration Tests for GET /tasks Endpoint

**Description:** Write comprehensive tests validating the GET /tasks list endpoint including happy path, empty list, data ordering, and response format validation.

**Acceptance Criteria:**

- Test: List returns empty array when no tasks exist
- Test: List returns all tasks ordered by creation date (ASC)
- Test: Response matches schema `{ "data": [{ id, title, isCompleted, createdAt }, ...] }`
- Test: All isCompleted values are properly typed as boolean (not 0/1 from SQLite)
- Test: Response includes proper HTTP 200 status
- Tests pass 100% and execute in < 1 second

---

### Story 5-3: Integration Tests for POST /tasks Endpoint

**Description:** Comprehensive tests for task creation including happy path, validation, and response contract.

**Acceptance Criteria:**

- Test: Create task with valid title returns 201 with created task data
- Test: Created task has auto-generated id, isCompleted=false, createdAt timestamp
- Test: Response matches schema `{ "data": { id, title, isCompleted, createdAt } }`
- Test: Empty title rejected with 400 validation error
- Test: Title exceeding 500 chars rejected with 400 validation error
- Test: Missing title property rejected with 400 validation error
- Test: Additional properties in request body handled gracefully
- Tests pass 100% and execute in < 2 seconds

---

### Story 5-4: Integration Tests for PATCH /tasks/:id Endpoint

**Description:** Tests for updating tasks including partial updates, validation, edge cases, and error handling.

**Acceptance Criteria:**

- Test: Update title only succeeds with 200 response
- Test: Update completed status only succeeds with 200 response
- Test: Update both title and completed succeeds with 200 response
- Test: Empty update body (no changes) returns existing task unchanged
- Test: Updated task response matches schema `{ "data": { id, title, isCompleted, createdAt } }`
- Test: New title validates 1-500 character constraint
- Test: Invalid id (non-integer) returns 400 validation error
- Test: Non-existent task id returns 404 with proper error code/message
- Test: Database error caught and returns 500 with proper error response
- Tests pass 100% and execute in < 2 seconds

---

### Story 5-5: Integration Tests for DELETE /tasks/:id Endpoint

**Description:** Tests for task deletion including happy path, error handling, TOCTOU race condition, and response format.

**Acceptance Criteria:**

- Test: Delete existing task succeeds with 200 and returns deleted task data
- Test: Response after delete matches schema `{ "data": { id, title, isCompleted, createdAt } }`
- Test: Non-existent task id returns 404 with proper error code/message
- Test: TOCTOU guard: Concurrent deletes of same task handled (second request gets 404)
- Test: Invalid id (non-integer) returns 400 validation error
- Test: Deleted task no longer retrievable via GET
- Tests pass 100% and execute in < 2 seconds

---

### Story 5-6: Integration Test Suite Validation & Coverage Report

**Description:** Verify all integration tests pass, generate coverage reports, and validate 70% NFR1 requirement contribution.

**Acceptance Criteria:**

- All 25+ integration tests pass with 100% success rate
- Full integration test suite executes in < 5 seconds
- Coverage report generated: `backend/coverage/coverage-summary.json`
- Backend integration test coverage is ≥ 70% of backend code
- Coverage report includes breakdown by file and function
- All endpoint code paths tested (happy path + error paths)
- Integration tests pass in CI/CD pipeline
- Test documentation updated with test count and execution time

---

## Implementation Notes

### Test Isolation Strategy

- Each test file gets a fresh in-memory SQLite database via before/after hooks
- No test pollutes another test's data
- Database schema initialized from migration scripts in each test setup

### Response Contract Validation

All responses validated against these patterns:

```json
// Success (2xx)
{ "data": { ...payload } }

// Error (4xx/5xx)
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

### Test Naming Convention

```
tasks.integration.test.ts      // All Task API tests
get-tasks.test.ts               // GET /tasks tests
post-tasks.test.ts              // POST /tasks tests
patch-tasks.test.ts             // PATCH /tasks/:id tests
delete-tasks.test.ts            // DELETE /tasks/:id tests
```

### Database Test Fixtures

```typescript
// Example fixture pattern
beforeEach(async () => {
  testDb = new Database(":memory:");
  initializeSchema(testDb);
  app = createTestApp(testDb);
});

afterEach(async () => {
  testDb.close();
});
```

### Coverage Baseline

- Endpoint handlers: 100% (all code paths tested)
- Error conditions: 100% (400, 404, 500 paths)
- Data contracts: 100% (response schema validation)
- Business logic: 100% (TOCTOU, ordering, transformations)

## Success Metrics

| Metric                | Target        | Purpose                                 |
| --------------------- | ------------- | --------------------------------------- |
| Test Count            | 25+           | Comprehensive coverage of all endpoints |
| Pass Rate             | 100%          | All tests pass consistently             |
| Execution Time        | < 5s          | Fast feedback loop for developers       |
| Coverage Contribution | ≥ 70% backend | NFR1 requirement support                |
| Error Path Coverage   | 100%          | Validation and edge cases handled       |

---

**Epic Owner:** Giorgio (Product Manager)  
**Estimated Stories:** 6  
**Estimated Delivery:** 1-2 sprints  
**Priority:** High (NFR1 requirement, critical for production readiness)
