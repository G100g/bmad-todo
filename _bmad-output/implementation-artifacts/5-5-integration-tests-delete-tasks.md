---
storyCode: "5-5"
storyTitle: "Integration Tests for DELETE /tasks/:id Endpoint"
epicCode: "EPIC-5"
epicTitle: "QA Integration Testing"
status: "ready-for-dev"
createdDate: "2026-04-30"

acceptance_criteria:
  - Test: Delete existing task succeeds with 200 and returns deleted task data
  - Test: Response after delete matches schema `{ "data": { id, title, isCompleted, createdAt } }`
  - Test: Non-existent task id returns 404 with proper error code/message
  - Test: TOCTOU guard: Concurrent deletes of same task handled (second request gets 404)
  - Test: Invalid id (non-integer) returns 400 validation error
  - Test: Deleted task no longer retrievable via GET
  - Tests pass 100% and execute in < 2 seconds

acceptance_tests:
  - Verify DELETE /tasks/:id returns 200 on success
  - Verify deleted task data is returned in response
  - Verify response schema is correct
  - Verify non-existent task returns 404
  - Verify TOCTOU race condition handled properly
  - Verify deleted task cannot be retrieved
  - Verify invalid id returns 400
  - Verify task count decreases after delete

tasks:
  - Create test file backend/test/delete-tasks.integration.test.ts
  - Implement happy path test (delete existing)
  - Implement response data validation test
  - Implement 404 not-found test
  - Implement TOCTOU race condition test
  - Implement parameter validation test
  - Implement deletion verification test
  - Verify all tests pass
  - Verify test execution time < 2 seconds

implementation_context: |
  DELETE /tasks/:id removes tasks and is the final endpoint test.
  This story tests:
  1. Happy path: Delete existing task → 200 with deleted task data
  2. Response contract: Deleted task payload returned
  3. Error handling: 404 for non-existent, 400 for invalid id
  4. TOCTOU guard: Concurrent deletes handled (atomic delete check)
  5. Verification: Deleted task truly removed from database

related_requirements:
  - Architecture: "API Response Format: RESTful endpoints"
  - Architecture: "Error responses: { "error": { "code": "...", "message": "..." } }"
  - Endpoint spec: "DELETE /tasks/:id — Delete task permanently, return 200 with deleted task payload"

technical_notes: |
  **TOCTOU (Time-of-Check-Time-of-Use) Pattern:**
  The endpoint implements a guard against concurrent deletes:
  1. SELECT task to verify it exists
  2. DELETE task
  3. Check if deletion actually happened (changes === 0)
  4. If changes === 0, return 404 (another request deleted it first)
  
  This prevents the "ghost delete" race condition where:
  - Request A: SELECT task (found)
  - Request B: DELETE task (succeeds)
  - Request A: DELETE task (fails, but A still has task data)
  - Request A: Returns success with stale data
  
  With TOCTOU guard, Request A correctly gets 404.
  
  **Success Response (200):**
  ```json
  {
    "data": {
      "id": 123,
      "title": "Deleted task",
      "isCompleted": false,
      "createdAt": "2026-04-30T10:30:45.123Z"
    }
  }
  ```
  
  **Not Found Error (404):**
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Task not found"
    }
  }
  ```

definition_of_done:
  - All acceptance criteria met
  - Test file created and passes 100%
  - Happy path test verified
  - TOCTOU race condition handled properly
  - 404/400 error handling verified
  - Deletion verification passed
  - Execution time < 2 seconds
  - Code review passed

story_estimate: "2 hours"
priority: "high"
---

# Story 5-5: Integration Tests for DELETE /tasks/:id Endpoint

## Goal

Write comprehensive integration tests for the DELETE /tasks/:id endpoint that validate task deletion, error handling, TOCTOU race condition guards, and verify tasks are truly removed from the database.

## Context

DELETE /tasks/:id is the final CRUD operation. This story tests:

- Happy path: Deleting an existing task returns 200 with the deleted task's payload
- Error handling: 404 for non-existent tasks, 400 for invalid IDs
- TOCTOU guard: Concurrent delete attempts are handled correctly (second request gets 404)
- Verification: Deleted task is actually removed from database and cannot be retrieved
- Data integrity: Only the requested task is deleted, others remain

## Implementation Approach

### Step 1: Create Test File

Create `backend/test/delete-tasks.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";
import { FastifyInstance } from "fastify";
import { createTestDb, createTestApp } from "./fixtures";
import { seedTask, getTasks } from "./helpers";

