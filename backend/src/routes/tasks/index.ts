import { FastifyInstance } from "fastify";
import { db } from "../../db/index";

export default async function (fastify: FastifyInstance) {
  fastify.get("/", async function (_request, reply) {
    const tasks = db
      .prepare(
        "SELECT id, title, completed as isCompleted, created_at as createdAt FROM tasks ORDER BY created_at ASC",
      )
      .all();
    reply.send({ data: tasks });
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

      reply.code(201).send({ data: newTask });
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
          },
          additionalProperties: false,
        },
      },
    },
    async function (request, reply) {
      // ID 2: Missing authorization checks on PATCH
      // TODO: Implement user authentication and task ownership validation here
      const { id } = request.params as { id: number };
      const body = request.body as { title?: string } | undefined;
      const title = body?.title;

      try {
        if (title !== undefined) {
          const result = db
            .prepare("UPDATE tasks SET title = ? WHERE id = ?")
            .run(title, id);

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
          // ID 10: NULL returned after successful UPDATE (race condition / deleted task)
          reply.code(500).send({
            error: {
              code: "INTERNAL_ERROR",
              message: "Failed to fetch updated task",
            },
          });
          return;
        }

        reply.send({ data: updated });
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
}
