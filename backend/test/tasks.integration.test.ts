import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "better-sqlite3";
import { FastifyInstance } from "fastify";
import { createTestDb, createTestApp, closeTestDb } from "./fixtures";
import { seedTask, getTasks, updateTask, deleteTask } from "./helpers";

describe("Tasks API - Integration Tests", () => {
  let testDb: Database;
  let app: FastifyInstance;

  beforeEach(async () => {
    testDb = await createTestDb();
    app = await createTestApp(testDb);
  });

  afterEach(async () => {
    await app.close();
    await closeTestDb(testDb);
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

    it("includes all required task fields", async () => {
      await seedTask(app, "Test task");

      const tasks = await getTasks(app);
      expect(tasks[0]).toHaveProperty("id");
      expect(tasks[0]).toHaveProperty("title");
      expect(tasks[0]).toHaveProperty("isCompleted");
      expect(tasks[0]).toHaveProperty("createdAt");
    });
  });

  describe("POST /tasks", () => {
    it("creates a new task with given title", async () => {
      const task = await seedTask(app, "New task");

      expect(task.id).toBeDefined();
      expect(task.title).toBe("New task");
      expect(task.isCompleted).toBe(false);
    });

    it("initializes created tasks with isCompleted=false", async () => {
      const task = await seedTask(app, "Test");

      expect(task.isCompleted).toBe(false);
    });
  });

  describe("PATCH /tasks/:id", () => {
    it("updates task title", async () => {
      const created = await seedTask(app, "Original title");

      const updated = await updateTask(app, created.id, {
        title: "Updated title",
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe("Updated title");
    });

    it("updates task completed status", async () => {
      const created = await seedTask(app, "Task");

      const updated = await updateTask(app, created.id, { completed: true });

      expect(updated).not.toBeNull();
      expect(updated?.isCompleted).toBe(true);
    });

    it("returns null for non-existent task", async () => {
      const result = await updateTask(app, 99999, { title: "Updated" });

      expect(result).toBeNull();
    });
  });

  describe("DELETE /tasks/:id", () => {
    it("deletes an existing task", async () => {
      const created = await seedTask(app, "To delete");

      await deleteTask(app, created.id);

      // Verify task is deleted
      const remaining = await getTasks(app);
      expect(remaining).toHaveLength(0);
    });

    it("returns null when deleting non-existent task", async () => {
      const deleted = await deleteTask(app, 99999);

      expect(deleted).toBeNull();
    });
  });

  describe("Test Isolation", () => {
    it("test 1: creates a task", async () => {
      await seedTask(app, "Isolation test 1");
      const tasks = await getTasks(app);
      expect(tasks).toHaveLength(1);
    });

    // This test should start with empty database due to afterEach cleanup
    it("test 2: verifies database is clean", async () => {
      const tasks = await getTasks(app);
      expect(tasks).toHaveLength(0);
    });

    it("test 3: creates multiple tasks", async () => {
      await seedTask(app, "Task A");
      await seedTask(app, "Task B");
      const tasks = await getTasks(app);
      expect(tasks).toHaveLength(2);
    });
  });

  describe("Performance", () => {
    it("fixture initialization completes in < 500ms", async () => {
      const start = performance.now();

      const testDb2 = await createTestDb();
      const app2 = await createTestApp(testDb2);

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);

      await app2.close();
      await closeTestDb(testDb2);
    });

    it("test operations complete quickly", async () => {
      const start = performance.now();

      await seedTask(app, "Task 1");
      await seedTask(app, "Task 2");
      const tasks = await getTasks(app);
      await updateTask(app, tasks[0].id, { completed: true });
      await deleteTask(app, tasks[1].id);

      const elapsed = performance.now() - start;

      // Should complete in < 100ms per operation (fairly lenient for DB ops)
      expect(elapsed).toBeLessThan(500);
    });
  });
});
