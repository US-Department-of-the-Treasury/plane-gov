import { test, expect } from "../../fixtures/auth";

/**
 * Admin Access Verification Tests
 *
 * These tests verify that an admin user can access admin-only pages
 * and does NOT see "You are not authorized" messages.
 *
 * Bug context: User reported seeing "Guest" role despite database
 * showing admin (role=20). These tests catch this permission issue.
 */
test.describe("Admin Access Verification", () => {
  // Workspace-level admin pages
  const workspaceAdminPages = [
    { path: "/settings/members", name: "Members" },
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

      // Should NOT see "Guest" role indicator in sidebar or anywhere prominent
      // (This is more of a sanity check - Guest role shouldn't have access to these pages)
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
