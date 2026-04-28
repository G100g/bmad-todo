import { test as base } from "@playwright/test";

// Define custom fixtures here
export const test = base.extend<{
  // Add fixture types
}>({
  // Initialize fixtures
});

export { expect } from "@playwright/test";
