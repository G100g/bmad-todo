---
storyCode: "5-3"
storyTitle: "Integration Tests for POST /tasks Endpoint"
epicCode: "EPIC-5"
epicTitle: "QA Integration Testing"
status: "ready-for-dev"
createdDate: "2026-04-30"

acceptance_criteria:
  - Test: Create task with valid title returns 201 with created task data
  - Test: Created task has auto-generated id, isCompleted=false, createdAt timestamp
  - Test: Response matches schema `{ "data": { id, title, isCompleted, createdAt } }`
  - Test: Empty title rejected with 400 validation error
  - Test: Title exceeding 500 chars rejected with 400 validation error
  - Test: Missing title property rejected with 400 validation error
  - Test: Additional properties in request body handled gracefully
  - Tests pass 100% and execute in < 2 seconds

acceptance_tests:
  - Verify POST /tasks with valid title returns 201
  - Verify response has correct structure and types
  - Verify created task has auto-generated id
  - Verify isCompleted defaults to false
  - Verify createdAt is set to current timestamp
  - Verify POST with empty string title returns 400
  - Verify POST with title > 500 chars returns 400
  - Verify POST with missing title returns 400
  - Verify POST with unknown properties is accepted (or properly rejected)

tasks:
  - Create test file backend/test/post-tasks.integration.test.ts
  - Implement happy path test (valid title)
  - Implement default values test (id, isCompleted, timestamp)
  - Implement response schema validation test
  - Implement validation error tests (empty, too long, missing)
  - Implement edge case tests (boundary conditions)
  - Verify all tests pass
  - Verify test execution time < 2 seconds

implementation_context: |
  POST /tasks creates new tasks and should validate input thoroughly.
  This story tests:
  1. Happy path: Valid title → 201 with full task object
  2. Default values: Auto-generated id, isCompleted=false, timestamp
  3. Validation: Title length constraints (1-500 chars)
  4. Error handling: 400 responses with proper error messages
  5. Edge cases: Empty strings, boundary values, extra properties

related_requirements:
  - Architecture: "API Response Format: RESTful endpoints with camelCase JSON payloads; responses wrapped in { "data": {...} } envelope"
  - Architecture: "API validation: Fastify Native JSON Schema with AJV"
  - Architecture: "Error responses: { "error": { "code": "...", "message": "..." } }. JSON payloads: camelCase"
  - Endpoint spec: "POST /tasks — Create new task, title required (1-500 chars), returns 201"

technical_notes: |
  **Request Body Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string", "minLength": 1, "maxLength": 500 }
    },
    "required": ["title"]
  }
  ```
  
  **Success Response (201):**
  ```json
  {
    "data": {
      "id": 123,
      "title": "Buy milk",
      "isCompleted": false,
      "createdAt": "2026-04-30T10:30:45.123Z"
    }
  }
  ```
  
  **Validation Error (400):**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "body/title must be string"
    }
  }
  ```

definition_of_done:
  - All acceptance criteria met
  - Test file created and passes 100%
  - Validation rules verified (length, required)
  - Error responses validated
  - Default values verified
  - Response schema validated
  - Execution time < 2 seconds
  - Code review passed

story_estimate: "2 hours"
priority: "high"
---

# Story 5-3: Integration Tests for POST /tasks Endpoint

## Goal

Write comprehensive integration tests for the POST /tasks endpoint that validate task creation, input validation, default values, and error handling with proper HTTP status codes and error response format.

## Context

POST /tasks creates new tasks and is critical for validating the create flow. This story tests:

- Happy path: Creating a task with valid title returns 201
- Default values: Auto-generated ID, isCompleted=false, createdAt timestamp
- Validation: Title must be 1-500 characters
- Error handling: Proper 400 responses for validation failures
- Edge cases: Empty strings, boundary conditions, extra properties

## Implementation Approach

### Step 1: Create Test File

