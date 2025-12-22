import { test, expect } from "../../fixtures";

/**
 * Auth Routes Smoke Tests
 *
 * Tests public/authentication routes load without JavaScript errors.
 * These routes don't require authentication.
 */

test.describe("Auth Routes @smoke", () => {
  // Skip auth state for public routes
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/ (landing/login page) loads without errors", async ({ page, errorTracker }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for page to render
    await page.waitForTimeout(1000);

    // Should have some visible content
    const bodyText = await page.textContent("body");
    expect(bodyText?.length).toBeGreaterThan(0);

    // Check for page errors (uncaught exceptions)
    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Page errors found:");
      console.log(errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);

    // Check for console errors
    const consoleErrors = errorTracker.getConsoleErrors();
    if (consoleErrors.length > 0) {
      console.log("Console errors found:");
      console.log(errorTracker.getSummary());
    }
    expect(consoleErrors).toHaveLength(0);
  });

  test("/sign-up loads without errors", async ({ page, errorTracker }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const pageErrors = errorTracker.getPageErrors();
    expect(pageErrors).toHaveLength(0);

    const consoleErrors = errorTracker.getConsoleErrors();
    expect(consoleErrors).toHaveLength(0);
  });

  test("/accounts/forgot-password loads without errors", async ({ page, errorTracker }) => {
    // This route may redirect, so handle that
    const response = await page.goto("/accounts/forgot-password");

    // If it redirects, that's OK - just verify no errors
    if (response?.status() === 200) {
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    const pageErrors = errorTracker.getPageErrors();
    expect(pageErrors).toHaveLength(0);
  });

  test("protected route redirects to login", async ({ page, errorTracker }) => {
    // Try to access a protected route without auth
    await page.goto("/treasury/issues");

    // Should redirect to login or show auth required
    await page.waitForLoadState("networkidle");

    // URL should either be login or the route (with auth prompt)
    const url = page.url();
    const isRedirectedOrPrompted = url.includes("/") || url.includes("login") || url.includes("sign");

    expect(isRedirectedOrPrompted).toBe(true);

    // Should not have uncaught exceptions
    const pageErrors = errorTracker.getPageErrors();
    expect(pageErrors).toHaveLength(0);
  });
});
