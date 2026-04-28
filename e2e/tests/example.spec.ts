import { test, expect } from "../support/fixtures";
import { createTask } from "../support/helpers/factories";

test.describe("Task Management E2E", () => {
  test("should create a new task successfully", async ({ page }) => {
    // Navigate to application
    await page.goto("/");

    // Example of finding an element and interacting
    const taskInput = page.getByTestId("task-input");
    await taskInput.waitFor({ state: "visible" });

    const newTask = createTask({ title: "Finish Playwright Setup" });
    await taskInput.fill(newTask.title);
    await taskInput.press("Enter");

    // Example assertion
    const taskList = page.getByTestId("task-list");
    await expect(taskList).toContainText(newTask.title);
  });
});
