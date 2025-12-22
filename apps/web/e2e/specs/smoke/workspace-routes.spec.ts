import { test, expect } from "../../fixtures";

/**
 * Workspace Routes Smoke Tests
 *
 * Tests workspace-level routes load without JavaScript errors.
 * These require authentication.
 */

test.describe("Workspace Routes @smoke", () => {
  test("/:workspaceSlug (workspace home) loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Workspace home errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/drafts loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/drafts`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // This was the previously broken page - verify it's fixed
    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Drafts page errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);

    // Specifically check for "Cannot read properties of undefined"
    const undefinedErrors = errorTracker.getErrorsMatching(/Cannot read properties of undefined/);
    if (undefinedErrors.length > 0) {
      console.log("Found 'undefined' errors - this was the original bug!");
      console.log(undefinedErrors.map((e) => e.message).join("\n"));
    }
    expect(undefinedErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/notifications loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/notifications`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Notifications errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/analytics/scope loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/analytics/scope`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Analytics errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/stickies loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/stickies`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Stickies errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/workspace-views loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/workspace-views`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Workspace views errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Projects list errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/active-sprints loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/active-sprints`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Active sprints errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/resource-view loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/resource-view`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Resource view errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});
