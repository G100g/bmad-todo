import { FastifyInstance } from "fastify";

/**
 * Task interface matching the backend task model
 */
export interface Task {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

function parsePayload<T>(payload: string, context: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(
      `${context}: failed to parse response payload: ${payload.slice(0, 200)}`,
    );
  }
}

/**
 * Seed a task by making a POST request to the API
 * Useful for creating test data in integration tests
 *
 * @param app Fastify app instance
 * @param title Task title
 * @returns Promise resolving to the created Task
 */
export async function seedTask(
  app: FastifyInstance,
  title: string = "Test Task",
): Promise<Task> {
  const response = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title },
  });

  if (response.statusCode !== 201) {
    throw new Error(
      `Failed to seed task: ${response.statusCode} - ${response.payload}`,
    );
  }

  const json = parsePayload<{ data: Task }>(response.payload, "seedTask");
  return json.data;
}

/**
 * Fetch all tasks from the API
 *
 * @param app Fastify app instance
 * @returns Promise resolving to array of Tasks
 */
export async function getTasks(app: FastifyInstance): Promise<Task[]> {
  const response = await app.inject({
    method: "GET",
    url: "/tasks",
  });

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to get tasks: ${response.statusCode} - ${response.payload}`,
    );
  }

  const json = parsePayload<{ data: Task[] }>(response.payload, "getTasks");
  return json.data;
}

/**
 * Fetch a single task by ID from the API
 *
 * @param app Fastify app instance
 * @param id Task ID
 * @returns Promise resolving to Task or null if not found
 */
export async function getTask(
  app: FastifyInstance,
  id: number,
): Promise<Task | null> {
  const response = await app.inject({
    method: "GET",
    url: `/tasks/${id}`,
  });

  if (response.statusCode === 404) {
    return null;
  }

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to get task: ${response.statusCode} - ${response.payload}`,
    );
  }

  const json = parsePayload<{ data: Task }>(response.payload, "getTask");
  return json.data;
}

/**
 * Update a task with partial updates
 *
 * @param app Fastify app instance
 * @param id Task ID
 * @param updates Partial task updates (title and/or completed status)
 * @returns Promise resolving to updated Task or null if not found
 */
export async function updateTask(
  app: FastifyInstance,
  id: number,
  updates: Partial<{ title: string; completed: boolean }>,
): Promise<Task | null> {
  const response = await app.inject({
    method: "PATCH",
    url: `/tasks/${id}`,
    payload: updates,
  });

  if (response.statusCode === 404) {
    return null;
  }

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to update task: ${response.statusCode} - ${response.payload}`,
    );
  }

  const json = parsePayload<{ data: Task }>(response.payload, "updateTask");
  return json.data;
}

/**
 * Delete a task by ID
 *
 * @param app Fastify app instance
 * @param id Task ID
 * @returns Promise resolving to deleted Task or null if not found
 */
export async function deleteTask(
  app: FastifyInstance,
  id: number,
): Promise<Task | null> {
  const response = await app.inject({
    method: "DELETE",
    url: `/tasks/${id}`,
  });

  if (response.statusCode === 404) {
    return null;
  }

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to delete task: ${response.statusCode} - ${response.payload}`,
    );
  }

  const json = parsePayload<{ data: Task }>(response.payload, "deleteTask");
  return json.data;
}

/**
 * Verify task isolation between test runs
 * Run the same task multiple times to ensure no data leaks
 *
 * @param app Fastify app instance
 */
export async function verifyTaskIsolation(app: FastifyInstance): Promise<void> {
  const tasks1 = await getTasks(app);
  if (tasks1.length > 0) {
    throw new Error(
      `Task isolation check failed: Found ${tasks1.length} tasks but expected 0`,
    );
  }
}
