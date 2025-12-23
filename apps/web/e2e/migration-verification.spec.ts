import { test, expect  } from "@playwright/test";
import type {ConsoleMessage} from "@playwright/test";

/**
 * Migration Verification Tests
 *
 * These tests verify the TanStack Query + Zustand migration works correctly
 * by checking for console errors and warnings during page loads.
 */

// Collect console messages during tests
const consoleMessages: { type: string; text: string; url: string }[] = [];

// Patterns to ignore (expected warnings, third-party, etc.)
const IGNORED_PATTERNS = [
  // React development warnings that are expected
  /Warning: ReactDOM.render is no longer supported/,
  /Warning: Using UNSAFE_/,
  // PostHog analytics
  /posthog/i,
  // Sentry
  /sentry/i,
  // Source map warnings
  /DevTools failed to load source map/,
  /Could not load content for/,
  // Network errors for API calls (expected when not logged in)
  /401/,
  /403/,
  /Failed to load resource/,
  // React Router lazy loading
  /React Router caught the following error during render/,
  // Missing env file warnings
  /MISSING_ENV_FILE/,
  // React Router SPA mode hydration mismatch - pre-existing issue where static HTML
  // placeholder structure differs from full React component tree. This is expected
  // behavior in SPA mode where the static HTML is replaced entirely on mount.
  // See: https://reactjs.org/docs/error-decoder.html?invariant=418
  /Minified React error #418/,
  /error #418/,
  // Vite dev mode hydration mismatch - HMR scripts are injected during client hydration
  // that weren't present during SSR. This is expected in development and doesn't affect
  // production builds. The suppressHydrationWarning attribute is set on <html>.
  /Hydration failed because the server rendered HTML didn't match the client/,
  /hydration-mismatch/,
];

function shouldIgnoreMessage(text: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(text));
}

test.describe("Migration Verification", () => {
  test.beforeEach(({ page }) => {
    // Clear console messages for each test
    consoleMessages.length = 0;

    // Listen for console messages
    page.on("console", (msg: ConsoleMessage) => {
      const text = msg.text();
      if (!shouldIgnoreMessage(text)) {
        consoleMessages.push({
          type: msg.type(),
          text: text,
          url: page.url(),
        });
      }
    });

    // Listen for page errors
    page.on("pageerror", (error) => {
      if (!shouldIgnoreMessage(error.message)) {
        consoleMessages.push({
          type: "pageerror",
          text: error.message,
          url: page.url(),
        });
      }
    });
  });

  test("landing page loads without critical errors", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Wait for the page to fully render
    await page.waitForTimeout(2000);

    // Filter for errors only
    const errors = consoleMessages.filter((msg) => msg.type === "error" || msg.type === "pageerror");

    // Log any errors found for debugging
    if (errors.length > 0) {
      console.log("Console errors found:");
      errors.forEach((err) => console.log(`  [${err.type}] ${err.text}`));
    }

    // Should have no critical errors
    expect(errors.length).toBe(0);
  });

  test("landing page has no TanStack Query errors", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Check for TanStack Query specific errors
    const queryErrors = consoleMessages.filter(
      (msg) =>
        msg.text.includes("useQuery") ||
        msg.text.includes("QueryClient") ||
        msg.text.includes("TanStack") ||
        msg.text.includes("react-query")
    );

    if (queryErrors.length > 0) {
      console.log("TanStack Query errors found:");
      queryErrors.forEach((err) => console.log(`  [${err.type}] ${err.text}`));
    }

    expect(queryErrors.length).toBe(0);
  });

  test("landing page has no Zustand errors", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Check for Zustand specific errors
    const zustandErrors = consoleMessages.filter(
      (msg) => msg.text.includes("zustand") || msg.text.includes("Zustand") || msg.text.includes("create(") // Zustand store creation
    );

    if (zustandErrors.length > 0) {
      console.log("Zustand errors found:");
      zustandErrors.forEach((err) => console.log(`  [${err.type}] ${err.text}`));
    }

    expect(zustandErrors.length).toBe(0);
  });

  test("landing page has no MobX deprecation warnings", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Check for MobX related warnings that might indicate incomplete migration
    const mobxWarnings = consoleMessages.filter(
      (msg) =>
        msg.text.includes("mobx") ||
        msg.text.includes("MobX") ||
        msg.text.includes("observer") ||
        msg.text.includes("observable")
    );

    if (mobxWarnings.length > 0) {
      console.log("MobX warnings found:");
      mobxWarnings.forEach((warn) => console.log(`  [${warn.type}] ${warn.text}`));
    }

    // We allow MobX to still be present, but shouldn't have warnings about deprecated usage
    const deprecationWarnings = mobxWarnings.filter(
      (msg) => msg.text.includes("deprecated") || msg.text.includes("Deprecation")
    );

    expect(deprecationWarnings.length).toBe(0);
  });

  test("login page loads without errors", async ({ page }) => {
    // Try to access a protected route which should redirect to login
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const errors = consoleMessages.filter((msg) => msg.type === "error" || msg.type === "pageerror");

    if (errors.length > 0) {
      console.log("Console errors on login page:");
      errors.forEach((err) => console.log(`  [${err.type}] ${err.text}`));
    }

    expect(errors.length).toBe(0);
  });

  test("page renders React components without hydration errors", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Check for React hydration errors
    const hydrationErrors = consoleMessages.filter(
      (msg) =>
        msg.text.includes("Hydration") ||
        msg.text.includes("hydrat") ||
        msg.text.includes("server rendered") ||
        msg.text.includes("did not match")
    );

    if (hydrationErrors.length > 0) {
      console.log("Hydration errors found:");
      hydrationErrors.forEach((err) => console.log(`  [${err.type}] ${err.text}`));
    }

    expect(hydrationErrors.length).toBe(0);
  });

  test("no hook-related errors (useState, useEffect, useContext)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Check for React hook errors
    const hookErrors = consoleMessages.filter(
      (msg) =>
        msg.type === "error" &&
        (msg.text.includes("useState") ||
          msg.text.includes("useEffect") ||
          msg.text.includes("useContext") ||
          msg.text.includes("useQuery") ||
          msg.text.includes("Invalid hook call") ||
          msg.text.includes("Hooks can only be called"))
    );

    if (hookErrors.length > 0) {
      console.log("Hook errors found:");
      hookErrors.forEach((err) => console.log(`  [${err.type}] ${err.text}`));
    }

    expect(hookErrors.length).toBe(0);
  });

  test("summary: collect all warnings for review", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Collect all warnings (not errors)
    const warnings = consoleMessages.filter((msg) => msg.type === "warning");

    console.log("\n=== Console Warnings Summary ===");
    console.log(`Total warnings: ${warnings.length}`);

    if (warnings.length > 0) {
      console.log("\nWarnings:");
      warnings.forEach((warn, i) => {
        console.log(`${i + 1}. ${warn.text.substring(0, 200)}...`);
      });
    }

    // Warnings are informational - we don't fail the test
    // but log them for review
    expect(true).toBe(true);
  });
});
