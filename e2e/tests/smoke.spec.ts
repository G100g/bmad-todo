import { test, expect } from "../support/fixtures";

test.describe("Smoke test — full stack", () => {
  test("app loads and task input is visible", async ({ page }) => {
    await page.goto("/");

    const taskInput = page.getByTestId("task-input");
    await expect(taskInput).toBeVisible();

    const taskList = page.getByTestId("task-list");
    await expect(taskList).toBeVisible();

    await expect(page).toHaveTitle(/Todo|Frontend|App/i);
  });
});
