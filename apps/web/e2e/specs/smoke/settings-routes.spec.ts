import { test, expect } from "../../fixtures";

/**
 * Settings Routes Smoke Tests
 *
 * Tests settings routes load without JavaScript errors.
 */

test.describe("Settings Routes @smoke", () => {
  test("/:workspaceSlug/settings loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/members loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/members`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Members settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/billing loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/billing`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Billing settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/exports loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/exports`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Exports settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/webhooks loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/webhooks`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Webhooks settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/api-tokens loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/api-tokens`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("API tokens settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Project Settings Routes @smoke", () => {
  test("/:workspaceSlug/settings/projects/:projectId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/projects/${projectId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/projects/:projectId/members loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/projects/${projectId}/members`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project members settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/projects/:projectId/features loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/projects/${projectId}/features`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project features settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/projects/:projectId/states loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/projects/${projectId}/states`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project states settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/projects/:projectId/labels loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/projects/${projectId}/labels`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project labels settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/projects/:projectId/estimates loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/projects/${projectId}/estimates`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project estimates settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Profile/Account Routes @smoke", () => {
  test("/profile loads without errors", async ({ page, errorTracker }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/profile/activity loads without errors", async ({ page, errorTracker }) => {
    await page.goto("/profile/activity");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile activity errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/profile/preferences loads without errors", async ({ page, errorTracker }) => {
    await page.goto("/profile/preferences");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile preferences errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});
