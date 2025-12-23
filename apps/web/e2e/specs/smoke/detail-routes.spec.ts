import { test, expect } from "../../fixtures";

/**
 * Detail Page Routes Smoke Tests
 *
 * Tests detail pages load without JavaScript errors.
 * These tests navigate to list pages first, then click on items
 * to test detail page rendering.
 */

test.describe("Issue Detail Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/issues/:issueId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    // Navigate to issues list first
    await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any issue link in the list
    const issueLink = page.locator('[data-testid="issue-row"], [data-testid="issue-card"], a[href*="/issues/"]').first();
    const hasIssues = await issueLink.count() > 0;

    if (hasIssues) {
      // Click on the first issue
      await issueLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("Issue detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      // No issues exist, verify list page loaded without errors
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No issues exist in test project to test detail view");
    }
  });
});

test.describe("Epic Detail Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/epics/:epicId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    // Navigate to epics list first
    await page.goto(`/${workspaceSlug}/projects/${projectId}/epics`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any epic link in the list
    const epicLink = page.locator('[data-testid="epic-row"], [data-testid="epic-card"], a[href*="/epics/"]').first();
    const hasEpics = await epicLink.count() > 0;

    if (hasEpics) {
      await epicLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("Epic detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No epics exist in test project to test detail view");
    }
  });
});

test.describe("Sprint Detail Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/sprints/:sprintId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    // Navigate to sprints list first
    await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any sprint link in the list
    const sprintLink = page.locator('[data-testid="sprint-row"], [data-testid="sprint-card"], a[href*="/sprints/"]').first();
    const hasSprints = await sprintLink.count() > 0;

    if (hasSprints) {
      await sprintLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("Sprint detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No sprints exist in test project to test detail view");
    }
  });
});

test.describe("Page Detail Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/pages/:pageId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    // Navigate to pages list first
    await page.goto(`/${workspaceSlug}/projects/${projectId}/pages`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any page link in the list
    const pageLink = page.locator('[data-testid="page-row"], [data-testid="page-card"], a[href*="/pages/"]').first();
    const hasPages = await pageLink.count() > 0;

    if (hasPages) {
      await pageLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("Page detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No pages exist in test project to test detail view");
    }
  });
});

test.describe("View Detail Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/views/:viewId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    // Navigate to views list first
    await page.goto(`/${workspaceSlug}/projects/${projectId}/views`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any view link in the list
    const viewLink = page.locator('[data-testid="view-row"], [data-testid="view-card"], a[href*="/views/"]').first();
    const hasViews = await viewLink.count() > 0;

    if (hasViews) {
      await viewLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("View detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No views exist in test project to test detail view");
    }
  });
});

test.describe("Wiki Page Routes @smoke", () => {
  test("/:workspaceSlug/wiki/:pageId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    // Navigate to wiki first
    await page.goto(`/${workspaceSlug}/wiki`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any wiki page link
    const wikiLink = page.locator('[data-testid="wiki-page-row"], [data-testid="wiki-page-card"], a[href*="/wiki/"]').first();
    const hasWikiPages = await wikiLink.count() > 0;

    if (hasWikiPages) {
      await wikiLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("Wiki page detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No wiki pages exist to test detail view");
    }
  });
});
