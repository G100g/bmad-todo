/**
 * Story 4.2: E2E Task Management Full Suite
 *
 * Covers explicit success lifecycle tests and API error interception tests
 * for create, edit, and delete operations.
 *
 * Patterns:
 * - Unique timestamp+random-suffixed titles per test to avoid shared-DB collisions.
 * - Row-scoped locators: taskList.locator("li").filter({ hasText: title }).
 * - Register waitForResponse BEFORE triggering the action that fires the request.
 * - Web-first assertions only (toBeVisible, toContainText, toHaveValue, toBeChecked).
 * - No page.waitForTimeout() calls.
 * - route interception is method-scoped; non-target methods continue normally.
 */
import { test, expect } from "../support/fixtures";

test.describe("Task Management Full Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Wait for network idle so the initial GET /tasks completes before each test.
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("task-input").waitFor({ state: "visible" });
  });

  // ---------------------------------------------------------------------------
  // Task 1: Explicit lifecycle success tests for create, edit, and delete
  // ---------------------------------------------------------------------------

  test("create: task appears in list after successful API round-trip", async ({
    page,
  }) => {
    const title = `FS-create-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const taskList = page.getByTestId("task-list");

    // Register waiters BEFORE the action that fires the request.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/tasks" &&
        r.request().method() === "GET",
    );

    await page.getByTestId("task-input").fill(title);
    await page.getByRole("button", { name: /add task/i }).click();
    const postRes = await postDone;
    expect(postRes.ok()).toBe(true);
    const getRes = await getDone;
    expect(getRes.ok()).toBe(true);

    await expect(taskList).toContainText(title);
  });

  test("edit: task title updates after successful API round-trip", async ({
    page,
  }) => {
    const title = `FS-edit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const editedTitle = `${title}-updated`;
    const taskList = page.getByTestId("task-list");

    // Create the task and wait for the full round-trip before editing.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/tasks" &&
        r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.getByRole("button", { name: /add task/i }).click();
    const postRes = await postDone;
    expect(postRes.ok()).toBe(true);
    const getRes = await getDone;
    expect(getRes.ok()).toBe(true);
    await expect(taskList).toContainText(title);

    // Edit the specific task row.
    const taskItem = taskList.locator("li").filter({ hasText: title });
    await taskItem.getByRole("button", { name: "Edit", exact: true }).click();

    // After clicking Edit the <li> replaces the text node with an input,
    // so use a taskList-scoped locator (not taskItem) to find the edit input.
    const editInput = taskList.locator('li input[type="text"]');
    await editInput.waitFor({ state: "visible" });
    await editInput.fill(editedTitle);

    // Register PATCH waiter before saving.
    const patchDone = page.waitForResponse(
      (r) => r.url().includes("/tasks/") && r.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const patchRes = await patchDone;
    expect(patchRes.ok()).toBe(true);

    await expect(taskList).toContainText(editedTitle);
  });

  test("delete: task is removed from list after successful API round-trip", async ({
    page,
  }) => {
    const title = `FS-delete-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const taskList = page.getByTestId("task-list");

    // Create and wait for full round-trip so the task has its real ID.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/tasks" &&
        r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.getByRole("button", { name: /add task/i }).click();
    const postRes = await postDone;
    expect(postRes.ok()).toBe(true);
    const getRes = await getDone;
    expect(getRes.ok()).toBe(true);
    await expect(taskList).toContainText(title);

    // Register DELETE waiter before clicking.
    const deleteDone = page.waitForResponse(
      (r) => r.url().includes("/tasks/") && r.request().method() === "DELETE",
    );
    const taskItem = taskList.locator("li").filter({ hasText: title });
    await taskItem.getByRole("button", { name: `Delete "${title}"` }).click();
    const deleteRes = await deleteDone;
    expect(deleteRes.ok()).toBe(true);

    await expect(taskList).not.toContainText(title);
  });

  // ---------------------------------------------------------------------------
  // Task 2: API error interception tests for create, edit, and delete
  // ---------------------------------------------------------------------------

  test("create error: shows toast and reverts list when POST fails", async ({
    page,
  }) => {
    const title = `FS-create-err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const taskList = page.getByTestId("task-list");

    await page.route("**/tasks", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "SERVER_ERROR", message: "Server error" },
          }),
        });
      } else {
        await route.continue();
      }
    });

    try {
      await page.getByTestId("task-input").fill(title);
      await page.getByRole("button", { name: /add task/i }).click();

      // Error toast must be visible.
      await expect(
        page.getByRole("alert").filter({ hasText: /failed to add task/i }),
      ).toBeVisible();

      // Task must not persist in the list after rollback.
      await expect(taskList).not.toContainText(title);
    } finally {
      await page.unrouteAll();
    }
  });

  test("edit error: shows toast and restores edit form when PATCH fails", async ({
    page,
  }) => {
    const title = `FS-edit-err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const editedTitle = `${title}-edited`;
    const taskList = page.getByTestId("task-list");

    // Create the task first and wait for full round-trip.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/tasks" &&
        r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.getByRole("button", { name: /add task/i }).click();
    const postRes = await postDone;
    expect(postRes.ok()).toBe(true);
    const getRes = await getDone;
    expect(getRes.ok()).toBe(true);
    await expect(taskList).toContainText(title);

    // Intercept PATCH to return a failure.
    await page.route("**/tasks/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "SERVER_ERROR", message: "Failed to update task" },
          }),
        });
      } else {
        await route.continue();
      }
    });

    try {
      const taskItem = taskList.locator("li").filter({ hasText: title });
      await taskItem.getByRole("button", { name: "Edit", exact: true }).click();

      // After clicking Edit the <li> replaces the text node with an input,
      // so use a taskList-scoped locator (not taskItem) to find the edit input.
      const editInput = taskList.locator('li input[type="text"]');
      await editInput.waitFor({ state: "visible" });
      await editInput.fill(editedTitle);
      await page.getByRole("button", { name: "Save", exact: true }).click();

      // Error toast must be visible.
      await expect(
        page.getByRole("alert").filter({ hasText: /failed to update task/i }),
      ).toBeVisible();

      // Edit form should be restored with the original title.
      await expect(taskList.locator('li input[type="text"]')).toHaveValue(
        title,
      );
      // Edited title must not appear in the list.
      await expect(taskList).not.toContainText(editedTitle);
    } finally {
      await page.unrouteAll();
    }
  });

  test("delete error: shows toast and restores task when DELETE fails", async ({
    page,
  }) => {
    const title = `FS-delete-err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const taskList = page.getByTestId("task-list");

    // Create the task first and wait for full round-trip.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/tasks" &&
        r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.getByRole("button", { name: /add task/i }).click();
    const postRes = await postDone;
    expect(postRes.ok()).toBe(true);
    const getRes = await getDone;
    expect(getRes.ok()).toBe(true);
    await expect(taskList).toContainText(title);

    // Intercept DELETE to return a failure.
    await page.route("**/tasks/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "SERVER_ERROR",
              message: "Failed to delete task",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    try {
      const taskItem = taskList.locator("li").filter({ hasText: title });
      await taskItem.getByRole("button", { name: `Delete "${title}"` }).click();

      // Error toast must be visible.
      await expect(
        page.getByRole("alert").filter({ hasText: /failed to delete task/i }),
      ).toBeVisible();

      // Task must be restored in the list after rollback.
      await expect(taskList).toContainText(title);
    } finally {
      await page.unrouteAll();
    }
  });
});
