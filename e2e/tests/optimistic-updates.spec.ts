import { test, expect } from "../support/fixtures";

test.describe("Optimistic UI Updates and Error Feedback", () => {
  test.beforeEach(async ({ page }) => {
    // Wait for network idle so the initial GET /tasks is fully complete before any test runs.
    // Without this, cancelQueries in onMutate blocks waiting to abort the in-flight GET,
    // which delays the optimistic update and causes the timing assertions to fail.
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("task-input").waitFor({ state: "visible" });
  });

  test("task appears in list immediately on create without waiting for API", async ({
    page,
  }) => {
    const title = `OPT-instant-create-${Date.now()}`;
    const taskList = page.getByTestId("task-list");

    // Slow down POST by 3 seconds so the optimistic render is clearly before the API
    await page.route("**/tasks", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise<void>((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");

    // Must appear within 1500ms — well before the 3s API delay — proving optimistic update
    await expect(taskList).toContainText(title, { timeout: 1500 });
  });

  test("shows error toast and reverts list when create request fails", async ({
    page,
  }) => {
    const title = `OPT-create-err-${Date.now()}`;
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

    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");

    // Toast error notification should appear
    await expect(
      page.getByRole("alert").filter({ hasText: /failed to add task/i }),
    ).toBeVisible();

    // Task should not persist in list after revert
    await expect(taskList).not.toContainText(title);
  });

  test("task is removed from list immediately on delete without waiting for API", async ({
    page,
  }) => {
    const title = `OPT-instant-delete-${Date.now()}`;
    const taskList = page.getByTestId("task-list");

    // Create the task normally first and wait for POST + GET refetch so the task has its real ID
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");
    await postDone;
    await getDone;
    await expect(taskList).toContainText(title);

    // Slow down DELETE by 3 seconds
    await page.route("**/tasks/**", async (route) => {
      if (route.request().method() === "DELETE") {
        await new Promise<void>((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.getByRole("button", { name: `Delete "${title}"` }).click();

    // Must disappear within 1500ms — well before the 3s API delay — proving optimistic removal
    await expect(taskList).not.toContainText(title, { timeout: 1500 });
  });

  test("shows error toast and restores task when delete request fails", async ({
    page,
  }) => {
    const title = `OPT-delete-err-${Date.now()}`;
    const taskList = page.getByTestId("task-list");

    // Create the task normally first and wait for POST + GET refetch so the task has its real ID
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");
    await postDone;
    await getDone;
    await expect(taskList).toContainText(title);

    // Fail DELETE requests
    await page.route("**/tasks/**", async (route) => {
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

    await page.getByRole("button", { name: `Delete "${title}"` }).click();

    // Error toast should appear
    await expect(
      page.getByRole("alert").filter({ hasText: /failed to delete task/i }),
    ).toBeVisible();

    // Task should be restored in the list after revert
    await expect(taskList).toContainText(title);
  });

  test("task title updates immediately on edit without waiting for API", async ({
    page,
  }) => {
    const title = `OPT-instant-edit-${Date.now()}`;
    const editedTitle = `${title}-edited`;
    const taskList = page.getByTestId("task-list");

    const createPostDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const createGetDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");
    await createPostDone;
    await createGetDone;
    await expect(taskList).toContainText(title);

    await page.route("**/tasks/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise<void>((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    const taskItem = taskList.locator("li").filter({ hasText: title });
    await taskItem.getByRole("button", { name: "Edit", exact: true }).click();
    const editInput = taskList.locator('li input[type="text"]');
    await editInput.waitFor({ state: "visible" });
    await editInput.fill(editedTitle);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(taskList).toContainText(editedTitle, { timeout: 1500 });
  });

  test("shows error toast and restores task title when edit request fails", async ({
    page,
  }) => {
    const title = `OPT-edit-err-${Date.now()}`;
    const editedTitle = `${title}-edited`;
    const taskList = page.getByTestId("task-list");

    const createPostDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const createGetDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");
    await createPostDone;
    await createGetDone;
    await expect(taskList).toContainText(title);

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

    const taskItem = taskList.locator("li").filter({ hasText: title });
    await taskItem.getByRole("button", { name: "Edit", exact: true }).click();
    const editInput = taskList.locator('li input[type="text"]');
    await editInput.waitFor({ state: "visible" });
    await editInput.fill(editedTitle);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: /failed to update task/i }),
    ).toBeVisible();
    await expect(taskList.locator('li input[type="text"]')).toHaveValue(title);
    await expect(taskList).not.toContainText(editedTitle);
  });

  test("task completion toggles immediately without waiting for API", async ({
    page,
  }) => {
    const title = `OPT-instant-complete-${Date.now()}`;
    const taskList = page.getByTestId("task-list");

    const createPostDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const createGetDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");
    await createPostDone;
    await createGetDone;

    await page.route("**/tasks/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise<void>((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    const checkbox = page.getByRole("checkbox", { name: new RegExp(title) });
    await checkbox.click();
    await expect(checkbox).toBeChecked({ timeout: 1500 });
  });

  test("shows error toast and restores completion state when toggle request fails", async ({
    page,
  }) => {
    const title = `OPT-complete-err-${Date.now()}`;

    const createPostDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const createGetDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.getByTestId("task-input").fill(title);
    await page.keyboard.press("Enter");
    await createPostDone;
    await createGetDone;

    await page.route("**/tasks/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "SERVER_ERROR",
              message: "Failed to update task status",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    const checkbox = page.getByRole("checkbox", { name: new RegExp(title) });
    await checkbox.click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: /failed to update task status/i }),
    ).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });
});
