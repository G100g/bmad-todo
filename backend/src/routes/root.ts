import { type FastifyPluginAsync } from "fastify";
import { db } from "../db/index";

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/", async function (request, reply) {
    return { root: true };
  });

  fastify.get("/health", async function (request, reply) {
    try {
      db.prepare("SELECT 1").get();
      return { status: "ok" };
    } catch (e: any) {
      reply.code(503);
      return { status: "error", message: "Database not ready" };
    }
  });
};

export default root;
