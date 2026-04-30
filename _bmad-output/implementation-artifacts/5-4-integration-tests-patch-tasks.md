---
storyCode: "5-4"
storyTitle: "Integration Tests for PATCH /tasks/:id Endpoint"
epicCode: "EPIC-5"
epicTitle: "QA Integration Testing"
status: "ready-for-dev"
createdDate: "2026-04-30"

acceptance_criteria:
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

acceptance_tests:
  - Verify PATCH /tasks/:id with valid title returns 200
  - Verify PATCH /tasks/:id with valid completed returns 200
  - Verify partial updates work (title only, completed only, both)
  - Verify empty PATCH body returns task unchanged
  - Verify title validation (1-500 chars)
  - Verify non-existent task id returns 404
  - Verify invalid id format returns 400
  - Verify error responses have proper format
  - Verify createdAt does not change on update

tasks:
  - Create test file backend/test/patch-tasks.integration.test.ts
  - Implement partial update tests (title, completed, both)
  - Implement empty update test
  - Implement title validation tests
  - Implement 404 not-found test
  - Implement 400 validation error tests
  - Implement error response format tests
  - Verify all tests pass
  - Verify test execution time < 2 seconds

implementation_context: |
  PATCH /tasks/:id updates tasks and is the most complex endpoint.
  This story tests:
  1. Partial updates: title only, completed only, both
  2. Empty updates: Body with no fields → returns unchanged
  3. Validation: Title length constraints
  4. Error handling: 400 validation, 404 not-found
  5. Data integrity: createdAt should not change, id immutable

related_requirements:
  - Architecture: "API Response Format: RESTful endpoints with camelCase JSON payloads"
  - Architecture: "Error responses: { "error": { "code": "...", "message": "..." } }"
  - Architecture: "API validation: Fastify Native JSON Schema with AJV"
  - Endpoint spec: "PATCH /tasks/:id — Update task (optional title, optional completed)"

