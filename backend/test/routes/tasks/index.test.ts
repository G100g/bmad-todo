import { test } from "tap";
import { build } from "../../helper";
import { clearDb } from "../../../src/db/index";

if (typeof clearDb !== "function") {
  throw new Error("clearDb is not imported correctly or is not a function");
}

test("creates a task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      title: "Do laundry",
    },
  });

  t.equal(res.statusCode, 201);
  const body = res.json();
  t.ok(body.data);
  t.equal(body.data.title, "Do laundry");
  t.equal(body.data.isCompleted, false);
  t.ok(body.data.id);
});

test("lists tasks when empty", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "GET",
    url: "/tasks",
  });

  t.equal(res.statusCode, 200);
  t.same(res.json(), { data: [] });
});

test("lists tasks after creating one", async (t) => {
  clearDb();
  const app = await build(t as any);

  await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Buy milk" },
  });

  const res = await app.inject({
    method: "GET",
    url: "/tasks",
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.length, 1);
  t.equal(body.data[0].title, "Buy milk");
  t.equal(body.data[0].isCompleted, false);
  t.ok(body.data[0].id);
  t.ok(body.data[0].createdAt);
});

test("lists multiple tasks in creation order", async (t) => {
  clearDb();
  const app = await build(t as any);

  await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "First" },
  });
  await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Second" },
  });

  const res = await app.inject({ method: "GET", url: "/tasks" });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.length, 2);
  t.equal(body.data[0].title, "First");
  t.equal(body.data[1].title, "Second");
});

test("updates task title", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Original title" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { title: "Updated title" },
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.title, "Updated title");
  t.equal(body.data.id, taskId);
  t.equal(body.data.isCompleted, false);
  t.ok(body.data.createdAt);
});

test("returns 404 when patching non-existent task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "PATCH",
    url: "/tasks/99999",
    payload: { title: "Ghost update" },
  });

  t.equal(res.statusCode, 404);
  const body = res.json();
  t.equal(body.error.code, "NOT_FOUND");
});

test("returns 200 when title is missing in patch (partial update semantics)", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "x" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: {},
  });

  t.equal(res.statusCode, 200);
});

test("returns 400 when title is empty string in patch", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "PATCH",
    url: "/tasks/1",
    payload: { title: "" },
  });

  t.equal(res.statusCode, 400);
});

test("returns 200 when updating with title exactly 500 chars", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "x" },
  });
  const taskId = create.json().data.id;
  const longTitle = "A".repeat(500);

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { title: longTitle },
  });

  t.equal(res.statusCode, 200);
  t.equal(res.json().data.title, longTitle);
});

test("returns 400 when updating with title exactly 501 chars", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "x" },
  });
  const taskId = create.json().data.id;
  const veryLongTitle = "A".repeat(501);

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { title: veryLongTitle },
  });

  t.equal(res.statusCode, 400);
});

test("prevents SQL injection on patch ID", async (t) => {
  clearDb();
  const app = await build(t as any);

  await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Secure task" },
  });

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/1; DROP TABLE tasks; --`,
    payload: { title: "hacked" },
  });

  t.equal(res.statusCode, 400, "Validation should catch non-integer ID");
});

test("does not update title if omitted in patch", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Keep me" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: {}, // Empty body, valid partial update
  });

  t.equal(res.statusCode, 200);
  t.equal(res.json().data.title, "Keep me");
});

test("marks task as completed", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task to complete" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { completed: true },
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.isCompleted, true);
  t.equal(body.data.title, "Task to complete"); // unchanged
  t.equal(body.data.id, taskId);
});

test("unmarks task as incomplete", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task to uncomplete" },
  });
  const taskId = create.json().data.id;

  // First, complete it
  await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { completed: true },
  });

  // Then uncomplete
  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { completed: false },
  });

  t.equal(res.statusCode, 200);
  t.equal(res.json().data.isCompleted, false);
});

test("returns 404 when completing non-existent task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "PATCH",
    url: "/tasks/99999",
    payload: { completed: true },
  });

  t.equal(res.statusCode, 404);
  t.equal(res.json().error.code, "NOT_FOUND");
});

test("can update both title and completed in one PATCH", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Original" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "PATCH",
    url: `/tasks/${taskId}`,
    payload: { title: "Renamed", completed: true },
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.title, "Renamed");
  t.equal(body.data.isCompleted, true);
});

test("returns 200 and deleted object when deleting an existing task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task to delete" },
  });
  const taskId = create.json().data.id;

  const res = await app.inject({
    method: "DELETE",
    url: `/tasks/${taskId}`,
  });

  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.title, "Task to delete");
  t.equal(body.data.id, taskId);
  t.equal(body.data.isCompleted, false);
  t.ok(body.data.createdAt);
});

test("deleted task no longer appears in GET /tasks", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task to vanish" },
  });
  const taskId = create.json().data.id;

  await app.inject({
    method: "DELETE",
    url: `/tasks/${taskId}`,
  });

  const res = await app.inject({ method: "GET", url: "/tasks" });
  t.equal(res.statusCode, 200);
  t.equal(res.json().data.length, 0);
});

test("returns 404 when deleting a non-existent task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "DELETE",
    url: "/tasks/99999",
  });

  t.equal(res.statusCode, 404);
  t.equal(res.json().error.code, "NOT_FOUND");
});

test("deleting one task does not remove other tasks", async (t) => {
  clearDb();
  const app = await build(t as any);

  await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task 1" },
  });

  const create2 = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task 2" },
  });
  const task2Id = create2.json().data.id;

  await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Task 3" },
  });

  await app.inject({
    method: "DELETE",
    url: `/tasks/${task2Id}`,
  });

  const res = await app.inject({ method: "GET", url: "/tasks" });
  t.equal(res.statusCode, 200);
  const body = res.json();
  t.equal(body.data.length, 2);
  t.equal(body.data[0].title, "Task 1");
  t.equal(body.data[1].title, "Task 3");
});

test("returns 400 when deleting with non-integer ID", async (t) => {
  clearDb();
  const app = await build(t as any);

  const res = await app.inject({
    method: "DELETE",
    url: "/tasks/abc",
  });

  t.equal(res.statusCode, 400);
});

test("returns 404 when deleting an already-deleted task", async (t) => {
  clearDb();
  const app = await build(t as any);

  const create = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Delete me twice" },
  });
  const taskId = create.json().data.id;

  await app.inject({
    method: "DELETE",
    url: `/tasks/${taskId}`,
  });

  const res = await app.inject({
    method: "DELETE",
    url: `/tasks/${taskId}`,
  });

  t.equal(res.statusCode, 404);
  t.equal(res.json().error.code, "NOT_FOUND");
});
