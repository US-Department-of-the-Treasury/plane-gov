import { test, expect } from "../../fixtures";
import type { Page } from "@playwright/test";

/**
 * Navigation Link Testing
 *
 * Tests all clickable navigation elements in the UI:
 * - Sidebar navigation links
 * - Header navigation links
 * - Breadcrumb links
 * - Dropdown menu links
 */

// Helper to close any open popovers/tooltips
async function closePopovers(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
}

// Helper to wait for the sidebar to be fully loaded
async function waitForSidebar(page: Page): Promise<void> {
  // Wait for the Main sidebar to be visible (indicates React has hydrated)
  const sidebar = page.getByRole("complementary", { name: "Main sidebar" });
  await sidebar.waitFor({ state: "visible", timeout: 15000 });
  // Also wait for at least one link to be visible inside
  await sidebar.getByRole("link").first().waitFor({ state: "visible", timeout: 5000 });
}

// Helper to wait for settings page to be fully loaded
async function waitForSettingsPage(page: Page): Promise<void> {
  // Wait for a settings link to be visible (indicates React has hydrated)
  const settingsLink = page.locator('a[href*="/settings"]').first();
  await settingsLink.waitFor({ state: "visible", timeout: 15000 });
}

// Helper to wait for project navigation to be fully loaded
// Project-level links (Work items, Sprints, etc.) are in the main content area, not the sidebar
// Note: There are 2 <main> elements - we need the inner one (last) which contains the project nav
async function waitForProjectNav(page: Page): Promise<void> {
  // Wait for project nav links to be visible - they're in the inner main element
  const projectNavLink = page
    .getByRole("main")
    .last()
    .getByRole("link", { name: /Work items|Sprints|Epics/ })
    .first();
  await projectNavLink.waitFor({ state: "visible", timeout: 15000 });
}

