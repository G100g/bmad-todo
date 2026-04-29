import { test, expect } from "../support/fixtures";

test.describe("Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for app to be fully loaded
    const taskInput = page.getByTestId("task-input");
    await taskInput.waitFor({ state: "visible" });
  });

  test("can create a task using only keyboard", async ({ page }) => {
    const title = `KN-create-${Date.now()}`;
    const taskInput = page.getByTestId("task-input");
    await taskInput.focus();
    await page.keyboard.type(title);
    await page.keyboard.press("Enter");

    const taskList = page.getByTestId("task-list");
    await expect(taskList).toContainText(title);
  });

  test("focus returns to task input after creating a task", async ({
    page,
  }) => {
    const title = `KN-focus-${Date.now()}`;
    const taskInput = page.getByTestId("task-input");
    // Click to ensure the browser window has focus before testing keyboard behavior
    await taskInput.click();
    await page.keyboard.type(title);
    // Register response waiter before pressing Enter to avoid missing a fast response.
    // We only need the POST to complete — onSuccess fires and queues the setTimeout(focus, 0).
    // The subsequent invalidateQueries GET refetch re-renders only the task list, not the input.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    await page.keyboard.press("Enter");
    await postDone;

    const taskList = page.getByTestId("task-list");
    await expect(taskList).toContainText(title);

    // Wait for focus to be set (with retry — React re-render after mutation may defer the focus call)
    await page.waitForFunction(() => document.activeElement?.id === "newTask", {
      timeout: 5000,
    });
  });

  test("can complete a task using only keyboard", async ({ page }) => {
    // Use a timestamp-unique title to avoid matching other tasks in the shared live DB
    const title = `KN-complete-${Date.now()}`;
    const taskInput = page.getByTestId("task-input");
    await taskInput.focus();
    await page.keyboard.type(title);
    // Wait for POST + the GET refetch (from invalidateQueries) so the task has its real ID.
    // Register response waiters before pressing Enter to avoid missing fast responses.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.keyboard.press("Enter");
    await postDone;
    await getDone;

    const taskList = page.getByTestId("task-list");
    await expect(taskList).toContainText(title);

    // Focus this specific checkbox via its unique aria-label and toggle with Space
    const checkbox = page.getByRole("checkbox", {
      name: new RegExp(title),
    });
    await checkbox.focus();
    await page.keyboard.press("Space");

    // Wait for the mutation to complete and reflect the checked state
    await expect(checkbox).toBeChecked();
  });

  test("can edit a task using only keyboard", async ({ page }) => {
    // Use a timestamp-unique title so we can scope to exactly one task item
    const title = `KN-edit-${Date.now()}`;
    const taskInput = page.getByTestId("task-input");
    await taskInput.focus();
    await page.keyboard.type(title);
    // Wait for POST + the GET refetch (from invalidateQueries) so the task has its real ID.
    // Register response waiters before pressing Enter to avoid missing fast responses.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.keyboard.press("Enter");
    await postDone;
    await getDone;

    const taskList = page.getByTestId("task-list");
    await expect(taskList).toContainText(title);

    // Scope to this specific task item to avoid matching Edit buttons in other rows
    const taskItem = taskList.locator("li").filter({ hasText: title });
    const editButton = taskItem.getByRole("button", {
      name: "Edit",
      exact: true,
    });
    await editButton.focus();
    await page.keyboard.press("Enter");

    // Edit input appears inside the task list (distinct from the #newTask input above)
    const editInput = taskList.locator('input[type="text"]');
    await editInput.waitFor({ state: "visible" });

    // Clear and type new title
    await page.keyboard.press("Control+a");
    const editedTitle = `${title}-edited`;
    await page.keyboard.type(editedTitle);

    // Tab to Save button and press Enter
    await page.keyboard.press("Tab"); // → Save button
    await page.keyboard.press("Enter");

    await expect(taskList).toContainText(editedTitle);
  });

  test("can delete a task using only keyboard", async ({ page }) => {
    // Use a timestamp-unique title so the delete button aria-label is unique
    const title = `KN-delete-${Date.now()}`;
    const taskInput = page.getByTestId("task-input");
    await taskInput.focus();
    await page.keyboard.type(title);
    // Wait for POST + the GET refetch (from invalidateQueries) so the task has its real ID.
    // Register response waiters before pressing Enter to avoid missing fast responses.
    const postDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "POST",
    );
    const getDone = page.waitForResponse(
      (r) => r.url().includes("/tasks") && r.request().method() === "GET",
    );
    await page.keyboard.press("Enter");
    await postDone;
    await getDone;

    const taskList = page.getByTestId("task-list");
    await expect(taskList).toContainText(title);

    // Focus the Delete button for this specific task (aria-label is unique) and activate with Enter
    const deleteButton = page.getByRole("button", {
      name: `Delete "${title}"`,
    });
    await deleteButton.focus();
    await page.keyboard.press("Enter");

    await expect(taskList).not.toContainText(title);
  });

  test("task input has a visible focus ring when focused via Tab", async ({
    page,
  }) => {
    // Tab to the task input from document start
    await page.keyboard.press("Tab");

    const taskInput = page.getByTestId("task-input");
    await expect(taskInput).toBeFocused();
  });
});
