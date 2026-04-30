---
storyCode: "5-2"
storyTitle: "Integration Tests for GET /tasks Endpoint"
epicCode: "EPIC-5"
epicTitle: "QA Integration Testing"
status: "ready-for-dev"
createdDate: "2026-04-30"

acceptance_criteria:
  - Test: List returns empty array when no tasks exist
  - Test: List returns all tasks ordered by creation date (ASC)
  - Test: Response matches schema `{ "data": [{ id, title, isCompleted, createdAt }, ...] }`
  - Test: All isCompleted values are properly typed as boolean (not 0/1 from SQLite)
  - Test: Response includes proper HTTP 200 status
  - Tests pass 100% and execute in < 1 second

acceptance_tests:
  - Verify GET /tasks returns 200 when database is empty
  - Verify response payload is `{ "data": [] }`
  - Verify GET /tasks with multiple tasks returns all tasks
  - Verify tasks are ordered by creation date ascending
  - Verify each task has id (number), title (string), isCompleted (boolean), createdAt (ISO 8601 string)
  - Verify isCompleted is boolean true/false, not numeric 0/1

tasks:
  - Create test file backend/test/get-tasks.integration.test.ts
  - Implement empty list test
  - Implement multiple tasks ordering test
  - Implement response schema validation test
  - Implement isCompleted type validation test
  - Verify all tests pass
  - Verify test execution time < 1 second

implementation_context: |
  GET /tasks is the simplest endpoint and a great starting point for integration tests.
  This story validates:
  1. Empty state handling
  2. Data ordering (ASC by creation date per spec)
  3. Response contract compliance
  4. Type transformations (SQLite's 0/1 → boolean true/false)

related_requirements:
  - Architecture: "API Response Format: RESTful endpoints with camelCase JSON payloads; responses wrapped in { "data": {...} } envelope"
  - Architecture: "Database: SQLite implementation via better-sqlite3"
  - Endpoint spec: "GET /tasks — Retrieve all tasks ordered by creation date"

technical_notes: |
  **Response Contract:**
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "Buy milk",
        "isCompleted": false,
        "createdAt": "2026-04-30T10:30:45.123Z"
      }
    ]
  }
  ```
  
  **SQLite → JSON Transformation:**
  - completed column stores 0 or 1 (SQLite has no boolean type)
  - Mapping function must transform to true/false
  - createdAt must be ISO 8601 string format
  
  **Test Database State:**
  - Each test gets fresh in-memory database
  - Tests can safely assume empty state at start
  - Use seedTask() helper to create test data

definition_of_done:
  - All acceptance criteria met
  - Test file created and passes 100%
  - Response schema validated in tests
  - Type transformations verified
  - Execution time < 1 second
  - Code review passed

story_estimate: "1.5 hours"
priority: "high"
---

# Story 5-2: Integration Tests for GET /tasks Endpoint

## Goal

Write comprehensive integration tests for the GET /tasks endpoint that validate the happy path (list retrieval), empty state, data ordering, response contract, and type transformations.

## Context

GET /tasks is the simplest CRUD operation and serves as the foundation for testing the response contract. This story focuses on:

- Endpoint returns 200 with correct response envelope
- Empty database is handled gracefully
- Multiple tasks are returned in creation order (ASC)
- SQLite integer values (0/1) are correctly transformed to boolean
- createdAt timestamps are in ISO 8601 format

## Implementation Approach

### Step 1: Create Test File

Create `backend/test/get-tasks.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";
import { FastifyInstance } from "fastify";
import { createTestDb, createTestApp } from "./fixtures";
import { seedTask, getTasks } from "./helpers";

