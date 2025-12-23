import { test, expect } from "../../fixtures";

/**
 * Browse Routes Smoke Tests
 *
 * Tests browse/work item routes load without JavaScript errors.
 * These require authentication and test the unified work item browser.
 */

test.describe("Browse Routes @smoke", () => {
  test("/:workspaceSlug/browse loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/browse`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Browse errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/browse/:workItem detail loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    // First navigate to browse to find a work item
    await page.goto(`/${workspaceSlug}/browse`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any work item link
    const workItemLink = page.locator('[data-testid="work-item-row"], [data-testid="browse-item"], a[href*="/browse/"]').first();
    const hasWorkItems = await workItemLink.count() > 0;

    if (hasWorkItems) {
      await workItemLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("Browse detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No work items in browse to test detail view");
    }
  });
});

test.describe("Timeline Routes @smoke", () => {
  test("/:workspaceSlug/timeline loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/timeline`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Timeline errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("My Work Routes @smoke", () => {
  test("/:workspaceSlug/my-work loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/my-work`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("My Work errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Favorites Routes @smoke", () => {
  test("/:workspaceSlug/favorites loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/favorites`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Favorites errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Search Routes @smoke", () => {
  test("/:workspaceSlug/search loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/search`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Search errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});