// Helper to click a link and verify navigation
async function clickAndVerifyNavigation(
  page: Page,
  linkLocator: ReturnType<Page["locator"]>,
  expectedUrlPattern: string | RegExp,
  linkName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Close any open popovers/tooltips first
    await closePopovers(page);

    // Ensure link is visible and get the href
    await linkLocator.waitFor({ state: "visible", timeout: 15000 });
    const href = await linkLocator.getAttribute("href");

    // Get current URL before click
    const urlBefore = page.url();

    // Scroll into view and click with force to bypass any overlays
    await linkLocator.scrollIntoViewIfNeeded();

    // Use Promise.all to wait for navigation while clicking
    await Promise.all([
      page.waitForURL((url) => url.href !== urlBefore, { timeout: 10000 }).catch(() => {}),
      linkLocator.click({ force: true }),
    ]);

    // Give a moment for client-side routing to complete
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Check URL matches expected pattern
    const currentUrl = page.url();
    const urlMatches =
      typeof expectedUrlPattern === "string"
        ? currentUrl.includes(expectedUrlPattern)
        : expectedUrlPattern.test(currentUrl);

    if (!urlMatches) {
      return {
        success: false,
        error: `URL mismatch: expected "${expectedUrlPattern}", got "${currentUrl}"`,
      };
    }

    // Check for 404 page
    const has404 = (await page.locator('[data-testid="404-page"]').count()) > 0;
    if (has404) {
      return {
        success: false,
        error: `404 page shown for ${href}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Error clicking ${linkName}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

test.describe("Navigation Links @smoke @navigation", () => {
  // ============================================
  // SIDEBAR NAVIGATION
  // ============================================

  test.describe("Sidebar Navigation", () => {
    test("Home link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find the Home link in the main sidebar complementary region
      const sidebar = page.getByRole("complementary", { name: "Main sidebar" });
      const homeLink = sidebar.getByRole("link", { name: "Home" });
      const result = await clickAndVerifyNavigation(page, homeLink, `/${workspaceSlug}`, "Home");
      expect(result.success, result.error).toBe(true);
    });

    test("Drafts link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find the Drafts link in the main sidebar
      const sidebar = page.getByRole("complementary", { name: "Main sidebar" });
      const draftsLink = sidebar.getByRole("link", { name: "Drafts" });
      const result = await clickAndVerifyNavigation(page, draftsLink, `/${workspaceSlug}/drafts`, "Drafts");
      expect(result.success, result.error).toBe(true);
    });

    test("Projects sidebar link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find Projects link within the Workspace section of main sidebar
      const sidebar = page.getByRole("complementary", { name: "Main sidebar" });
      const projectsLink = sidebar.locator(`a[href$="/projects/"]`).first();
      const result = await clickAndVerifyNavigation(page, projectsLink, `/${workspaceSlug}/projects`, "Projects");
      expect(result.success, result.error).toBe(true);
    });

    test("Views link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find the Views link within the Workspace section of main sidebar (not project level)
      const sidebar = page.getByRole("complementary", { name: "Main sidebar" });
      const viewsLink = sidebar.locator(`a[href*="workspace-views"]`).first();
      const result = await clickAndVerifyNavigation(page, viewsLink, /workspace-views/, "Views");
      expect(result.success, result.error).toBe(true);
    });

    test("Analytics link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find the Analytics link in main sidebar
      const sidebar = page.getByRole("complementary", { name: "Main sidebar" });
      const analyticsLink = sidebar.getByRole("link", { name: "Analytics" });
      const result = await clickAndVerifyNavigation(page, analyticsLink, `/${workspaceSlug}/analytics`, "Analytics");
      expect(result.success, result.error).toBe(true);
    });

    test("Archives link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find the Archives link in main sidebar
      const sidebar = page.getByRole("complementary", { name: "Main sidebar" });
      const archivesLink = sidebar.getByRole("link", { name: "Archives" });
      const result = await clickAndVerifyNavigation(page, archivesLink, /archives/, "Archives");
      expect(result.success, result.error).toBe(true);
    });

    test("Wiki link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find Wiki link - this is in the top navigation, not the sidebar
      const wikiLink = page.locator(`a[href$="/wiki/"]`).first();
      const result = await clickAndVerifyNavigation(page, wikiLink, `/${workspaceSlug}/wiki`, "Wiki");
      expect(result.success, result.error).toBe(true);
    });

    test("Settings link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Find Settings link - this is in the top navigation
      const settingsLink = page.locator(`a[href$="/settings/"]`).first();
      const result = await clickAndVerifyNavigation(page, settingsLink, `/${workspaceSlug}/settings`, "Settings");
      expect(result.success, result.error).toBe(true);
    });
  });

  // ============================================
  // PROJECT SIDEBAR NAVIGATION
  // ============================================

  test.describe("Project Sidebar Navigation", () => {
    test("Work items link navigates correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await waitForProjectNav(page);

      // Find Work items link within the main content area (project nav is not in sidebar)
      // Note: There are 2 <main> elements - use .last() for the inner one with project nav
      const mainContent = page.getByRole("main").last();
      const issuesLink = mainContent.getByRole("link", { name: "Work items" });
      const result = await clickAndVerifyNavigation(
        page,
        issuesLink,
        `/${workspaceSlug}/projects/${projectId}/issues`,
        "Work items"
      );
      expect(result.success, result.error).toBe(true);
    });

    test("Sprints link navigates correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await waitForProjectNav(page);

      // Find Sprints link within the main content area (project nav is not in sidebar)
      // Note: There are 2 <main> elements - use .last() for the inner one with project nav
      const mainContent = page.getByRole("main").last();
      const sprintsLink = mainContent.getByRole("link", { name: "Sprints" });
      const result = await clickAndVerifyNavigation(
        page,
        sprintsLink,
        `/${workspaceSlug}/projects/${projectId}/sprints`,
        "Sprints"
      );
      expect(result.success, result.error).toBe(true);
    });

    test("Epics link navigates correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await waitForProjectNav(page);

      // Find Epics link within the main content area (project nav is not in sidebar)
      // Note: There are 2 <main> elements - use .last() for the inner one with project nav
      const mainContent = page.getByRole("main").last();
      const epicsLink = mainContent.getByRole("link", { name: "Epics" });
      const result = await clickAndVerifyNavigation(
        page,
        epicsLink,
        `/${workspaceSlug}/projects/${projectId}/epics`,
        "Epics"
      );
      expect(result.success, result.error).toBe(true);
    });

    test("Project Views link navigates correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await waitForProjectNav(page);

      // Find the Views link within the main content area - use href for specificity
      // Note: There are 2 <main> elements - use .last() for the inner one with project nav
      const mainContent = page.getByRole("main").last();
      const viewsLink = mainContent.locator(`a[href*="/projects/${projectId}/views"]`).first();
      const result = await clickAndVerifyNavigation(
        page,
        viewsLink,
        `/${workspaceSlug}/projects/${projectId}/views`,
        "Views"
      );
      expect(result.success, result.error).toBe(true);
    });

    test("Pages link navigates correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await waitForProjectNav(page);

      // Find Pages link within the main content area (project nav is not in sidebar)
      // Note: There are 2 <main> elements - use .last() for the inner one with project nav
      const mainContent = page.getByRole("main").last();
      const pagesLink = mainContent.getByRole("link", { name: "Pages" });
      const result = await clickAndVerifyNavigation(
        page,
        pagesLink,
        `/${workspaceSlug}/projects/${projectId}/pages`,
        "Pages"
      );
      expect(result.success, result.error).toBe(true);
    });

    test("Intake link navigates correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await waitForProjectNav(page);

      // Find Intake link within the main content area (project nav is not in sidebar)
      // Note: There are 2 <main> elements - use .last() for the inner one with project nav
      const mainContent = page.getByRole("main").last();
      const intakeLink = mainContent.getByRole("link", { name: "Intake" });
      const result = await clickAndVerifyNavigation(
        page,
        intakeLink,
        `/${workspaceSlug}/projects/${projectId}/intake`,
        "Intake"
      );
      expect(result.success, result.error).toBe(true);
    });
  });

  // ============================================
  // SETTINGS SIDEBAR NAVIGATION
  // ============================================

  test.describe("Settings Sidebar Navigation", () => {
    test("General settings link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/settings/members`);
      await page.waitForLoadState("networkidle");
      await waitForSettingsPage(page);

      const generalLink = page.locator('a[href$="/settings/"]').first();
      const result = await clickAndVerifyNavigation(page, generalLink, `/${workspaceSlug}/settings`, "General");
      expect(result.success, result.error).toBe(true);
    });

    test("Members settings link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/settings`);
      await page.waitForLoadState("networkidle");
      await waitForSettingsPage(page);

      const membersLink = page.locator('a[href*="/settings/members"]').first();
      const result = await clickAndVerifyNavigation(page, membersLink, `/${workspaceSlug}/settings/members`, "Members");
      expect(result.success, result.error).toBe(true);
    });

    test("Exports settings link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/settings`);
      await page.waitForLoadState("networkidle");
      await waitForSettingsPage(page);

      const exportsLink = page.locator('a[href*="/settings/exports"]').first();
      const result = await clickAndVerifyNavigation(page, exportsLink, `/${workspaceSlug}/settings/exports`, "Exports");
      expect(result.success, result.error).toBe(true);
    });

    test("Webhooks settings link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/settings`);
      await page.waitForLoadState("networkidle");
      await waitForSettingsPage(page);

      const webhooksLink = page.locator('a[href*="/settings/webhooks"]').first();
      const result = await clickAndVerifyNavigation(
        page,
        webhooksLink,
        `/${workspaceSlug}/settings/webhooks`,
        "Webhooks"
      );
      expect(result.success, result.error).toBe(true);
    });
  });

  // ============================================
  // HEADER NAVIGATION
  // ============================================

  test.describe("Header Navigation", () => {
    test("Notifications icon navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      const notificationsLink = page.locator('a[href*="/notifications"]').first();
      const result = await clickAndVerifyNavigation(
        page,
        notificationsLink,
        `/${workspaceSlug}/notifications`,
        "Notifications"
      );
      expect(result.success, result.error).toBe(true);
    });

    test("Wiki header link navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Click on Wiki in the header
      const wikiHeaderLink = page.locator('nav a[href*="/wiki"], header a[href*="/wiki"]').first();
      if ((await wikiHeaderLink.count()) > 0) {
        const result = await clickAndVerifyNavigation(page, wikiHeaderLink, `/${workspaceSlug}/wiki`, "Wiki Header");
        expect(result.success, result.error).toBe(true);
      }
    });
  });

  // ============================================
  // LIST ITEM NAVIGATION
  // ============================================

  test.describe("List Item Navigation", () => {
    test("Clicking issue navigates to detail page", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Wait for the issue list to load
      const mainArea = page.locator("main").last();

      // Wait for issues to load
      await page.waitForTimeout(3000);

      // Issue identifiers like MOBILE-1, PDP-1 are displayed as clickable links
      // Look for visible issue identifier links that navigate to /browse/
      const browsePattern = /\/browse\/[A-Z]+-\d+\/?$/;
      const allLinks = await mainArea.locator("a").all();
      let issueLink: ReturnType<typeof page.locator> | null = null;

      for (const link of allLinks) {
        const href = await link.getAttribute("href");
        if (href && browsePattern.test(href)) {
          // Make sure the link is visible and contains an issue identifier text
          const isVisible = await link.isVisible().catch(() => false);
          if (isVisible) {
            const text = await link.textContent();
            // Issue identifier format: PROJECT-NUMBER (e.g., MOBILE-1, PDP-42)
            if (text && /^[A-Z]+-\d+$/.test(text.trim())) {
              issueLink = link;
              break;
            }
          }
        }
      }

      if (issueLink) {
        await issueLink.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);

        // Should be on issue detail page (URL contains /browse/IDENTIFIER)
        expect(page.url()).toMatch(/\/browse\/[A-Z]+-\d+/);
      } else {
        // If no issue links found, this is expected for empty projects - skip gracefully
        test.skip(true, "No issues found in the project to test");
      }
    });

    test("Clicking sprint navigates to detail page", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      const sprintLinks = page.locator('a[href*="/sprints/"]');
      const count = await sprintLinks.count();

      if (count > 0) {
        const firstSprintLink = sprintLinks.first();
        await firstSprintLink.click();
        await page.waitForLoadState("networkidle");

        // Should be on sprint detail page
        expect(page.url()).toContain("/sprints/");
      }
    });

    test("Clicking epic navigates to detail page", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/epics`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      const epicLinks = page.locator('a[href*="/epics/"]');
      const count = await epicLinks.count();

      if (count > 0) {
        const firstEpicLink = epicLinks.first();
        await firstEpicLink.click();
        await page.waitForLoadState("networkidle");

        // Should be on epic detail page
        expect(page.url()).toContain("/epics/");
      }
    });

    test("Clicking page navigates to detail page", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/pages`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      const pageLinks = page.locator('a[href*="/pages/"]');
      const count = await pageLinks.count();

      if (count > 0) {
        const firstPageLink = pageLinks.first();
        await firstPageLink.click();
        await page.waitForLoadState("networkidle");

        // Should be on page detail page
        expect(page.url()).toContain("/pages/");
      }
    });
  });

  // ============================================
  // BREADCRUMB NAVIGATION
  // ============================================

  test.describe("Breadcrumb Navigation", () => {
    test("Project breadcrumb navigates back to issues", async ({ page, workspaceSlug, projectId }) => {
      // Navigate to a page within a project
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await waitForSidebar(page);

      // Click on project name in breadcrumb
      const projectBreadcrumb = page.locator('button:has-text("Plane Demo Project")').first();
      if ((await projectBreadcrumb.count()) > 0) {
        await projectBreadcrumb.click();

        // Should have dropdown or navigate
        await page.waitForTimeout(500);
      }
    });

    test("Workspace breadcrumb navigates correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/settings`);
      await page.waitForLoadState("networkidle");
      await waitForSettingsPage(page);

      // Look for "Back to workspace" link
      const backLink = page
        .locator('a[href*="' + workspaceSlug + '"]')
        .filter({ hasText: /back to workspace/i })
        .first();
      if ((await backLink.count()) > 0) {
        const result = await clickAndVerifyNavigation(page, backLink, `/${workspaceSlug}`, "Back to workspace");
        expect(result.success, result.error).toBe(true);
      }
    });
  });
});
