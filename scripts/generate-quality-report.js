#!/usr/bin/env node
/**
 * Quality Report Generator
 * Orchestrates all quality checks: coverage, security, accessibility, and E2E.
 * Outputs reports to _bmad-output/qa-reports/
 *
 * Usage: npm run quality-report
 * Requires: Docker stack running for E2E and accessibility checks
 */

"use strict";

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "_bmad-output/qa-reports");
const COVERAGE_THRESHOLD = 70;

// ANSI colors for console output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const pass = (msg) => `${GREEN}✓${RESET} ${msg}`;
const fail = (msg) => `${RED}✗${RESET} ${msg}`;
const warn = (msg) => `${YELLOW}⚠${RESET} ${msg}`;
const bold = (msg) => `${BOLD}${msg}${RESET}`;

function run(cmd, cwd) {
  process.stdout.write(`  Running: ${cmd} ...`);
  const result = spawnSync(cmd, {
    shell: true,
    cwd: cwd || ROOT,
    encoding: "utf8",
    timeout: 300000,
  });
  const ok = result.status === 0;
  process.stdout.write(
    ok
      ? ` ${GREEN}done${RESET}\n`
      : ` ${YELLOW}finished (exit ${result.status})${RESET}\n`,
  );
  return {
    ok,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// ─── Task 1.5: Backend Integration Coverage ──────────────────────────────────
function runBackendIntegrationCoverage() {
  console.log(`\n${bold("[ Backend Integration Coverage ]")}`);
  const result = run(
    "npm run test:integration:coverage",
    path.join(ROOT, "backend"),
    "backend integration tests",
  );

  const summaryPath = path.join(
    ROOT,
    "backend/coverage-integration/coverage-summary.json",
  );
  if (!fs.existsSync(summaryPath)) {
    const report = {
      error: "coverage-summary.json not generated",
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "backend-integration-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `  ${fail("Could not read backend integration coverage data")}`,
    );
    return report;
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  } catch (e) {
    const report = {
      error: `Failed to parse backend integration coverage: ${e.message}`,
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "backend-integration-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `  ${fail("Failed to parse backend integration coverage data")}`,
    );
    return report;
  }
  const total = raw.total;
  if (!total) {
    const report = {
      error: "Invalid coverage data: missing total",
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "backend-integration-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `  ${fail("Invalid backend integration coverage data structure")}`,
    );
    return report;
  }

  const metrics = {
    lines: total.lines?.pct === "Unknown" ? 0 : (total.lines?.pct ?? 0),
    statements:
      total.statements?.pct === "Unknown" ? 0 : (total.statements?.pct ?? 0),
    functions:
      total.functions?.pct === "Unknown" ? 0 : (total.functions?.pct ?? 0),
    branches:
      total.branches?.pct === "Unknown" ? 0 : (total.branches?.pct ?? 0),
  };

  const belowThreshold = Object.entries(metrics)
    .filter(([, pct]) => pct < COVERAGE_THRESHOLD)
    .map(([k, pct]) => `${k}: ${pct}%`);

  const report = {
    timestamp: new Date().toISOString(),
    tool: "vitest + @vitest/coverage-v8",
    threshold: COVERAGE_THRESHOLD,
    passed: belowThreshold.length === 0 && result.ok,
    summary: {
      lines: metrics.lines,
      statements: metrics.statements,
      functions: metrics.functions,
      branches: metrics.branches,
    },
    testResult: {
      exitCode: result.status,
      testsPass: result.ok,
    },
    belowThreshold,
    files: Object.entries(raw)
      .filter(([k]) => k !== "total")
      .map(([file, data]) => ({
        file: file.replace(ROOT + "/", ""),
        lines: data.lines?.pct ?? null,
        statements: data.statements?.pct ?? null,
        functions: data.functions?.pct ?? null,
        branches: data.branches?.pct ?? null,
      })),
  };

  fs.writeFileSync(
    path.join(REPORTS_DIR, "backend-integration-coverage.json"),
    JSON.stringify(report, null, 2),
  );

  if (report.passed) {
    console.log(
      `  ${pass(`Backend integration coverage: lines ${metrics.lines}%, branches ${metrics.branches}% (≥${COVERAGE_THRESHOLD}% ✓)`)}`,
    );
  } else {
    belowThreshold.forEach((b) =>
      console.log(`  ${fail(`Below threshold: ${b}`)}`),
    );
    if (!result.ok)
      console.log(`  ${warn("Integration test failures detected")}`);
  }

  return report;
}

// ─── Task 1: Backend Unit Coverage ────────────────────────────────────────────────
function runBackendCoverage() {
  console.log(`\n${bold("[ Backend Coverage ]")}`);
  const result = run("npm test", path.join(ROOT, "backend"), "backend tests");

  const summaryPath = path.join(ROOT, "backend/coverage/coverage-summary.json");
  if (!fs.existsSync(summaryPath)) {
    const report = {
      error: "coverage-summary.json not generated",
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "backend-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(`  ${fail("Could not read backend coverage data")}`);
    return report;
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  } catch (e) {
    const report = {
      error: `Failed to parse backend coverage: ${e.message}`,
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "backend-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(`  ${fail("Failed to parse backend coverage data")}`);
    return report;
  }
  const total = raw.total;
  if (!total) {
    const report = {
      error: "Invalid coverage data: missing total",
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "backend-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(`  ${fail("Invalid backend coverage data structure")}`);
    return report;
  }

  const metrics = {
    lines: total.lines.pct,
    statements: total.statements.pct,
    functions: total.functions.pct,
    branches: total.branches.pct,
  };

  const belowThreshold = Object.entries(metrics)
    .filter(([, pct]) => pct < COVERAGE_THRESHOLD)
    .map(([k, pct]) => `${k}: ${pct}%`);

  const report = {
    timestamp: new Date().toISOString(),
    tool: "c8",
    threshold: COVERAGE_THRESHOLD,
    passed: belowThreshold.length === 0 && result.ok,
    summary: {
      lines: metrics.lines,
      statements: metrics.statements,
      functions: metrics.functions,
      branches: metrics.branches,
    },
    testResult: {
      exitCode: result.status,
      testsPass: result.ok,
    },
    belowThreshold,
    files: Object.entries(raw)
      .filter(([k]) => k !== "total")
      .map(([file, data]) => ({
        file: file.replace(ROOT + "/", ""),
        lines: data.lines?.pct ?? null,
        statements: data.statements?.pct ?? null,
        functions: data.functions?.pct ?? null,
        branches: data.branches?.pct ?? null,
      })),
  };

  fs.writeFileSync(
    path.join(REPORTS_DIR, "backend-coverage.json"),
    JSON.stringify(report, null, 2),
  );

  if (report.passed) {
    console.log(
      `  ${pass(`Backend coverage: lines ${metrics.lines}%, branches ${metrics.branches}% (≥${COVERAGE_THRESHOLD}% ✓)`)}`,
    );
  } else {
    belowThreshold.forEach((b) =>
      console.log(`  ${fail(`Below threshold: ${b}`)}`),
    );
    if (!result.ok) console.log(`  ${warn("Test failures detected")}`);
  }

  return report;
}

// ─── Task 2: Frontend Coverage ───────────────────────────────────────────────
function runFrontendCoverage() {
  console.log(`\n${bold("[ Frontend Coverage ]")}`);
  const result = run(
    "npm run test:coverage",
    path.join(ROOT, "frontend"),
    "frontend tests",
  );

  const summaryPath = path.join(
    ROOT,
    "frontend/coverage/coverage-summary.json",
  );
  if (!fs.existsSync(summaryPath)) {
    const report = {
      error: "coverage-summary.json not generated",
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "frontend-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(`  ${fail("Could not read frontend coverage data")}`);
    return report;
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  } catch (e) {
    const report = {
      error: `Failed to parse frontend coverage: ${e.message}`,
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "frontend-coverage.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(`  ${fail("Failed to parse frontend coverage data")}`);
    return report;
  }
  const total = raw.total;

  const metrics = {
    lines: typeof total.lines.pct === "number" ? total.lines.pct : 0,
    statements:
      typeof total.statements.pct === "number" ? total.statements.pct : 0,
    functions:
      typeof total.functions.pct === "number" ? total.functions.pct : 0,
    branches: typeof total.branches.pct === "number" ? total.branches.pct : 0,
  };

  const belowThreshold = Object.entries(metrics)
    .filter(([, pct]) => pct < COVERAGE_THRESHOLD)
    .map(([k, pct]) => `${k}: ${pct}%`);

  const report = {
    timestamp: new Date().toISOString(),
    tool: "vitest + @vitest/coverage-v8",
    threshold: COVERAGE_THRESHOLD,
    passed: belowThreshold.length === 0 && result.ok,
    note:
      belowThreshold.length > 0
        ? "App.tsx lacks unit tests; coverage reflects only tested components (Toaster). See docs/test-plan for expansion roadmap."
        : undefined,
    summary: metrics,
    testResult: {
      exitCode: result.status,
      testsPass: result.status === 0,
    },
    belowThreshold,
    files: Object.entries(raw)
      .filter(([k]) => k !== "total")
      .map(([file, data]) => ({
        file: file.replace(ROOT + "/", ""),
        lines: data.lines?.pct ?? null,
        statements: data.statements?.pct ?? null,
        functions: data.functions?.pct ?? null,
        branches: data.branches?.pct ?? null,
      })),
  };

  fs.writeFileSync(
    path.join(REPORTS_DIR, "frontend-coverage.json"),
    JSON.stringify(report, null, 2),
  );

  if (report.passed) {
    console.log(
      `  ${pass(`Frontend coverage: lines ${metrics.lines}%, branches ${metrics.branches}% (≥${COVERAGE_THRESHOLD}% ✓)`)}`,
    );
  } else {
    console.log(
      `  ${warn(`Frontend coverage below threshold (${metrics.lines}% lines, ${metrics.branches}% branches)`)}`,
    );
    console.log(
      `  ${warn("App.tsx not yet covered — see note in frontend-coverage.json")}`,
    );
  }

  return report;
}

// ─── Task 3: E2E Test Report ──────────────────────────────────────────────────
function parseE2EReport() {
  console.log(`\n${bold("[ E2E Test Report ]")}`);

  const xmlPath = path.join(ROOT, "e2e/playwright-report/results.xml");
  if (!fs.existsSync(xmlPath)) {
    const report = {
      error: "No E2E results found. Run: npm run test:e2e first.",
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "e2e-test-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `  ${warn("No E2E results found (run npm run test:e2e first)")}`,
    );
    return report;
  }

  const xml = fs.readFileSync(xmlPath, "utf8");

  // Parse testsuites attributes individually (order-independent)
  const getAttr = (attr) => {
    const m = xml.match(new RegExp(`<testsuites[^>]+${attr}="(\\d+)"`));
    return m ? parseInt(m[1]) : null;
  };
  const total = getAttr("tests");
  const failures = getAttr("failures");
  const skipped = getAttr("skipped");

  if (total === null || failures === null) {
    const report = {
      error: "Failed to parse E2E results XML — could not extract test counts",
      passed: false,
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "e2e-test-report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(`  ${fail("E2E results XML could not be parsed")}`);
    return report;
  }

  const passed = total - failures - (skipped ?? 0);

  // Parse individual suites
  const suiteMatches = [
    ...xml.matchAll(
      /<testsuite name="([^"]+)"[^>]+tests="(\d+)"[^>]+failures="(\d+)"/g,
    ),
  ];
  const suites = suiteMatches.map((m) => ({
    file: m[1],
    total: parseInt(m[2]),
    failures: parseInt(m[3]),
    passed: parseInt(m[2]) - parseInt(m[3]),
  }));

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Map test files to features covered
  const featureMap = {
    "example.spec.ts": ["FR1 - Create task"],
    "keyboard-navigation.spec.ts": [
      "FR6 - Keyboard navigation",
      "FR2 - View tasks",
      "FR3 - Edit tasks",
      "FR4 - Complete tasks",
      "FR5 - Delete tasks",
    ],
    "optimistic-updates.spec.ts": [
      "FR7 - Optimistic UI updates",
      "FR8 - Error feedback",
    ],
    "smoke.spec.ts": ["FR9 - Full stack health", "FR10 - Docker orchestration"],
  };

  const criticalFlowsCovered = suites.flatMap((s) => featureMap[s.file] || []);

  const report = {
    timestamp: new Date().toISOString(),
    tool: "Playwright",
    resultsFile: xmlPath.replace(ROOT + "/", ""),
    summary: {
      total,
      passed,
      failures,
      skipped,
      passRate: `${passRate}%`,
    },
    passed: failures === 0,
    suites,
    criticalFlowsCovered: [...new Set(criticalFlowsCovered)],
    note:
      failures > 0
        ? `${failures} test(s) failing — check playwright-report/index.html for details`
        : undefined,
  };

  fs.writeFileSync(
    path.join(REPORTS_DIR, "e2e-test-report.json"),
    JSON.stringify(report, null, 2),
  );

  if (report.passed) {
    console.log(
      `  ${pass(`E2E: ${passed}/${total} tests passing (${passRate}% pass rate)`)}`,
    );
  } else {
    console.log(
      `  ${warn(`E2E: ${passed}/${total} tests passing — ${failures} failure(s)`)}`,
    );
  }

  return report;
}

// ─── Task 4: Security Audit ───────────────────────────────────────────────────
function runSecurityAudit() {
  console.log(`\n${bold("[ Security Audit ]")}`);

  const contexts = [
    { name: "root", cwd: ROOT },
    { name: "backend", cwd: path.join(ROOT, "backend") },
    { name: "frontend", cwd: path.join(ROOT, "frontend") },
  ];

  const results = {};
  let totalCritical = 0;
  let totalHigh = 0;

  for (const ctx of contexts) {
    const result = spawnSync("npm audit --json", {
      shell: true,
      cwd: ctx.cwd,
      encoding: "utf8",
    });
    let auditData = {};
    try {
      auditData = JSON.parse(result.stdout || "{}");
    } catch {
      auditData = {
        error: "Failed to parse npm audit output",
        _parseFailed: true,
      };
    }

    const meta = auditData.metadata || {};
    const vulns = meta.vulnerabilities || {};
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;
    const moderate = vulns.moderate || 0;
    const low = vulns.low || 0;
    const info = vulns.info || 0;
    const total = vulns.total || critical + high + moderate + low + info;

    totalCritical += critical;
    totalHigh += high;

    results[ctx.name] = {
      exitCode: result.status,
      vulnerabilities: { critical, high, moderate, low, info, total },
      passed: !auditData._parseFailed && critical === 0 && high === 0,
    };

    const summary = `critical: ${critical}, high: ${high}, moderate: ${moderate}, low: ${low}`;
    if (critical === 0 && high === 0) {
      console.log(`  ${pass(`${ctx.name}: ${summary}`)}`);
    } else {
      console.log(
        `  ${fail(`${ctx.name}: ${summary} ← ZERO TOLERANCE VIOLATION`)}`,
      );
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    tool: "npm audit",
    policy:
      "Zero tolerance for Critical or High severity vulnerabilities (NFR7)",
    passed: totalCritical === 0 && totalHigh === 0,
    summary: {
      totalCritical,
      totalHigh,
      allContextsPassed: totalCritical === 0 && totalHigh === 0,
    },
    contexts: results,
  };

  fs.writeFileSync(
    path.join(REPORTS_DIR, "security-audit.json"),
    JSON.stringify(report, null, 2),
  );

  return report;
}

// ─── Task 5: Accessibility Audit ─────────────────────────────────────────────
function runAccessibilityAudit() {
  console.log(`\n${bold("[ Accessibility Audit ]")}`);

  // Check if app is accessible
  const checkResult = spawnSync(
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:5173",
    { shell: true, encoding: "utf8", timeout: 5000 },
  );
  const httpCode = checkResult.stdout.trim();

  if (httpCode !== "200") {
    const report = {
      timestamp: new Date().toISOString(),
      tool: "axe-core via Playwright",
      passed: false,
      skipped: true,
      reason:
        "Application not running at http://localhost:5173. Start Docker stack (npm run docker:up) and re-run.",
      summary: { violations: "N/A", passes: "N/A" },
    };
    fs.writeFileSync(
      path.join(REPORTS_DIR, "accessibility-audit.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `  ${warn("Skipped — app not running (start Docker stack and re-run)")}`,
    );
    return report;
  }

  // Purge stale report before running new test
  const reportPath = path.join(REPORTS_DIR, "accessibility-audit.json");
  if (fs.existsSync(reportPath)) {
    fs.unlinkSync(reportPath);
  }

  console.log(
    `  App running at http://localhost:5173, running axe-core audit...`,
  );
  const result = run(
    `npx playwright test e2e/tests/accessibility.spec.ts --config=e2e/playwright.config.ts --reporter=line`,
    ROOT,
    "accessibility tests",
  );

  // Read the report written by the accessibility spec
  if (fs.existsSync(reportPath)) {
    let report;
    try {
      report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    } catch (e) {
      const errReport = {
        error: `Failed to parse accessibility report: ${e.message}`,
        passed: false,
      };
      fs.writeFileSync(reportPath, JSON.stringify(errReport, null, 2));
      console.log(`  ${fail("Failed to parse accessibility audit report")}`);
      return errReport;
    }
    // Normalize: ensure top-level passed reflects summary.passed
    const passed = report.summary
      ? report.summary.passed
      : report.passed === true;
    const normalizedReport = { ...report, passed };
    if (normalizedReport.passed) {
      console.log(
        `  ${pass(`Accessibility: 0 violations, ${report.summary?.passes} checks passed`)}`,
      );
    } else if (report.summary) {
      console.log(
        `  ${fail(`Accessibility: ${report.summary.violations} violation(s) found`)}`,
      );
    }
    return normalizedReport;
  }

  // Fallback if spec didn't write report
  const fallback = {
    timestamp: new Date().toISOString(),
    tool: "axe-core via Playwright",
    passed: result.ok,
    exitCode: result.status,
    note: "Playwright test ran but no JSON report file was generated",
  };
  fs.writeFileSync(reportPath, JSON.stringify(fallback, null, 2));
  return fallback;
}

// ─── Task 6: Aggregate Report ─────────────────────────────────────────────────
function generateQualityReport(
  backend,
  backendIntegration,
  frontend,
  e2e,
  security,
  accessibility,
) {
  console.log(`\n${bold("[ Aggregating Quality Report ]")}`);

  const allPassed =
    backend.passed &&
    backendIntegration.passed &&
    frontend.passed &&
    e2e.passed &&
    security.passed &&
    accessibility.passed;

  const report = {
    timestamp: new Date().toISOString(),
    project: "bmad-todo",
    overallPassed: allPassed,
    summary: {
      backendCoverage: {
        passed: backend.passed,
        lines: backend.summary?.lines,
        branches: backend.summary?.branches,
      },
      backendIntegrationCoverage: {
        passed: backendIntegration.passed,
        lines: backendIntegration.summary?.lines,
        branches: backendIntegration.summary?.branches,
      },
      frontendCoverage: {
        passed: frontend.passed,
        lines: frontend.summary?.lines,
        branches: frontend.summary?.branches,
        note: frontend.note,
      },
      e2eTests: {
        passed: e2e.passed,
        passRate: e2e.summary?.passRate,
        total: e2e.summary?.total,
      },
      security: {
        passed: security.passed,
        totalCritical: security.summary?.totalCritical,
        totalHigh: security.summary?.totalHigh,
      },
      accessibility: {
        passed: accessibility.passed,
        skipped: accessibility.skipped,
        violations: accessibility.summary?.violations,
      },
    },
    reports: {
      backendCoverage: "_bmad-output/qa-reports/backend-coverage.json",
      backendIntegrationCoverage:
        "_bmad-output/qa-reports/backend-integration-coverage.json",
      frontendCoverage: "_bmad-output/qa-reports/frontend-coverage.json",
      e2eTests: "_bmad-output/qa-reports/e2e-test-report.json",
      security: "_bmad-output/qa-reports/security-audit.json",
      accessibility: "_bmad-output/qa-reports/accessibility-audit.json",
    },
  };

  fs.writeFileSync(
    path.join(REPORTS_DIR, "quality-report.json"),
    JSON.stringify(report, null, 2),
  );

  return report;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function printSummary(report) {
  const { summary } = report;
  const line = "─".repeat(55);

  console.log(`\n${bold(line)}`);
  console.log(`${bold("  QUALITY REPORT SUMMARY")}`);
  console.log(`${bold(line)}`);

  const checkMark = (passed, skipped) =>
    skipped
      ? `${YELLOW}SKIP${RESET}`
      : passed
        ? `${GREEN}PASS${RESET}`
        : `${RED}FAIL${RESET}`;

  console.log(
    `  Backend Unit Cov   [${checkMark(summary.backendCoverage.passed)}]  ` +
      `lines: ${summary.backendCoverage.lines ?? "N/A"}% | branches: ${summary.backendCoverage.branches ?? "N/A"}%`,
  );
  console.log(
    `  Backend Int Cov    [${checkMark(summary.backendIntegrationCoverage.passed)}]  ` +
      `lines: ${summary.backendIntegrationCoverage.lines ?? "N/A"}% | branches: ${summary.backendIntegrationCoverage.branches ?? "N/A"}%`,
  );
  console.log(
    `  Frontend Coverage  [${checkMark(summary.frontendCoverage.passed)}]  ` +
      `lines: ${summary.frontendCoverage.lines ?? "N/A"}% | branches: ${summary.frontendCoverage.branches ?? "N/A"}%`,
  );
  if (summary.frontendCoverage.note) {
    console.log(
      `                          ${YELLOW}Note: ${summary.frontendCoverage.note}${RESET}`,
    );
  }
  console.log(
    `  E2E Tests          [${checkMark(summary.e2eTests.passed)}]  ` +
      `pass rate: ${summary.e2eTests.passRate ?? "N/A"} (${summary.e2eTests.total ?? "N/A"} tests)`,
  );
  console.log(
    `  Security Audit     [${checkMark(summary.security.passed)}]  ` +
      `critical: ${summary.security.totalCritical ?? "N/A"} | high: ${summary.security.totalHigh ?? "N/A"}`,
  );
  console.log(
    `  Accessibility      [${checkMark(summary.accessibility.passed, summary.accessibility.skipped)}]  ` +
      `violations: ${summary.accessibility.violations ?? (summary.accessibility.skipped ? "N/A (app not running)" : "N/A")}`,
  );

  console.log(`${bold(line)}`);
  if (report.overallPassed) {
    console.log(`  ${GREEN}${BOLD}OVERALL: PASS${RESET}`);
  } else {
    console.log(
      `  ${RED}${BOLD}OVERALL: FAIL — see individual reports for details${RESET}`,
    );
  }
  console.log(`${bold(line)}`);
  console.log(`\n  Reports saved to: ${REPORTS_DIR}`);
  console.log(`  Full report: _bmad-output/qa-reports/quality-report.json\n`);
}

async function main() {
  console.log(
    `\n${bold("═══════════════════════════════════════════════════════")}`,
  );
  console.log(`${bold("  bmad-todo Quality Report Generator")}`);
  console.log(
    `${bold("═══════════════════════════════════════════════════════")}`,
  );
  console.log(`  Reports dir: ${REPORTS_DIR}`);

  ensureReportsDir();

  const backendIntegration = runBackendIntegrationCoverage();
  const backend = runBackendCoverage();
  const frontend = runFrontendCoverage();
  const e2e = parseE2EReport();
  const security = runSecurityAudit();
  const accessibility = runAccessibilityAudit();

  const report = generateQualityReport(
    backend,
    backendIntegration,
    frontend,
    e2e,
    security,
    accessibility,
  );
  printSummary(report);
  if (!report.overallPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Quality report generation failed:", err);
  process.exit(1);
});
