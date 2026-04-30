import { join } from "node:path";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import Database from "better-sqlite3";
import { db as moduleDb, initDb } from "./db/index";

export interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
  db?: Database.Database;
}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  // Place here your custom code!
  const database = opts.db ?? moduleDb;
  initDb(database);
  fastify.decorate("db", database);
  await fastify.register(cors, {
    origin: corsOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"], // ID 1
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };

declare module "fastify" {
  interface FastifyInstance {
    db: Database.Database;
  }
}
