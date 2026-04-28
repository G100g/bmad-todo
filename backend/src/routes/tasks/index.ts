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
}
