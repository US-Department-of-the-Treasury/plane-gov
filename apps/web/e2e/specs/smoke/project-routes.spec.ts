import { test, expect } from "../../fixtures";

/**
 * Project Routes Smoke Tests
 *
 * Tests project-level routes load without JavaScript errors.
 * These require authentication and a valid project.
 */

test.describe("Project Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/issues loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Issues list errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/sprints loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Sprints errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/epics loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/epics`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Epics errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/views loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/views`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Views errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/pages loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/pages`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Pages errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/intake loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/intake`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Intake errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Archive Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/archives/issues loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/archives/issues`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Archives issues errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/archives/sprints loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/archives/sprints`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Archives sprints errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/archives/epics loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/archives/epics`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Archives epics errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});
