import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";

/**
 * Playwright Configuration
 *
 * IMPORTANT: Tests require the full application stack to be running.
 *
 * Run tests using the root-level scripts (recommended):
 *   pnpm test:e2e          # All tests (starts services automatically)
 *   pnpm test:e2e:headed   # Headed mode
 *   pnpm test:e2e:ui       # Playwright UI mode
 *   pnpm test:smoke        # Quick smoke tests only
 *
 * Or manually start services first, then run tests:
 *   1. pnpm dev            # Start all services (uses correct ports for this worktree)
 *   2. cd apps/web && npx playwright test
 *
 * WORKTREE ISOLATION: This config auto-reads from .dev-ports to ensure tests
 * run against THIS worktree's dev servers, not another worktree's servers.
 *
 * Supports multiple test suites:
 * - smoke: Quick route loading tests (~2 min)
 * - crud: Full E2E CRUD tests (~10 min)
 * - interactions: Component interaction tests
 * - comprehensive: Everything
 *
 * @see https://playwright.dev/docs/test-configuration
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the base URL for E2E tests, ensuring worktree isolation.
 *
 * Priority:
 * 1. E2E_BASE_URL environment variable (explicit override)
 * 2. Read from .dev-ports file (auto-detect this worktree's ports)
 * 3. Error - never silently default to port 3000 (could hit wrong worktree)
 */
function getBaseURL(): string {
  // 1. Check environment variable first
  if (process.env.E2E_BASE_URL) {
    return process.env.E2E_BASE_URL;
  }

  // 2. Try to read from .dev-ports file in project root
  const projectRoot = resolve(__dirname, "../..");
  const devPortsPath = resolve(projectRoot, ".dev-ports");

  if (existsSync(devPortsPath)) {
    const content = readFileSync(devPortsPath, "utf-8");
    const match = content.match(/^E2E_BASE_URL=(.+)$/m);
    if (match) {
      console.log(`[Playwright] Using E2E_BASE_URL from .dev-ports: ${match[1]}`);
      return match[1];
    }
  }

  // 3. No .dev-ports file - error out to prevent testing against wrong worktree
  throw new Error(
    `E2E_BASE_URL not set and no .dev-ports file found.\n\n` +
      `This prevents accidentally testing against another worktree's dev servers.\n\n` +
      `To fix:\n` +
      `  1. Start dev servers: pnpm dev\n` +
      `  2. Or run tests via: pnpm test:e2e\n` +
      `  3. Or set E2E_BASE_URL manually: E2E_BASE_URL=http://localhost:3000 npx playwright test`
  );
}

const baseURL = getBaseURL();

// Determine which tests to run based on environment
const testMatch = process.env.E2E_TEST_MATCH ?? "**/*.spec.ts";

export default defineConfig({
  testDir: "./e2e",

  // Test file patterns - can be overridden via E2E_TEST_MATCH
  testMatch,

  // Run tests in parallel
  fullyParallel: true,

  // Fail fast in CI
  forbidOnly: !!process.env.CI,

  // Retry on failure
  retries: process.env.CI ? 2 : 0,

  // Limit workers in CI for stability
  workers: process.env.CI ? 2 : undefined,

  // Reporters
  reporter: [
    ["list"], // Console output
    ["html", { open: "never" }], // HTML report
    ["json", { outputFile: "test-results/results.json" }], // JSON for CI
  ],

  // Global setup and teardown
  globalSetup: resolve(__dirname, "./e2e/global-setup.ts"),
  globalTeardown: resolve(__dirname, "./e2e/global-teardown.ts"),

  // Test timeout
  timeout: 60000, // 60 seconds per test

  // Expect timeout
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Shared settings for all projects
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",

    // Auth state storage
    storageState: "./e2e/.auth/user.json",
  },

  // Browser projects
  projects: [
    // Setup project - runs first to create auth state
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      teardown: "cleanup",
    },
    {
      name: "cleanup",
      testMatch: /global-teardown\.ts/,
    },

    // Smoke tests - quick route loading
    {
      name: "smoke",
      testMatch: "**/specs/smoke/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
    },

    // CRUD tests - full E2E flows
    {
      name: "crud",
      testMatch: "**/specs/crud/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
    },

    // Interaction tests - dropdowns, modals, etc.
    {
      name: "interactions",
      testMatch: "**/specs/interactions/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
    },

    // Default chromium project (runs all tests)
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["setup"],
    },

    // Mobile testing (optional)
    {
      name: "mobile",
      testMatch: "**/specs/**/*.spec.ts",
      use: {
        ...devices["iPhone 14"],
      },
      dependencies: ["setup"],
    },
  ],

  // Web server configuration
  // NOTE: When running via `pnpm test:e2e` from root, the test script
  // handles starting all services. When running Playwright directly,
  // you MUST run `pnpm dev:all` first to start the API server.
  //
  // The webServer is disabled because:
  // 1. Our test script starts all services (API + frontend)
  // 2. Playwright's webServer only starts frontend, not the API
  // 3. This prevents port conflicts when running tests
  //
  // To run tests:
  //   pnpm test:e2e           (recommended - handles everything)
  //   OR
  //   pnpm dev:all && cd apps/web && npx playwright test

  // Output folders
  outputDir: "test-results/",
});