describe("DELETE /tasks/:id - Integration Tests", () => {
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

  describe("Happy Path", () => {
    it("deletes existing task and returns 200", async () => {
      const task = await seedTask(app, "Task to delete");

      const response = await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("data");
      expect(body.data.id).toBe(task.id);
    });

    it("returns deleted task data in response", async () => {
      const task = await seedTask(app, "Task to delete");

      const response = await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const deleted = body.data;

      expect(deleted.id).toBe(task.id);
      expect(deleted.title).toBe("Task to delete");
      expect(deleted.isCompleted).toBe(false);
      expect(deleted.createdAt).toBe(task.createdAt);
    });

    it("returned task has correct structure", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const deleted = body.data;

      expect(deleted).toHaveProperty("id");
      expect(deleted).toHaveProperty("title");
      expect(deleted).toHaveProperty("isCompleted");
      expect(deleted).toHaveProperty("createdAt");

      expect(typeof deleted.id).toBe("number");
      expect(typeof deleted.title).toBe("string");
      expect(typeof deleted.isCompleted).toBe("boolean");
      expect(typeof deleted.createdAt).toBe("string");
    });

    it("only deleted task is removed", async () => {
      const task1 = await seedTask(app, "Keep this");
      const task2 = await seedTask(app, "Delete this");
      const task3 = await seedTask(app, "Keep this too");

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task2.id}`,
      });

      const remaining = await getTasks(app);

      expect(remaining).toHaveLength(2);
      expect(remaining.some((t: any) => t.id === task1.id)).toBe(true);
      expect(remaining.some((t: any) => t.id === task3.id)).toBe(true);
      expect(remaining.some((t: any) => t.id === task2.id)).toBe(false);
    });
  });

  describe("Deletion Verification", () => {
    it("deleted task no longer retrievable via GET list", async () => {
      const task = await seedTask(app, "Task to delete");

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });

      const tasks = await getTasks(app);

      expect(tasks.some((t: any) => t.id === task.id)).toBe(false);
    });

    it("task count decreases by 1 after deletion", async () => {
      await seedTask(app, "Task 1");
      await seedTask(app, "Task 2");
      const task3 = await seedTask(app, "Task 3");

      let tasks = await getTasks(app);
      const countBefore = tasks.length;

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task3.id}`,
      });

      tasks = await getTasks(app);
      const countAfter = tasks.length;

      expect(countAfter).toBe(countBefore - 1);
    });

    it("multiple deletions work correctly", async () => {
      const task1 = await seedTask(app, "Task 1");
      const task2 = await seedTask(app, "Task 2");
      const task3 = await seedTask(app, "Task 3");

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task1.id}`,
      });

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task3.id}`,
      });

      const remaining = await getTasks(app);

      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(task2.id);
    });
  });

  describe("Not Found Errors", () => {
    it("returns 404 for non-existent task id", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/tasks/9999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("error response has proper format", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/tasks/9999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);

      expect(body.error).toHaveProperty("code");
      expect(body.error).toHaveProperty("message");
      expect(typeof body.error.code).toBe("string");
      expect(typeof body.error.message).toBe("string");
      expect(body).not.toHaveProperty("data");
    });

    it("no other tasks deleted on 404", async () => {
      const task1 = await seedTask(app, "Task 1");
      const task2 = await seedTask(app, "Task 2");

      await app.inject({
        method: "DELETE",
        url: "/tasks/9999",
      });

      const tasks = await getTasks(app);

      expect(tasks).toHaveLength(2);
      expect(tasks.some((t: any) => t.id === task1.id)).toBe(true);
      expect(tasks.some((t: any) => t.id === task2.id)).toBe(true);
    });
  });

  describe("Parameter Validation", () => {
    it("rejects non-integer id with 400", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/tasks/not-a-number",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });

    it("rejects float id with 400", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/tasks/1.5",
      });

      expect(response.statusCode).toBe(400);
    });

    it("error response proper format for validation", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/tasks/invalid",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toHaveProperty("code");
      expect(body.error).toHaveProperty("message");
    });
  });

  describe("TOCTOU Guard (Time-of-Check-Time-of-Use)", () => {
    it("handles concurrent deletes of same task gracefully", async () => {
      const task = await seedTask(app, "Task");

      // Simulate concurrent deletes
      const [response1, response2] = await Promise.all([
        app.inject({
          method: "DELETE",
          url: `/tasks/${task.id}`,
        }),
        app.inject({
          method: "DELETE",
          url: `/tasks/${task.id}`,
        }),
      ]);

      // One should succeed, one should fail with 404
      const statuses = [response1.statusCode, response2.statusCode];
      expect(statuses.includes(200)).toBe(true);
      expect(statuses.includes(404)).toBe(true);

      // Verify task is actually deleted
      const tasks = await getTasks(app);
      expect(tasks.some((t: any) => t.id === task.id)).toBe(false);
    });

    it("second delete attempt after successful delete returns 404", async () => {
      const task = await seedTask(app, "Task");

      // First delete succeeds
      const response1 = await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });
      expect(response1.statusCode).toBe(200);

      // Second delete fails with 404
      const response2 = await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });
      expect(response2.statusCode).toBe(404);
    });

    it("returned data from successful delete is valid even with concurrent deletes", async () => {
      const task = await seedTask(app, "Task");

      let successData = null;

      const [response1, response2] = await Promise.all([
        app.inject({
          method: "DELETE",
          url: `/tasks/${task.id}`,
        }),
        app.inject({
          method: "DELETE",
          url: `/tasks/${task.id}`,
        }),
      ]);

      if (response1.statusCode === 200) {
        successData = JSON.parse(response1.payload).data;
      } else if (response2.statusCode === 200) {
        successData = JSON.parse(response2.payload).data;
      }

      // One should have succeeded
      expect(successData).not.toBeNull();
      expect(successData.id).toBe(task.id);
      expect(successData.title).toBe("Task");
    });
  });

  describe("Response Contract", () => {
    it("response includes only expected fields", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });

      const deleted = JSON.parse(response.payload).data;
      const expectedKeys = ["id", "title", "isCompleted", "createdAt"];

      expect(Object.keys(deleted).sort()).toEqual(expectedKeys.sort());
    });

    it("does not return error object on success", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "DELETE",
        url: `/tasks/${task.id}`,
      });

      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("data");
      expect(body).not.toHaveProperty("error");
    });
  });

  describe("Cascade & Constraints", () => {
    it("deleting one task does not affect others", async () => {
      const tasks = [];
      for (let i = 0; i < 5; i++) {
        tasks.push(await seedTask(app, `Task ${i}`));
      }

      // Delete middle task
      await app.inject({
        method: "DELETE",
        url: `/tasks/${tasks[2].id}`,
      });

      const remaining = await getTasks(app);

      expect(remaining).toHaveLength(4);
      expect(remaining.map((t: any) => t.id)).toEqual(
        expect.arrayContaining([
          tasks[0].id,
          tasks[1].id,
          tasks[3].id,
          tasks[4].id,
        ]),
      );
    });

    it("can recreate task with same title after deletion", async () => {
      const task1 = await seedTask(app, "Reusable title");

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task1.id}`,
      });

      const task2 = await seedTask(app, "Reusable title");

      expect(task2.id).not.toBe(task1.id);
      expect(task2.title).toBe(task1.title);
    });
  });

  describe("Performance", () => {
    it("deletes 100 tasks in < 2 seconds", async () => {
      const tasks = [];
      for (let i = 0; i < 100; i++) {
        tasks.push(await seedTask(app, `Task ${i}`));
      }

      const start = performance.now();

      for (const task of tasks) {
        await app.inject({
          method: "DELETE",
          url: `/tasks/${task.id}`,
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });

  describe("Idempotency & Safety", () => {
    it("deleting all tasks leaves empty list", async () => {
      const task1 = await seedTask(app, "Task 1");
      const task2 = await seedTask(app, "Task 2");
      const task3 = await seedTask(app, "Task 3");

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task1.id}`,
      });

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task2.id}`,
      });

      await app.inject({
        method: "DELETE",
        url: `/tasks/${task3.id}`,
      });

      const remaining = await getTasks(app);
      expect(remaining).toEqual([]);
    });
  });
});
```

### Step 2: Run Tests

```bash
cd backend
npm run test:integration -- delete-tasks.integration.test.ts
```

## Validation Checklist

- [ ] Test file created at `backend/test/delete-tasks.integration.test.ts`
- [ ] All 20+ tests pass with 100% success
- [ ] Happy path test passes
- [ ] Deleted task data returned correctly
- [ ] Deletion verification passes
- [ ] 404 not-found error test passes
- [ ] TOCTOU race condition test passes
- [ ] Parameter validation test passes
- [ ] Performance baseline met (< 2 seconds)
- [ ] Code review approved

## Success Criteria

✅ All acceptance criteria met  
✅ Deletion verified  
✅ TOCTOU guard validated  
✅ Error handling verified  
✅ Execution time < 2 seconds

---

**Next Steps:** Once this story is complete, Story 5-6 can validate all integration tests pass and generate coverage reports.
