import { test } from "tap";
import { build } from "../../helper";

test("creates a task", async (t) => {
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
