import Database from "better-sqlite3";
import { FastifyInstance } from "fastify";
import fastify from "fastify";

/**
 * Create an in-memory test database with initialized schema
 * Each test gets its own isolated database instance
 *
 * @returns Promise resolving to a new in-memory Database instance
 */
export async function createTestDb(): Promise<Database.Database> {
  const db = new Database(":memory:");

  // Initialize schema for test database
  const createTasksTable = `
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.exec(createTasksTable);

  return db;
}

/**
 * Create a test Fastify app instance with isolated test database
 *
 * Strategy:
 * - Sets NODE_ENV=test to ensure in-memory database creation
 * - Imports app module which will use the test database
 * - Each test fixture setup clears the database
 * - Tests can run in parallel with proper isolation
 *
 * @param testDb Optional database instance (for future use)
 * @returns Promise resolving to a ready Fastify instance with test database
 */
export async function createTestApp(
  testDb?: Database.Database,
): Promise<FastifyInstance> {
  const db = testDb ?? (await createTestDb());
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const appPlugin = require("../dist/app").default;
  const app_instance = fastify({ logger: false });
  await app_instance.register(appPlugin, { db });
  await app_instance.ready();
  return app_instance;
}

/**
 * Clean up test database by removing all data
 * Called between tests to ensure isolation
 *
 * @param db Database instance to clean
 */
export async function cleanupDb(db: Database.Database): Promise<void> {
  try {
    db.exec("DELETE FROM tasks;");
  } catch (error) {
    // Database might already be closed, ignore
  }
}

/**
 * Close database connection properly
 * Called after each test to ensure no resource leaks
 *
 * @param db Database instance to close
 */
export async function closeTestDb(db: Database.Database): Promise<void> {
  try {
    db.close();
  } catch (error) {
    // Ignore if already closed
  }
}
