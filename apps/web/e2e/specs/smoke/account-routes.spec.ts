import { test as base, expect } from "@playwright/test";
import { ErrorTracker } from "../../fixtures/error-tracker";

/**
 * Account Routes Smoke Tests
 *
 * Tests account-related pages load without JavaScript errors.
 * These are public/unauthenticated routes for password reset, etc.
 */

// Create a test fixture without auth for these public routes
const test = base.extend<{ errorTracker: ErrorTracker }>({
  storageState: { cookies: [], origins: [] }, // No auth state
  errorTracker: async ({ page }, use) => {
    const tracker = new ErrorTracker();
    tracker.attach(page);
    await use(tracker);
  },
});

test.describe("Account Routes @smoke", () => {
  test("/accounts/reset-password loads without errors", async ({
    page,
    errorTracker,
  }) => {
    // This page typically requires a token, but should load the form without errors
    await page.goto("/accounts/reset-password");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out expected 4xx errors for missing/invalid tokens
    const pageErrors = errorTracker.getPageErrors().filter(
      (error) => !error.message.includes("400") && !error.message.includes("401") && !error.message.includes("404")
    );
    if (pageErrors.length > 0) {
      console.log("Reset password errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/accounts/set-password loads without errors", async ({
    page,
    errorTracker,
  }) => {
    // This page typically requires a token, but should load the form without errors
    await page.goto("/accounts/set-password");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out expected 4xx errors for missing/invalid tokens
    const pageErrors = errorTracker.getPageErrors().filter(
      (error) => !error.message.includes("400") && !error.message.includes("401") && !error.message.includes("404")
    );
    if (pageErrors.length > 0) {
      console.log("Set password errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/accounts/forgot-password loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/accounts/forgot-password");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Forgot password errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Onboarding Routes @smoke", () => {
  // Note: These routes typically require specific states (invitation, etc.)
  // We're testing that the page renders without JS errors, even if redirected

  test("/invitations redirects or loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/invitations");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out expected redirect/auth errors
    const pageErrors = errorTracker.getPageErrors().filter(
      (error) => !error.message.includes("401") && !error.message.includes("403") && !error.message.includes("404")
    );
    if (pageErrors.length > 0) {
      console.log("Invitations errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/onboarding redirects or loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out expected redirect/auth errors
    const pageErrors = errorTracker.getPageErrors().filter(
      (error) => !error.message.includes("401") && !error.message.includes("403") && !error.message.includes("404")
    );
    if (pageErrors.length > 0) {
      console.log("Onboarding errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/create-workspace redirects or loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/create-workspace");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out expected redirect/auth errors
    const pageErrors = errorTracker.getPageErrors().filter(
      (error) => !error.message.includes("401") && !error.message.includes("403") && !error.message.includes("404")
    );
    if (pageErrors.length > 0) {
      console.log("Create workspace errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/workspace-invitations redirects or loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/workspace-invitations");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out expected redirect/auth errors
    const pageErrors = errorTracker.getPageErrors().filter(
      (error) => !error.message.includes("401") && !error.message.includes("403") && !error.message.includes("404")
    );
    if (pageErrors.length > 0) {
      console.log("Workspace invitations errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});
