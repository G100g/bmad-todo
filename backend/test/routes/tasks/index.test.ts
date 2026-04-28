import { test } from "tap";
import { build } from "../../helper";
import { clearDb } from "../../../src/db/index";

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
  t.equal(body.data.isCompleted, 0);
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
  t.equal(body.data[0].isCompleted, 0);
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
