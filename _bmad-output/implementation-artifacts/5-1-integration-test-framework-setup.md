---
storyCode: "5-1"
storyTitle: "Integration Test Framework Setup"
epicCode: "EPIC-5"
epicTitle: "QA Integration Testing"
status: "ready-for-dev"
createdDate: "2026-04-30"

acceptance_criteria:
  - Test runner configured in `backend/vitest.config.ts` for integration tests
  - Test database setup with in-memory SQLite for test isolation
  - Global test fixtures (db connection, schema initialization, cleanup hooks)
  - Test helper utilities (createTestApp(), seedTask(), cleanupDb())
  - All fixtures execute in < 500ms per test

acceptance_tests:
  - Verify vitest.config.ts includes integration test glob pattern
  - Verify test database initializes and cleans up automatically
  - Verify createTestApp() returns Fastify instance with test db
  - Verify seedTask() creates tasks in test database
  - Verify cleanupDb() removes all test data

tasks:
  - Configure Vitest config for integration test patterns
  - Create test/fixtures directory structure
  - Implement test database factory with in-memory SQLite
  - Implement schema initialization from migration
  - Implement helper utilities module
  - Add test database cleanup hooks (beforeEach/afterEach)
  - Verify test isolation (no cross-test pollution)
  - Document test infrastructure setup

implementation_context: |
  This story sets up the foundation for all integration tests. It ensures:
  1. Tests run fast (in-memory database, < 500ms per test)
  2. Tests don't interfere with each other (clean database per test)
  3. Developers have convenient helpers to write tests quickly

  Key files to create/modify:
  - backend/vitest.config.ts — Integration test configuration
  - backend/test/fixtures.ts — Database and app factories
  - backend/test/helpers.ts — Test utilities (seedTask, etc.)
  - backend/test/setup.ts — Global test setup

related_requirements:
  - Architecture: "Test Technology Stack: Fastify inject() utility for API integration, Vitest for test runner, co-located tests"
  - Architecture: "Database Testing: SQLite with in-memory or ephemeral instance for test isolation"
  - PRD: "NFR1: The application codebase must maintain a minimum of 70% test coverage"

technical_notes: |
  **Database Setup Pattern:**
  - Use `:memory:` SQLite for ultra-fast test isolation
  - Initialize schema on each test (via migration or raw SQL)
  - Close database connection in afterEach hook

  **Fastify Test App Pattern:**
  - Build test app with dependency injection of test database
  - Fastify's inject() utility for in-process HTTP requests
  - No network calls; tests run locally without port binding

  **Helper Utilities:**
  ```typescript
  export async function createTestApp(db?: Database): Promise<FastifyInstance>
  export async function seedTask(app: FastifyInstance, title: string): Promise<Task>
  export async function cleanupDb(db: Database): Promise<void>
  ```

definition_of_done:
  - All configuration in place and test infrastructure runs without errors
  - Sample test file can import and use fixtures/helpers
  - Test database initializes fresh for each test
  - No data leaks between tests (verified by running tests multiple times)
  - Helper utilities are documented and easy to use
  - PR passes code review
  - All tests in this story pass

story_estimate: "3 hours"
priority: "high"
---

# Story 5-1: Integration Test Framework Setup

## Goal

Establish a fast, isolated test infrastructure for integration testing backend API endpoints. This foundation enables all subsequent integration test stories to run reliably and quickly.

## Context

The backend needs comprehensive integration test coverage to support the 70% NFR1 requirement. Integration tests validate API contracts between frontend and backend without full E2E browser testing. They should:

- Run in-process using Fastify's `inject()` utility (no network calls)
- Execute in < 500ms per test (fast feedback loop)
- Use isolated in-memory databases (no cross-test pollution)
- Provide helper utilities for quick test authoring

This story creates the infrastructure; subsequent stories implement the actual endpoint tests.

## Implementation Approach

### Step 1: Configure Vitest for Integration Tests

Update `backend/vitest.config.ts` to include integration test patterns:

```typescript
export default defineConfig({
  test: {
    // Existing unit test config...

    // Add integration test support
    include: [
      "src/**/*.test.ts", // Unit tests (co-located)
      "test/**/*.integration.test.ts", // Integration tests
    ],
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
});
```

### Step 2: Create Test Database Factory

Create `backend/test/fixtures.ts` to provide test database and app instances:

