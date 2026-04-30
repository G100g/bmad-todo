import { FastifyInstance } from "fastify";

interface TaskRow {
  id: number;
  title: string;
  isCompleted: number;
  createdAt: string;
}

const mapTask = (row: TaskRow | undefined) => {
  if (!row) return row;
  return {
    ...row,
    isCompleted: Boolean(row.isCompleted),
  };
};

export default async function (fastify: FastifyInstance) {
  const db = fastify.db;
  fastify.get("/", async function (_request, reply) {
    const tasks = db
      .prepare(
        "SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks ORDER BY created_at ASC",
      )
      .all();
    reply.send({ data: tasks.map((t) => mapTask(t as TaskRow)) });
  });

  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 1, maxLength: 500 },
          },
          required: ["title"],
        },
      },
    },
    async function (request, reply) {
      const { title } = request.body as { title: string };
      const stmt = db.prepare("INSERT INTO tasks (title) VALUES (?)");
      const info = stmt.run(title);

      const newTask = db
        .prepare(
          "SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks WHERE id = ?",
        )
        .get(info.lastInsertRowid);

      if (!newTask) {
        reply.code(500).send({
          error: {
            code: "INSERT_FAILED",
            message: "Failed to retrieve created task",
          },
        });
        return;
      }

      reply.code(201).send({ data: mapTask(newTask as TaskRow) });
    },
  );

  fastify.patch(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "integer" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 1, maxLength: 500 },
            completed: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
    },
    async function (request, reply) {
      // ID 2: Missing authorization checks on PATCH
      // TODO: Implement user authentication and task ownership validation here
      const { id } = request.params as { id: number };
      const body = request.body as
        | { title?: string; completed?: boolean }
        | undefined;
      const title = body?.title;
      const completed = body?.completed;

      try {
        if (title !== undefined || completed !== undefined) {
          const updates: string[] = [];
          const values: any[] = [];

          if (title !== undefined) {
            updates.push("title = ?");
            values.push(title);
          }
          if (completed !== undefined) {
            updates.push("completed = ?");
            values.push(completed ? 1 : 0);
          }

          values.push(id);

          const result = db
            .prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`)
            .run(...values);

          if (result.changes === 0) {
            reply.code(404).send({
              error: { code: "NOT_FOUND", message: "Task not found" },
            });
            return;
          }
        }

        const updated = db
          .prepare(
            "SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks WHERE id = ?",
          )
          .get(id);

        if (!updated) {
          reply.code(404).send({
            error: {
              code: "NOT_FOUND",
              message: "Task not found",
            },
          });
          return;
        }

        reply.send({ data: mapTask(updated as TaskRow) });
      } catch (e: any) {
        // ID 11: Unhandled database errors in PATCH handler
        fastify.log.error(e);
        reply.code(500).send({
          error: {
            code: "DB_ERROR",
            message: "Internal server error during update",
          },
        });
      }
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "integer" } },
          required: ["id"],
        },
      },
    },
    async function (request, reply) {
      const { id } = request.params as { id: number };

      try {
        const taskToDelete = db
          .prepare(
            "SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks WHERE id = ?",
          )
          .get(id);

        if (!taskToDelete) {
          reply.code(404).send({
            error: {
              code: "NOT_FOUND",
              message: "Task not found",
            },
          });
          return;
        }

        // Map before DELETE so the response payload is captured before the row is gone
        const mappedTask = mapTask(taskToDelete as TaskRow);
        const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

        // TOCTOU guard: another request may have deleted the row between SELECT and DELETE
        if (result.changes === 0) {
          reply.code(404).send({
            error: {
              code: "NOT_FOUND",
              message: "Task not found",
            },
          });
          return;
        }

        reply.send({ data: mappedTask });
      } catch (e: any) {
        fastify.log.error(e);
        reply.code(500).send({
          error: {
            code: "DB_ERROR",
            message: "Internal server error during delete",
          },
        });
      }
    },
  );
}
