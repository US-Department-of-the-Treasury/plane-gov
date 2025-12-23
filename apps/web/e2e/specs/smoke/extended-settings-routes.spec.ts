import { test, expect } from "../../fixtures";

/**
 * Extended Settings Routes Smoke Tests
 *
 * Tests additional settings pages that weren't covered in the main settings tests.
 * These require authentication.
 */

test.describe("Workspace Settings Extended Routes @smoke", () => {
  test("/:workspaceSlug/settings/projects loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/projects`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Settings projects errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/settings/activity loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/settings/activity`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Settings activity errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Project Settings Extended Routes @smoke", () => {
  test("/:workspaceSlug/projects/:projectId/settings/automations loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/automations`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project automations errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/settings/estimates loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/estimates`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project estimates errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/settings/labels loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/labels`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project labels errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/settings/states loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/states`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project states errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/projects/:projectId/settings/integrations loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
    projectId,
  }) => {
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/integrations`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Project integrations errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Analytics Extended Routes @smoke", () => {
  test("/:workspaceSlug/analytics/effort loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/analytics/effort`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Analytics effort errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/analytics/custom loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/analytics/custom`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Analytics custom errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/:workspaceSlug/analytics/workload loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    await page.goto(`/${workspaceSlug}/analytics/workload`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Analytics workload errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Webhook Detail Routes @smoke", () => {
  test("/:workspaceSlug/settings/webhooks detail loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    // First navigate to webhooks list to find a webhook
    await page.goto(`/${workspaceSlug}/settings/webhooks`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any webhook link
    const webhookLink = page.locator('[data-testid="webhook-row"], a[href*="/webhooks/"]').first();
    const hasWebhooks = await webhookLink.count() > 0;

    if (hasWebhooks) {
      await webhookLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("Webhook detail errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No webhooks exist to test detail view");
    }
  });
});