describe("GET /tasks - Integration Tests", () => {
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

  describe("Empty State", () => {
    it("returns 200 status code", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      expect(response.statusCode).toBe(200);
    });

    it("returns empty array when no tasks exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({ data: [] });
    });
  });

  describe("Data Retrieval", () => {
    it("returns all tasks when multiple exist", async () => {
      await seedTask(app, "First task");
      await seedTask(app, "Second task");
      await seedTask(app, "Third task");

      const response = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(3);
      expect(body.data[0].title).toBe("First task");
      expect(body.data[1].title).toBe("Second task");
      expect(body.data[2].title).toBe("Third task");
    });

    it("returns tasks ordered by creation date (ASC)", async () => {
      // Create tasks in intentionally mixed order
      const task1 = await seedTask(app, "Task created first");
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      const task2 = await seedTask(app, "Task created second");
      await new Promise((resolve) => setTimeout(resolve, 10));
      const task3 = await seedTask(app, "Task created third");

      const tasks = await getTasks(app);

      // Verify tasks are in creation order (by checking ID or timestamp)
      expect(tasks[0].id).toBe(task1.id);
      expect(tasks[1].id).toBe(task2.id);
      expect(tasks[2].id).toBe(task3.id);
    });
  });

  describe("Response Contract", () => {
    it("wraps response in { data: [...] } envelope", async () => {
      await seedTask(app, "Test task");

      const response = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data)).toBe(true);
      expect(body).not.toHaveProperty("error");
    });

    it("each task has correct structure and types", async () => {
      const created = await seedTask(app, "Structured task");

      const tasks = await getTasks(app);
      expect(tasks).toHaveLength(1);

      const task = tasks[0];

      // Validate structure
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("isCompleted");
      expect(task).toHaveProperty("createdAt");

      // Validate types
      expect(typeof task.id).toBe("number");
      expect(typeof task.title).toBe("string");
      expect(typeof task.isCompleted).toBe("boolean");
      expect(typeof task.createdAt).toBe("string");

      // Validate values
      expect(task.title).toBe("Structured task");
      expect(task.isCompleted).toBe(false); // New task should be incomplete
    });

    it("does not include additional properties in response", async () => {
      await seedTask(app, "Minimal task");

      const tasks = await getTasks(app);
      const task = tasks[0];

      // Should only have these 4 properties
      expect(Object.keys(task).sort()).toEqual(
        ["createdAt", "id", "isCompleted", "title"].sort(),
      );
    });
  });

  describe("Type Transformations", () => {
    it("transforms isCompleted 0 to false", async () => {
      // New tasks are created with completed=0
      const task = await seedTask(app, "Incomplete task");

      expect(task.isCompleted).toBe(false);
      expect(typeof task.isCompleted).toBe("boolean");
    });

    it("transforms isCompleted 1 to true", async () => {
      const task = await seedTask(app, "Task to complete");

      // Mark as completed
      const updated = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { completed: true },
      });

      const body = JSON.parse(updated.payload);
      expect(body.data.isCompleted).toBe(true);
      expect(typeof body.data.isCompleted).toBe("boolean");

      // Verify in list response
      const tasks = await getTasks(app);
      const found = tasks.find((t) => t.id === task.id);
      expect(found?.isCompleted).toBe(true);
    });

    it("createdAt is ISO 8601 formatted string", async () => {
      const task = await seedTask(app, "Task with timestamp");

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      expect(iso8601Regex.test(task.createdAt)).toBe(true);

      // Should be parseable as valid Date
      expect(() => new Date(task.createdAt)).not.toThrow();
    });
  });

  describe("Performance", () => {
    it("retrieves 100 tasks in < 500ms", async () => {
      // Seed 100 tasks
      for (let i = 0; i < 100; i++) {
        await seedTask(app, `Task ${i + 1}`);
      }

      const start = performance.now();
      const tasks = await getTasks(app);
      const duration = performance.now() - start;

      expect(tasks).toHaveLength(100);
      expect(duration).toBeLessThan(500);
    });
  });
});
```

### Step 2: Update Test Helpers (if needed)

Ensure `backend/test/helpers.ts` has the `getTasks()` function:

```typescript
export async function getTasks(app: FastifyInstance): Promise<Task[]> {
  const response = await app.inject({
    method: "GET",
    url: "/tasks",
  });

  expect(response.statusCode).toBe(200);
  const json = JSON.parse(response.payload);
  return json.data;
}
```

### Step 3: Run Tests

```bash
cd backend
npm run test:integration -- get-tasks.integration.test.ts
```

## Validation Checklist

- [ ] Test file created at `backend/test/get-tasks.integration.test.ts`
- [ ] All 10+ tests pass with 100% success
- [ ] Empty state test passes
- [ ] Multiple task retrieval test passes
- [ ] Task ordering by creation date verified
- [ ] Response contract validation passes
- [ ] Type transformations verified (boolean, ISO 8601)
- [ ] Performance baseline met (< 1 second for suite)
- [ ] No console errors or warnings
- [ ] Code review approved

## Success Criteria

✅ All acceptance criteria met  
✅ Response contract validated  
✅ Type transformations verified  
✅ Execution time < 1 second  
✅ Code review passed

---

**Next Steps:** Once this story is complete, Story 5-3 can begin testing the POST /tasks (create) endpoint.