technical_notes: |
  **Request Body Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string", "minLength": 1, "maxLength": 500 },
      "completed": { "type": "boolean" }
    },
    "additionalProperties": false
  }
  ```
  
  **Partial Update Patterns:**
  - { "title": "New title" } — Update title only
  - { "completed": true } — Update completed only
  - { "title": "New title", "completed": true } — Update both
  - {} — No changes, return existing task
  
  **Success Response (200):**
  ```json
  {
    "data": {
      "id": 123,
      "title": "Updated title",
      "isCompleted": true,
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
  - Partial update tests verified
  - Validation tests pass
  - 404/400 error handling verified
  - Error response format validated
  - Data integrity verified
  - Execution time < 2 seconds
  - Code review passed

story_estimate: "2.5 hours"
priority: "high"
---

# Story 5-4: Integration Tests for PATCH /tasks/:id Endpoint

## Goal

Write comprehensive integration tests for the PATCH /tasks/:id endpoint that validate partial updates, validation rules, error handling, and data integrity.

## Context

PATCH /tasks/:id is the most complex endpoint because it supports partial updates (title only, completed only, or both). This story tests:

- Happy path: Updating title, completed status, or both returns 200
- Partial updates: Can update one field independently
- Empty updates: Empty body returns task unchanged
- Validation: Title length constraints, parameter validation
- Error handling: 400 for validation errors, 404 for not-found, 500 for database errors
- Data integrity: createdAt should not change, id is immutable

## Implementation Approach

### Step 1: Create Test File

Create `backend/test/patch-tasks.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";
import { FastifyInstance } from "fastify";
import { createTestDb, createTestApp } from "./fixtures";
import { seedTask } from "./helpers";

describe("PATCH /tasks/:id - Integration Tests", () => {
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

  describe("Happy Path - Partial Updates", () => {
    it("updates title only and returns 200", async () => {
      const task = await seedTask(app, "Original title");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "Updated title" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.title).toBe("Updated title");
      expect(body.data.isCompleted).toBe(false); // Unchanged
      expect(body.data.id).toBe(task.id); // Unchanged
    });

    it("updates completed status only and returns 200", async () => {
      const task = await seedTask(app, "Task to complete");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { completed: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.isCompleted).toBe(true);
      expect(body.data.title).toBe("Task to complete"); // Unchanged
      expect(body.data.id).toBe(task.id); // Unchanged
    });

    it("updates both title and completed and returns 200", async () => {
      const task = await seedTask(app, "Original");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: {
          title: "Updated title",
          completed: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.title).toBe("Updated title");
      expect(body.data.isCompleted).toBe(true);
      expect(body.data.id).toBe(task.id);
    });

    it("returns correct response structure", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("id");
      expect(body.data).toHaveProperty("title");
      expect(body.data).toHaveProperty("isCompleted");
      expect(body.data).toHaveProperty("createdAt");
    });
  });

  describe("Empty Updates", () => {
    it("empty body returns task unchanged", async () => {
      const task = await seedTask(app, "Unchanged task");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.title).toBe("Unchanged task");
      expect(body.data.isCompleted).toBe(false);
      expect(body.data.id).toBe(task.id);
    });

    it("no update should not modify createdAt", async () => {
      const task = await seedTask(app, "Task");
      const originalCreatedAt = task.createdAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: {},
      });

      const updated = JSON.parse(response.payload).data;
      expect(updated.createdAt).toBe(originalCreatedAt);
    });
  });

  describe("Data Integrity", () => {
    it("id remains unchanged on update", async () => {
      const task = await seedTask(app, "Task");

      await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "Updated" },
      });

      // Get task from list
      const listResponse = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      const tasks = JSON.parse(listResponse.payload).data;
      const found = tasks.find((t: any) => t.id === task.id);

      expect(found.id).toBe(task.id);
    });

    it("createdAt does not change on update", async () => {
      const task = await seedTask(app, "Task");
      const originalCreatedAt = task.createdAt;

      // Wait to ensure time passes
      await new Promise((resolve) => setTimeout(resolve, 100));

      await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "Updated title" },
      });

      const listResponse = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      const tasks = JSON.parse(listResponse.payload).data;
      const found = tasks.find((t: any) => t.id === task.id);

      expect(found.createdAt).toBe(originalCreatedAt);
    });

    it("multiple updates preserve all original data", async () => {
      let task = await seedTask(app, "Original title");
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      // Update 1: Change title
      const update1 = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "Updated 1" },
      });
      task = JSON.parse(update1.payload).data;

      // Update 2: Change completed
      const update2 = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { completed: true },
      });
      task = JSON.parse(update2.payload).data;

      // Verify all properties
      expect(task.id).toBe(originalId);
      expect(task.createdAt).toBe(originalCreatedAt);
      expect(task.title).toBe("Updated 1");
      expect(task.isCompleted).toBe(true);
    });
  });

  describe("Title Validation", () => {
    it("updates title at boundary (1 char)", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "A" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.title).toBe("A");
    });

    it("updates title at boundary (500 chars)", async () => {
      const task = await seedTask(app, "Task");
      const maxTitle = "a".repeat(500);

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: maxTitle },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.title).toBe(maxTitle);
    });

    it("rejects empty title with 400", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });

    it("rejects title exceeding 500 chars with 400", async () => {
      const task = await seedTask(app, "Task");
      const longTitle = "a".repeat(501);

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: longTitle },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });

    it("rejects non-string title with 400", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: 123 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });
  });

  describe("Parameter Validation", () => {
    it("rejects non-integer id with 400", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/tasks/not-a-number",
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });

    it("rejects invalid id type (float)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/tasks/1.5",
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Not Found Errors", () => {
    it("returns 404 for non-existent task id", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/tasks/9999",
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("error response has proper format for 404", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/tasks/9999",
        payload: { title: "Updated" },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);

      expect(body.error).toHaveProperty("code");
      expect(body.error).toHaveProperty("message");
      expect(typeof body.error.code).toBe("string");
      expect(typeof body.error.message).toBe("string");
      expect(body).not.toHaveProperty("data");
    });

    it("original task unaffected when attempting to update non-existent task", async () => {
      const task = await seedTask(app, "Original");

      await app.inject({
        method: "PATCH",
        url: "/tasks/9999",
        payload: { title: "Updated" },
      });

      const listResponse = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      const tasks = JSON.parse(listResponse.payload).data;
      const found = tasks.find((t: any) => t.id === task.id);

      expect(found.title).toBe("Original");
    });
  });

  describe("Additional Properties", () => {
    it("rejects request with unknown properties with 400", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: {
          title: "Updated",
          unknownField: "value",
        },
      });

      // Should reject due to additionalProperties: false in schema
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Response Contract", () => {
    it("response includes only expected fields", async () => {
      const task = await seedTask(app, "Task");

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${task.id}`,
        payload: { title: "Updated" },
      });

      const updated = JSON.parse(response.payload).data;
      const expectedKeys = ["id", "title", "isCompleted", "createdAt"];

      expect(Object.keys(updated).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe("Concurrent Updates", () => {
    it("handles concurrent updates to same task", async () => {
      const task = await seedTask(app, "Task");

      const [response1, response2] = await Promise.all([
        app.inject({
          method: "PATCH",
          url: `/tasks/${task.id}`,
          payload: { title: "Update 1" },
        }),
        app.inject({
          method: "PATCH",
          url: `/tasks/${task.id}`,
          payload: { completed: true },
        }),
      ]);

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      const updated1 = JSON.parse(response1.payload).data;
      const updated2 = JSON.parse(response2.payload).data;

      // At least one update should have been applied
      expect(
        updated1.title === "Update 1" ||
          updated2.title === "Update 1" ||
          updated1.isCompleted === true ||
          updated2.isCompleted === true,
      ).toBe(true);
    });
  });

  describe("Performance", () => {
    it("updates 100 tasks in < 2 seconds", async () => {
      // Create 100 tasks
      const tasks = [];
      for (let i = 0; i < 100; i++) {
        const task = await seedTask(app, `Task ${i}`);
        tasks.push(task);
      }

      const start = performance.now();

      // Update all 100 tasks
      for (const task of tasks) {
        await app.inject({
          method: "PATCH",
          url: `/tasks/${task.id}`,
          payload: { title: "Updated" },
        });
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });
});
```

### Step 2: Run Tests

```bash
cd backend
npm run test:integration -- patch-tasks.integration.test.ts
```

## Validation Checklist

- [ ] Test file created at `backend/test/patch-tasks.integration.test.ts`
- [ ] All 25+ tests pass with 100% success
- [ ] Partial update tests pass
- [ ] Empty update test passes
- [ ] Data integrity tests pass (id/createdAt unchanged)
- [ ] Validation tests pass (title length)
- [ ] 404 not-found error test passes
- [ ] 400 validation error tests pass
- [ ] Error response format validated
- [ ] Performance baseline met (< 2 seconds)
- [ ] Code review approved

## Success Criteria

✅ All acceptance criteria met  
✅ Partial updates verified  
✅ Data integrity verified  
✅ Error handling validated  
✅ Execution time < 2 seconds

---

**Next Steps:** Once this story is complete, Story 5-5 can begin testing the DELETE /tasks/:id (delete) endpoint.
