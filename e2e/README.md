# bmad-todo E2E Testing Architecture (Playwright)

## Overview

This directory contains the Playwright End-to-End testing architecture for the `bmad-todo` React SPA + Fastify stack.

## Getting Started

Ensure you have run the following at the repository root before attempting to execute tests locally:

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

## Running Tests

### Headless execution (default)

```bash
npx playwright test
```

### Headed execution (debug visuals)

```bash
npx playwright test --headed
```

### UI Execution

```bash
npx playwright test --ui
```

## Best Practices & Determinism

- **Selectors**: Always rely on `getByTestId()` when possible to avoid React Query race conditions and UI rendering changes. Example: `page.getByTestId('task-input')`.
- **Axe-Core / A11y**: Utilize the `@axe-core/playwright` package in dedicated tests to assert our P1 keyboard/accessibility risks natively.
- **Fixture Overrides**: Avoid deeply nested test setups by utilizing the standard overrides in `support/fixtures/index.ts`. All test-data generation should funnel through `support/helpers/factories`.
- **Docker Dependency**: Nightly or Evaluation CI runs will expect these tests to run against a fully orchestrated `docker-compose` suite where the Fastify `/health` check acts as the block. Local runs rely on `BASE_URL=http://localhost:5173`.
