import { test, expect } from "../../fixtures";

/**
 * Browse Routes Smoke Tests
 *
 * Tests browse/work item routes load without JavaScript errors.
 * These require authentication and test the unified work item browser.
 */

test.describe("Browse Routes @smoke", () => {
  test("/:workspaceSlug/browse loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
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

    // Look for any work item link - use browse URL pattern (e.g., /browse/MOBILE-1/)
    // Work items have URLs like /workspace/browse/IDENTIFIER/
    const browsePattern = /\/browse\/[A-Z]+-\d+\/?$/;
    const allLinks = await page.locator("a").all();
    let workItemLink = null;

    for (const link of allLinks) {
      const href = await link.getAttribute("href");
      if (href && browsePattern.test(href)) {
        workItemLink = link;
        break;
      }
    }
    if (workItemLink) {
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
  test("/:workspaceSlug/timeline loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
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
  test("/:workspaceSlug/my-work loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
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
  test("/:workspaceSlug/favorites loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
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
  test("/:workspaceSlug/search loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
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
