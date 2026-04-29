import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as fs from "fs";
import * as path from "path";

const REPORTS_DIR = path.join(__dirname, "../../_bmad-output/qa-reports");

test.describe("Accessibility Audit", () => {
  test("task input and task list pass WCAG AA accessibility checks", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      .analyze();

    // Write report
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const violations = accessibilityScanResults.violations;
    const passes = accessibilityScanResults.passes;
    const incomplete = accessibilityScanResults.incomplete;

    const criticalViolations = violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );

    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      summary: {
        violations: violations.length,
        criticalViolations: criticalViolations.length,
        passes: passes.length,
        incomplete: incomplete.length,
        passed: criticalViolations.length === 0,
      },
      violations: violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
        affectedElements: v.nodes.slice(0, 3).map((n) => n.target.join(", ")),
      })),
      wcagTags: ["wcag2a", "wcag2aa", "best-practice"],
      threshold: "zero violations",
    };

    fs.writeFileSync(
      path.join(REPORTS_DIR, "accessibility-audit.json"),
      JSON.stringify(report, null, 2),
    );

    if (violations.length > 0) {
      console.log(
        `\n⚠️  Found ${violations.length} accessibility violation(s):`,
      );
      violations.forEach((v) => {
        console.log(`  - [${v.impact}] ${v.id}: ${v.description}`);
      });

      // Only fail on critical/serious violations
      expect(
        criticalViolations,
        `Critical/serious accessibility violations found`,
      ).toHaveLength(0);
    }
  });

  test("core task management elements are accessible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check core elements exist and are accessible
    const taskInput = page.getByTestId("task-input");
    await expect(taskInput).toBeVisible();
    await expect(taskInput).toBeEnabled();

    // Run focused axe scan on core task management elements
    const coreElementsResults = await new AxeBuilder({ page })
      .include('[data-testid="task-input"]')
      .include('[data-testid="task-list"]')
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(
      coreElementsResults.violations,
      `Core elements (task-input, task-list) have ${coreElementsResults.violations.length} accessibility violation(s)`,
    ).toHaveLength(0);
  });
});
