import { test, expect } from "../../fixtures";

/**
 * Profile Routes Smoke Tests
 *
 * Tests user profile pages load without JavaScript errors.
 * These require authentication.
 */

test.describe("Profile Routes @smoke", () => {
  test("/profile loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/profile/appearance loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/profile/appearance");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile appearance errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/profile/security loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/profile/security");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile security errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/profile/notifications loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/profile/notifications");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile notifications errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/profile/email loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/profile/email");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile email errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });

  test("/profile/activity loads without errors", async ({
    page,
    errorTracker,
  }) => {
    await page.goto("/profile/activity");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageErrors = errorTracker.getPageErrors();
    if (pageErrors.length > 0) {
      console.log("Profile activity errors:", errorTracker.getSummary());
    }
    expect(pageErrors).toHaveLength(0);
  });
});

test.describe("Workspace Member Profile Routes @smoke", () => {
  test("/:workspaceSlug/profile/:userId loads without errors", async ({
    page,
    errorTracker,
    workspaceSlug,
  }) => {
    // First navigate to workspace members to get a user ID
    await page.goto(`/${workspaceSlug}/settings/members`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for any user profile link
    const userLink = page.locator('[data-testid="member-row"], a[href*="/profile/"]').first();
    const hasUsers = await userLink.count() > 0;

    if (hasUsers) {
      await userLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      if (pageErrors.length > 0) {
        console.log("User profile errors:", errorTracker.getSummary());
      }
      expect(pageErrors).toHaveLength(0);
    } else {
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
      test.skip(true, "No member links found to test profile view");
    }
  });
});
