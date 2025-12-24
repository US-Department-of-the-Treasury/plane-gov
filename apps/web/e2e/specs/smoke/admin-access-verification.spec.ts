import { test, expect } from "../../fixtures/auth";

/**
 * Admin Access Verification Tests
 *
 * These tests verify that an admin user can access admin-only pages
 * and does NOT see "You are not authorized" messages.
 *
 * Bug context: User reported seeing "Guest" role despite database
 * showing admin (role=20). The root cause was a race condition in
 * workspace settings layout.tsx where workspaceUserInfo (a Record {})
 * was checked for truthiness before workspace-specific data loaded.
 *
 * Fix: Changed check from `workspaceUserInfo && !isAuthorized` to
 * `workspaceUserInfo[workspaceSlug] !== undefined && !isAuthorized`
 */
test.describe("Admin Access Verification", () => {
  // Test Members page specifically - verifies admin can access without authorization error
  test("Admin can access workspace Members settings", async ({ authenticatedPage, workspaceSlug }) => {
    const page = authenticatedPage;
    await page.goto(`/${workspaceSlug}/settings/members`);

    // Wait for page to load completely
    await page.waitForLoadState("networkidle");

    // Should NOT see authorization error - wait for content to settle
    await page.waitForTimeout(2000);

    // Should NOT see "Oops!" error or "not authorized" message
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain("oops!");
    expect(pageContent.toLowerCase()).not.toContain("not authorized");

    // Verify the Add member button is visible (proves admin access AND content loaded)
    const addMemberButton = page.getByRole("button", { name: /add member/i });
    await expect(addMemberButton).toBeVisible({ timeout: 10000 });
  });

  // Workspace-level admin pages - basic access checks
  const workspaceAdminPages = [
    { path: "/settings/webhooks", name: "Webhooks" },
    { path: "/settings/imports", name: "Imports" },
    { path: "/settings/integrations", name: "Integrations" },
  ];

  for (const { path, name } of workspaceAdminPages) {
    test(`Admin can access workspace ${name} settings`, async ({ authenticatedPage, workspaceSlug }) => {
      const page = authenticatedPage;
      await page.goto(`/${workspaceSlug}${path}`);

      // Wait for page to load
      await page.waitForLoadState("networkidle");

      // Should NOT see authorization error
      const notAuthorizedText = page.getByText(/not authorized/i);
      await expect(notAuthorizedText).not.toBeVisible({ timeout: 5000 });

      // Should NOT see "Oops!" error
      const pageContent = await page.content();
      expect(pageContent.toLowerCase()).not.toContain("oops!");
    });
  }

  // Project-level admin pages (require a project)
  test("Admin can access project features settings", async ({ authenticatedPage, workspaceSlug, projectId }) => {
    const page = authenticatedPage;
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/features`);

    await page.waitForLoadState("networkidle");

    const notAuthorizedText = page.getByText(/not authorized/i);
    await expect(notAuthorizedText).not.toBeVisible({ timeout: 5000 });

    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain("oops!");
  });

  test("Admin can access project estimates settings", async ({ authenticatedPage, workspaceSlug, projectId }) => {
    const page = authenticatedPage;
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/estimates`);

    await page.waitForLoadState("networkidle");

    const notAuthorizedText = page.getByText(/not authorized/i);
    await expect(notAuthorizedText).not.toBeVisible({ timeout: 5000 });

    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain("oops!");
  });

  test("Admin can access project automations settings", async ({ authenticatedPage, workspaceSlug, projectId }) => {
    const page = authenticatedPage;
    await page.goto(`/${workspaceSlug}/projects/${projectId}/settings/automations`);

    await page.waitForLoadState("networkidle");

    const notAuthorizedText = page.getByText(/not authorized/i);
    await expect(notAuthorizedText).not.toBeVisible({ timeout: 5000 });

    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain("oops!");
  });
});
