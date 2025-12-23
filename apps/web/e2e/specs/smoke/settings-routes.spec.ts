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

  test("/:workspaceSlug/settings/imports loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/imports`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Imports settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/integrations loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/integrations`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Integrations settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Account Settings Routes @smoke", () => {
  test("/:workspaceSlug/settings/account loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/account`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Account settings errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/account/activity loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/account/activity`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Account activity errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/account/preferences loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/account/preferences`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Account preferences errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/account/notifications loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/account/notifications`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Account notifications errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/account/security loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/account/security`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Account security errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/account/api-tokens loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
    await page.goto(`/${workspaceSlug}/settings/account/api-tokens`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Account API tokens errors:", errorTracker.getSummary());
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