```typescript
import { Database } from "better-sqlite3";
import { app as buildApp } from "../src/app";

export async function createTestDb(): Promise<Database> {
  const db = new Database(":memory:");

  // Initialize schema
  db.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX idx_tasks_created_at ON tasks(created_at);
  `);

  return db;
}

export async function createTestApp(
  testDb?: Database,
): Promise<FastifyInstance> {
  const db = testDb || (await createTestDb());

  // Inject test database into app context
  const instance = buildApp();

  // Override db connection in app (implementation depends on your DI pattern)
  instance.decorate("db", db);

  await instance.ready();
  return instance;
}

export async function cleanupDb(db: Database): Promise<void> {
  db.exec("DELETE FROM tasks;");
}
```

### Step 3: Create Helper Utilities

Create `backend/test/helpers.ts` with test utilities:

```typescript
import { FastifyInstance } from "fastify";

export interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export async function seedTask(
  app: FastifyInstance,
  title: string = "Test Task",
): Promise<Task> {
  const response = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title },
  });

  const json = JSON.parse(response.payload);
  return json.data;
}

export async function getTasks(app: FastifyInstance): Promise<Task[]> {
  const response = await app.inject({
    method: "GET",
    url: "/tasks",
  });

  const json = JSON.parse(response.payload);
  return json.data;
}

export async function getTask(app: FastifyInstance, id: number): Promise<Task> {
  const response = await app.inject({
    method: "GET",
    url: `/tasks/${id}`,
  });

  const json = JSON.parse(response.payload);
  return json.data;
}

export async function updateTask(
  app: FastifyInstance,
  id: number,
  updates: Partial<{ title: string; completed: boolean }>,
): Promise<Task | null> {
  const response = await app.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    payload: updates,
  });

  if (response.statusCode === 404) return null;

  const json = JSON.parse(response.payload);
  return json.data;
}

export async function deleteTask(
  app: FastifyInstance,
  id: number,
): Promise<Task | null> {
  const response = await app.inject({
    method: "DELETE",
    url: `/tasks/${id}`,
  });

  if (response.statusCode === 404) return null;

  const json = JSON.parse(response.payload);
  return json.data;
}
```

### Step 4: Global Test Setup

Create `backend/test/setup.ts` for global test lifecycle:

```typescript
import { beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";

let testDb: Database | undefined;

beforeEach(async () => {
  // Cleanup database before each test
  if (testDb) {
    testDb.close();
  }
});

afterEach(async () => {
  // Cleanup database after each test
  if (testDb) {
    testDb.close();
    testDb = undefined;
  }
});
```

### Step 5: Create Sample Integration Test

Create `backend/test/tasks.integration.test.ts` as a proof-of-concept:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";
import { FastifyInstance } from "fastify";
import { createTestDb, createTestApp, cleanupDb } from "./fixtures";
import { seedTask, getTasks } from "./helpers";

describe("Tasks API - Integration Tests", () => {
  let testDb: Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    testDb = await createTestDb();
    app = await createTestApp(testDb);
  });

  afterEach(async () => {
    await app.close();
    testDb.close();
  });

  describe("GET /tasks", () => {
    it("returns empty array when no tasks exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toEqual([]);
    });

    it("returns all tasks in creation order", async () => {
      await seedTask(app, "First task");
      await seedTask(app, "Second task");

      const tasks = await getTasks(app);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("First task");
      expect(tasks[1].title).toBe("Second task");
    });
  });
});
```

## Validation Checklist

- [ ] Vitest configured in `backend/vitest.config.ts`
- [ ] `backend/test/fixtures.ts` exports `createTestDb`, `createTestApp`, `cleanupDb`
- [ ] `backend/test/helpers.ts` exports all helper utilities
- [ ] `backend/test/setup.ts` configures beforeEach/afterEach hooks
- [ ] Sample integration test runs successfully: `npm run test:integration`
- [ ] No test data persists between test runs (isolation verified)
- [ ] Fixtures initialize in < 500ms per test
- [ ] Helper utilities are documented and easy to use

## Success Criteria

✅ All configuration in place and test infrastructure runs without errors  
✅ Sample test file can import and use fixtures/helpers  
✅ Test database initializes fresh for each test  
✅ No data leaks between tests  
✅ Helper utilities are documented

---

**Next Steps:** Once this story is complete, Story 5-2 can begin writing tests against the GET /tasks endpoint using these fixtures and helpers.
