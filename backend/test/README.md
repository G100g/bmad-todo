# Integration Test Framework

This directory contains the integration test infrastructure for the bmad-todo backend. Tests are written in TypeScript using Vitest and test the API endpoints using in-memory SQLite databases for fast, isolated test execution.

## Quick Start

### Run all integration tests

```bash
npm run test:integration
```

### Run tests in watch mode (re-run on file changes)

```bash
npm run test:integration:watch
```

### Run tests with UI dashboard

```bash
npm run test:integration:ui
```

### Generate coverage report

```bash
npm run test:integration:coverage
```

## File Structure

```
test/
├── setup.ts                     # Global test setup (beforeEach/afterEach hooks)
├── fixtures.ts                  # Database and app factory functions
├── helpers.ts                   # Helper utilities for API testing
├── tasks.integration.test.ts    # Sample integration tests
└── README.md                    # This file
```

## Writing Integration Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FastifyInstance } from "fastify";
import { createTestDb, createTestApp, closeTestDb } from "./fixtures";
import { seedTask, getTasks } from "./helpers";

describe("My API Tests", () => {
  let app: FastifyInstance;
  let testDb: any;

  beforeEach(async () => {
    testDb = await createTestDb();
    app = await createTestApp(testDb);
  });

  afterEach(async () => {
    await app.close();
    await closeTestDb(testDb);
  });

  it("should create a task", async () => {
    const task = await seedTask(app, "My task");
    expect(task.id).toBeDefined();
    expect(task.title).toBe("My task");
  });
});
```

## Available Fixtures

### `createTestDb(): Promise<Database>`

Creates a new in-memory SQLite database with the tasks schema pre-initialized.

```typescript
const db = await createTestDb();
```

### `createTestApp(testDb?): Promise<FastifyInstance>`

Creates a Fastify app instance configured for testing. Uses the global database if no database is provided.

```typescript
const app = await createTestApp(testDb);
```

### `cleanupDb(db): Promise<void>`

Clears all data from the test database.

```typescript
await cleanupDb(db);
```

### `closeTestDb(db): Promise<void>`

Properly closes the database connection and cleans up resources.

```typescript
await closeTestDb(db);
```

## Available Helper Utilities

### `seedTask(app, title): Promise<Task>`

Creates a task via the POST /tasks endpoint.

```typescript
const task = await seedTask(app, "Buy groceries");
// Returns: { id: 1, title: "Buy groceries", isCompleted: false, createdAt: "..." }
```

### `getTasks(app): Promise<Task[]>`

Fetches all tasks via GET /tasks endpoint.

```typescript
const tasks = await getTasks(app);
```

### `getTask(app, id): Promise<Task>`

Fetches a single task by ID via GET /tasks/:id endpoint.

```typescript
const task = await getTask(app, 1);
```

### `updateTask(app, id, updates): Promise<Task | null>`

Updates a task via PATCH /tasks/:id endpoint.

```typescript
const updated = await updateTask(app, 1, {
  title: "Updated title",
  completed: true,
});
```

### `deleteTask(app, id): Promise<Task | null>`

Deletes a task via DELETE /tasks/:id endpoint.

```typescript
const deleted = await deleteTask(app, 1);
```

## Database Isolation

Each test automatically gets a clean database:

1. **beforeEach hook**: Clears all tasks from the database
2. **afterEach hook**: Closes database connection

This ensures tests don't interfere with each other.

## Performance Characteristics

- **Fixture initialization**: ~10-20ms per test
- **Database operations**: <10ms per operation
- **Full test suite**: ~500ms for 17 tests
- **All operations**: < 500ms per test (requirement met)

## Troubleshooting

### "Task not found" errors in getTask

This typically indicates a task ID is being reused. Ensure your test creates a fresh task with seedTask().

### Tests failing intermittently

If you see intermittent failures:

1. Check for shared state between tests
2. Verify beforeEach/afterEach hooks are running
3. Increase test timeout if operations are slow

### Database lock errors

If you see database lock errors:

1. Ensure all database connections are properly closed in afterEach
2. Check that no long-running queries exist
3. Verify closeTestDb() is being called

## Best Practices

1. **Always use fixtures**: Never create the database or app manually
2. **Use helpers for API calls**: Never call inject() directly except in test setup
3. **One assertion per test concept**: Keep tests focused
4. **Clear naming**: Test names should describe what they test
5. **Arrange-Act-Assert**: Structure tests with setup, action, verification

## Example: Complete Test

```typescript
it("creates and updates a task", async () => {
  // Arrange
  const originalTask = await seedTask(app, "Original title");

  // Act
  const updated = await updateTask(app, originalTask.id, {
    title: "New title",
    completed: true,
  });

  // Assert
  expect(updated?.title).toBe("New title");
  expect(updated?.isCompleted).toBe(true);
});
```

## Next Steps

After this infrastructure is in place, subsequent integration test stories will:

- Story 5-2: Write tests for GET /tasks endpoint
- Story 5-3: Write tests for POST /tasks endpoint
- Story 5-4: Write tests for PATCH /tasks endpoint
- Story 5-5: Write tests for DELETE /tasks endpoint
- Story 5-6: Validate complete test suite

All of these stories will use the fixtures and helpers documented here.
