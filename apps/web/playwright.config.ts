import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

/**
 * Playwright Configuration
 *
 * Supports multiple test suites:
 * - smoke: Quick route loading tests (~2 min)
 * - e2e: Full E2E CRUD tests (~10 min)
 * - comprehensive: Everything including interactions
 *
 * @see https://playwright.dev/docs/test-configuration
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base URL from environment or default to localhost
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

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
  webServer: {
    command: "pnpm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3 minutes to start
    stdout: "pipe",
    stderr: "pipe",
  },

  // Output folders
  outputDir: "test-results/",
});