Create `backend/test/post-tasks.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";
import { FastifyInstance } from "fastify";
import { createTestDb, createTestApp } from "./fixtures";

describe("POST /tasks - Integration Tests", () => {
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
    it("creates task with valid title and returns 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Buy milk" },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("data");
      expect(body.data.title).toBe("Buy milk");
    });

    it("returns correct response structure", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "New task" },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);

      const task = body.data;
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("isCompleted");
      expect(task).toHaveProperty("createdAt");
      expect(task).not.toHaveProperty("error");
    });
  });

  describe("Default Values", () => {
    it("auto-generates numeric id", async () => {
      const response1 = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "First" },
      });
      const task1 = JSON.parse(response1.payload).data;

      const response2 = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Second" },
      });
      const task2 = JSON.parse(response2.payload).data;

      expect(typeof task1.id).toBe("number");
      expect(typeof task2.id).toBe("number");
      expect(task1.id).not.toBe(task2.id);
      expect(task2.id).toBeGreaterThan(task1.id);
    });

    it("defaults isCompleted to false", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "New task" },
      });

      const task = JSON.parse(response.payload).data;
      expect(task.isCompleted).toBe(false);
      expect(typeof task.isCompleted).toBe("boolean");
    });

    it("sets createdAt to current timestamp", async () => {
      const beforeRequest = new Date();

      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Timestamped task" },
      });

      const afterRequest = new Date();
      const task = JSON.parse(response.payload).data;

      // Parse ISO 8601 timestamp
      const createdAt = new Date(task.createdAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeRequest.getTime(),
      );
      expect(createdAt.getTime()).toBeLessThanOrEqual(
        afterRequest.getTime() + 100,
      ); // Small buffer
    });

    it("createdAt is ISO 8601 formatted", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "ISO task" },
      });

      const task = JSON.parse(response.payload).data;
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

      expect(iso8601Regex.test(task.createdAt)).toBe(true);
      expect(() => new Date(task.createdAt)).not.toThrow();
    });
  });

  describe("Input Validation", () => {
    it("rejects empty title with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code");
      expect(body.error).toHaveProperty("message");
    });

    it("rejects title exceeding 500 characters with 400", async () => {
      const longTitle = "a".repeat(501);

      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: longTitle },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });

    it("accepts title at boundary (1 char)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "A" },
      });

      expect(response.statusCode).toBe(201);
      const task = JSON.parse(response.payload).data;
      expect(task.title).toBe("A");
    });

    it("accepts title at boundary (500 chars)", async () => {
      const maxTitle = "a".repeat(500);

      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: maxTitle },
      });

      expect(response.statusCode).toBe(201);
      const task = JSON.parse(response.payload).data;
      expect(task.title).toBe(maxTitle);
    });

    it("rejects missing title with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });

    it("rejects non-string title with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: 123 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });

    it("rejects null title with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: null },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body).toHaveProperty("error");
    });
  });

  describe("Additional Properties", () => {
    it("ignores extra properties in request", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: {
          title: "Task",
          extraField: "should be ignored",
          anotherField: 123,
        },
      });

      expect(response.statusCode).toBe(201);
      const task = JSON.parse(response.payload).data;
      expect(task).not.toHaveProperty("extraField");
      expect(task).not.toHaveProperty("anotherField");
    });

    it("does not include extra properties in response", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Task" },
      });

      const task = JSON.parse(response.payload).data;
      const expectedKeys = ["id", "title", "isCompleted", "createdAt"];

      expect(Object.keys(task).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe("Database Persistence", () => {
    it("persists task to database and retrieves it", async () => {
      const createResponse = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Persist test" },
      });

      const createdTask = JSON.parse(createResponse.payload).data;

      const listResponse = await app.inject({
        method: "GET",
        url: "/tasks",
      });

      const tasks = JSON.parse(listResponse.payload).data;
      const retrieved = tasks.find((t: any) => t.id === createdTask.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.title).toBe("Persist test");
      expect(retrieved.id).toBe(createdTask.id);
    });

    it("maintains unique ids across multiple creates", async () => {
      const ids = [];

      for (let i = 0; i < 10; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/tasks",
          payload: { title: `Task ${i}` },
        });

        const task = JSON.parse(response.payload).data;
        ids.push(task.id);
      }

      // All ids should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe("Error Response Format", () => {
    it("error responses follow contract", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);

      // Should have error object, not data
      expect(body).toHaveProperty("error");
      expect(body.error).toHaveProperty("code");
      expect(body.error).toHaveProperty("message");
      expect(typeof body.error.code).toBe("string");
      expect(typeof body.error.message).toBe("string");
      expect(body).not.toHaveProperty("data");
    });
  });

  describe("Performance", () => {
    it("creates 100 tasks in < 2 seconds", async () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        await app.inject({
          method: "POST",
          url: "/tasks",
          payload: { title: `Task ${i}` },
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
npm run test:integration -- post-tasks.integration.test.ts
```

## Validation Checklist

- [ ] Test file created at `backend/test/post-tasks.integration.test.ts`
- [ ] All 20+ tests pass with 100% success
- [ ] Happy path test passes
- [ ] Default values verified (id, isCompleted, createdAt)
- [ ] Validation tests pass (length constraints, required field)
- [ ] Boundary condition tests pass (1 char, 500 chars)
- [ ] Error response format validated
- [ ] Database persistence verified
- [ ] Performance baseline met (< 2 seconds)
- [ ] Code review approved

## Success Criteria

✅ All acceptance criteria met  
✅ Validation rules verified  
✅ Error responses properly formatted  
✅ Default values verified  
✅ Execution time < 2 seconds

---

**Next Steps:** Once this story is complete, Story 5-4 can begin testing the PATCH /tasks/:id (update) endpoint.
