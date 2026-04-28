import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// In-memory strictly for test environments if needed, otherwise local file
const dbPath =
  process.env.NODE_ENV === "test"
    ? ":memory:"
    : path.resolve(__dirname, "../../../data/todo.db");

// Ensure the data directory exists
if (process.env.NODE_ENV !== "test") {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

export const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV !== "production" ? console.log : undefined,
});
db.pragma("journal_mode = WAL");

// Simple initialization script
export const initDb = () => {
  const createTasksTable = `
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.exec(createTasksTable);
};

/** Test-only helper: truncate all tables to ensure isolation between test cases. */
export const clearDb = () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("clearDb must not be called in production");
  }
  db.exec("DELETE FROM tasks");
};
