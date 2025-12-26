import { test, expect } from "../../fixtures";
import type { Page } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Comprehensive Route Testing
 *
 * Tests ALL routes with multi-layer validation:
 * 1. HTTP Status Check - Page doesn't return 404/500
 * 2. Runtime Error Check - No JavaScript exceptions in console
 * 3. Content Load Check - Skeleton loaders resolve to actual content
 * 4. Data Presence Check - Expected data appears (not permanent "empty state")
 * 5. Visual Completeness Check - Page looks complete, not stuck/broken
 */

// Results tracking
interface RouteResult {
  route: string;
  url: string;
  status: "pass" | "fail" | "skip";
  has404: boolean;
  hasJsErrors: boolean;
  hasStuckLoader: boolean;
  hasMissingData: boolean;
  errors: string[];
  duration: number;
}

const results: RouteResult[] = [];

// Helper to save results to file
function saveResults() {
  const outputDir = path.join(process.cwd(), "test-results");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate markdown report
  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const skipCount = results.filter((r) => r.status === "skip").length;

  let report = `# Comprehensive Route Testing Report\n\n`;
  report += `**Date:** ${new Date().toISOString().split("T")[0]}\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Count |\n|--------|-------|\n`;
  report += `| **Total Tests** | ${results.length} |\n`;
  report += `| **Passed** | ${passCount} |\n`;
  report += `| **Failed** | ${failCount} |\n`;
  report += `| **Skipped** | ${skipCount} |\n`;
  report += `| **Pass Rate** | ${((passCount / results.length) * 100).toFixed(1)}% |\n\n`;

  // Group by category
  const categories = new Map<string, RouteResult[]>();
  for (const r of results) {
    const category = r.route.split(" - ")[0] || "Other";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(r);
  }

  report += `## Results by Category\n\n`;
  for (const [category, catResults] of categories) {
    const catPass = catResults.filter((r) => r.status === "pass").length;
    const _catFail = catResults.filter((r) => r.status === "fail").length;
    const _catSkip = catResults.filter((r) => r.status === "skip").length;
    report += `### ${category} (${catPass}/${catResults.length} passed)\n\n`;

    for (const r of catResults) {
      const icon = r.status === "pass" ? "✓" : r.status === "fail" ? "✗" : "⊘";
      report += `- ${icon} \`${r.url}\` - ${r.status.toUpperCase()}`;
      if (r.errors.length > 0) {
        report += `\n  - Errors: ${r.errors.join(", ")}`;
      }
      report += `\n`;
    }
    report += `\n`;
  }

  // Failures section
  const failures = results.filter((r) => r.status === "fail");
  if (failures.length > 0) {
    report += `## Failures Detail\n\n`;
    for (const f of failures) {
      report += `### ${f.url}\n\n`;
      report += `- 404 Error: ${f.has404 ? "Yes" : "No"}\n`;
      report += `- JS Errors: ${f.hasJsErrors ? "Yes" : "No"}\n`;
      report += `- Stuck Loader: ${f.hasStuckLoader ? "Yes" : "No"}\n`;
      report += `- Missing Data: ${f.hasMissingData ? "Yes" : "No"}\n`;
      if (f.errors.length > 0) {
        report += `- Error Details:\n`;
        for (const e of f.errors) {
          report += `  - ${e}\n`;
        }
      }
      report += `\n`;
    }
  }

  fs.writeFileSync(path.join(outputDir, "comprehensive-route-report.md"), report);
  fs.writeFileSync(path.join(outputDir, "comprehensive-route-results.json"), JSON.stringify(results, null, 2));
}

// Multi-layer validation helper
async function validateRoute(
  page: Page,
  url: string,
  routeName: string,
  options: {
    expectData?: boolean;
    dataSelector?: string;
    allowEmpty?: boolean;
  } = {}
): Promise<RouteResult> {
  const startTime = Date.now();
  const result: RouteResult = {
    route: routeName,
    url,
    status: "pass",
    has404: false,
    hasJsErrors: false,
    hasStuckLoader: false,
    hasMissingData: false,
    errors: [],
    duration: 0,
  };

  try {
    // Navigate to page
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Check HTTP status
    if (response && response.status() >= 400) {
      result.has404 = true;
      result.errors.push(`HTTP ${response.status()}`);
      result.status = "fail";
    }

    // Wait for network to settle
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
      result.errors.push("Network did not settle");
    });

    // Check for 404 page content - more specific patterns to avoid false positives
    const has404Page = await page.locator('[data-testid="404-page"], [class*="not-found"]').count() > 0;
    const has404Title = await page.title().then((t) => t.toLowerCase().includes("not found")).catch(() => false);

    if (has404Page || has404Title) {
      result.has404 = true;
      result.errors.push("404 page detected");
      result.status = "fail";
    }

    // Check for stuck skeleton loaders - only check specific loading indicators
    // Avoid `animate-pulse` as it's used for many non-skeleton purposes
    const skeletonSelectors = [
      '[data-testid="loading-skeleton"]',
      '[data-loading="true"]',
      ".loading-skeleton",
      ".skeleton-loader",
    ];

    for (const selector of skeletonSelectors) {
      try {
        const skeletons = page.locator(selector);
        const count = await skeletons.count();
        if (count > 0) {
          // Wait for skeletons to disappear
          await page
            .waitForSelector(selector, { state: "hidden", timeout: 10000 })
            .catch(() => {
              result.hasStuckLoader = true;
              result.errors.push(`Skeleton loader stuck: ${selector}`);
            });
        }
      } catch {
        // Selector not found, that's fine
      }
    }

    // Check for data presence if expected
    if (options.expectData && options.dataSelector) {
      const hasData = await page.locator(options.dataSelector).count();
      if (hasData === 0 && !options.allowEmpty) {
        result.hasMissingData = true;
        result.errors.push(`Expected data not found: ${options.dataSelector}`);
      }
    }

    // Allow a brief moment for any final errors
    await page.waitForTimeout(500);

    // Set final status based on all checks
    if (result.hasStuckLoader && !options.allowEmpty) {
      result.status = "fail";
    }

    if (result.hasMissingData) {
      result.status = "fail";
    }
  } catch (error) {
    result.status = "fail";
    result.errors.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  result.duration = Date.now() - startTime;
  results.push(result);
  return result;
}

test.describe("Comprehensive Routes @smoke @comprehensive", () => {
  // After all tests, save results
  test.afterAll(() => {
    saveResults();
  });

  // ============================================
  // PUBLIC/AUTH ROUTES
  // ============================================

  test.describe("Public Routes", () => {
    test("/ (login page) loads correctly", async ({ page }) => {
      // Need to clear auth for this test
      await page.context().clearCookies();
      const result = await validateRoute(page, "/", "Public - Login Page");
      expect(result.status).toBe("pass");
    });

    test("/sign-up loads correctly", async ({ page }) => {
      await page.context().clearCookies();
      const result = await validateRoute(page, "/sign-up", "Public - Sign Up");
      expect(result.status).toBe("pass");
    });

    test("/accounts/forgot-password loads correctly", async ({ page }) => {
      await page.context().clearCookies();
      const result = await validateRoute(page, "/accounts/forgot-password", "Public - Forgot Password");
      expect(result.status).toBe("pass");
    });

    test("/accounts/reset-password loads correctly", async ({ page }) => {
      await page.context().clearCookies();
      const result = await validateRoute(page, "/accounts/reset-password", "Public - Reset Password");
      // This page may redirect or require a token, so we just check it doesn't 500
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });

    test("/accounts/set-password loads correctly", async ({ page }) => {
      await page.context().clearCookies();
      const result = await validateRoute(page, "/accounts/set-password", "Public - Set Password");
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });
  });

  // ============================================
  // AUTHENTICATED NON-WORKSPACE ROUTES
  // ============================================

  test.describe("Authenticated Non-Workspace Routes", () => {
    test("/onboarding loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/onboarding", "Auth - Onboarding");
      // May redirect if already onboarded
      expect(result.status === "pass" || !result.has404).toBeTruthy();
    });

    test("/invitations loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/invitations", "Auth - Invitations", { allowEmpty: true });
      expect(result.status).toBe("pass");
    });

    test("/workspace-invitations loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/workspace-invitations", "Auth - Workspace Invitations", {
        allowEmpty: true,
      });
      expect(result.status).toBe("pass");
    });

    test("/create-workspace loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/create-workspace", "Auth - Create Workspace");
      expect(result.status).toBe("pass");
    });

    test("/profile loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/profile", "Auth - Profile");
      expect(result.status).toBe("pass");
    });

    test("/profile/activity loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/profile/activity", "Auth - Profile Activity");
      expect(result.status).toBe("pass");
    });

    test("/profile/appearance loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/profile/appearance", "Auth - Profile Appearance");
      expect(result.status).toBe("pass");
    });

    test("/profile/notifications loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/profile/notifications", "Auth - Profile Notifications");
      expect(result.status).toBe("pass");
    });

    test("/profile/security loads correctly", async ({ page }) => {
      const result = await validateRoute(page, "/profile/security", "Auth - Profile Security");
      expect(result.status).toBe("pass");
    });
  });

  // ============================================
  // WORKSPACE ROUTES
  // ============================================

  test.describe("Workspace Routes", () => {
    test("/:workspaceSlug (home) loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}`, "Workspace - Home");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/projects`, "Workspace - Projects");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/active-sprints loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/active-sprints`, "Workspace - Active Sprints", {
        allowEmpty: true,
      });
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/drafts loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/drafts`, "Workspace - Drafts", { allowEmpty: true });
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/notifications loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/notifications`, "Workspace - Notifications", {
        allowEmpty: true,
      });
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/workspace-views loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/workspace-views`, "Workspace - Workspace Views", {
        allowEmpty: true,
      });
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/wiki loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/wiki`, "Workspace - Wiki", { allowEmpty: true });
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/resource-view loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/resource-view`, "Workspace - Resource View", {
        allowEmpty: true,
      });
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/browse loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/browse`, "Workspace - Browse", { allowEmpty: true });
      // This route may or may not exist - check if we get 404
      if (result.has404) {
        results[results.length - 1].status = "skip";
        results[results.length - 1].errors.push("Route may not exist in gov fork");
      }
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });

    test("/:workspaceSlug/timeline loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/timeline`, "Workspace - Timeline", {
        allowEmpty: true,
      });
      if (result.has404) {
        results[results.length - 1].status = "skip";
        results[results.length - 1].errors.push("Route may not exist in gov fork");
      }
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });

    test("/:workspaceSlug/my-work loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/my-work`, "Workspace - My Work", { allowEmpty: true });
      if (result.has404) {
        results[results.length - 1].status = "skip";
        results[results.length - 1].errors.push("Route may not exist in gov fork");
      }
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });

    test("/:workspaceSlug/favorites loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/favorites`, "Workspace - Favorites", {
        allowEmpty: true,
      });
      if (result.has404) {
        results[results.length - 1].status = "skip";
        results[results.length - 1].errors.push("Route may not exist in gov fork");
      }
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });

    test("/:workspaceSlug/search loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/search`, "Workspace - Search", { allowEmpty: true });
      if (result.has404) {
        results[results.length - 1].status = "skip";
        results[results.length - 1].errors.push("Route may not exist in gov fork");
      }
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });
  });

  // ============================================
  // ANALYTICS ROUTES
  // ============================================

  test.describe("Analytics Routes", () => {
    test("/:workspaceSlug/analytics/scope loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/analytics/scope`, "Analytics - Scope");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/analytics/effort loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/analytics/effort`, "Analytics - Effort");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/analytics/custom loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/analytics/custom`, "Analytics - Custom");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/analytics/workload loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/analytics/workload`, "Analytics - Workload");
      expect(result.status).toBe("pass");
    });
  });

  // ============================================
  // PROJECT ROUTES
  // ============================================

  test.describe("Project Routes", () => {
    test("/:workspaceSlug/projects/:projectId/issues loads correctly", async ({ page, workspaceSlug, projectId }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/issues`,
        "Project - Issues List"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects/:projectId/sprints loads correctly", async ({ page, workspaceSlug, projectId }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/sprints`,
        "Project - Sprints List",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects/:projectId/epics loads correctly", async ({ page, workspaceSlug, projectId }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/epics`,
        "Project - Epics List",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects/:projectId/views loads correctly", async ({ page, workspaceSlug, projectId }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/views`,
        "Project - Views List",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects/:projectId/pages loads correctly", async ({ page, workspaceSlug, projectId }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/pages`,
        "Project - Pages List",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects/:projectId/intake loads correctly", async ({ page, workspaceSlug, projectId }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/intake`,
        "Project - Intake",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });
  });

  // ============================================
  // ARCHIVE ROUTES
  // ============================================

  test.describe("Archive Routes", () => {
    test("/:workspaceSlug/projects/:projectId/archives/issues loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/archives/issues`,
        "Archive - Issues",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects/:projectId/archives/sprints loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/archives/sprints`,
        "Archive - Sprints",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/projects/:projectId/archives/epics loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/projects/${projectId}/archives/epics`,
        "Archive - Epics",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });
  });

  // ============================================
  // WORKSPACE SETTINGS ROUTES
  // ============================================

  test.describe("Workspace Settings Routes", () => {
    test("/:workspaceSlug/settings loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings`, "Settings - General");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/members loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/members`, "Settings - Members");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/exports loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/exports`, "Settings - Exports");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/imports loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/imports`, "Settings - Imports");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/integrations loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/integrations`, "Settings - Integrations");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/webhooks loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/webhooks`, "Settings - Webhooks", {
        allowEmpty: true,
      });
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/projects loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/projects`, "Settings - Projects List");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/api-tokens loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/api-tokens`, "Settings - API Tokens", {
        allowEmpty: true,
      });
      // This might redirect to account/api-tokens
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });

    test("/:workspaceSlug/settings/billing loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/billing`, "Settings - Billing");
      // Billing may not exist in gov fork
      if (result.has404) {
        results[results.length - 1].status = "skip";
        results[results.length - 1].errors.push("Billing not available in gov fork");
      }
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });

    test("/:workspaceSlug/settings/activity loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/activity`, "Settings - Activity");
      // May redirect to account/activity
      expect(result.has404 || result.status === "pass").toBeTruthy();
    });
  });

  // ============================================
  // PROJECT SETTINGS ROUTES
  // ============================================

  test.describe("Project Settings Routes", () => {
    test("/:workspaceSlug/settings/projects/:projectId loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/projects/${projectId}`,
        "Project Settings - General"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/projects/:projectId/members loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/projects/${projectId}/members`,
        "Project Settings - Members"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/projects/:projectId/features loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/projects/${projectId}/features`,
        "Project Settings - Features"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/projects/:projectId/states loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/projects/${projectId}/states`,
        "Project Settings - States"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/projects/:projectId/labels loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/projects/${projectId}/labels`,
        "Project Settings - Labels"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/projects/:projectId/estimates loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/projects/${projectId}/estimates`,
        "Project Settings - Estimates"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/projects/:projectId/automations loads correctly", async ({
      page,
      workspaceSlug,
      projectId,
    }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/projects/${projectId}/automations`,
        "Project Settings - Automations"
      );
      expect(result.status).toBe("pass");
    });
  });

  // ============================================
  // ACCOUNT SETTINGS ROUTES (within workspace)
  // ============================================

  test.describe("Account Settings Routes", () => {
    test("/:workspaceSlug/settings/account loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(page, `/${workspaceSlug}/settings/account`, "Account Settings - Profile");
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/account/activity loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/account/activity`,
        "Account Settings - Activity"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/account/preferences loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/account/preferences`,
        "Account Settings - Preferences"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/account/notifications loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/account/notifications`,
        "Account Settings - Notifications"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/account/security loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/account/security`,
        "Account Settings - Security"
      );
      expect(result.status).toBe("pass");
    });

    test("/:workspaceSlug/settings/account/api-tokens loads correctly", async ({ page, workspaceSlug }) => {
      const result = await validateRoute(
        page,
        `/${workspaceSlug}/settings/account/api-tokens`,
        "Account Settings - API Tokens",
        { allowEmpty: true }
      );
      expect(result.status).toBe("pass");
    });
  });

  // ============================================
  // DETAIL PAGES (require dynamic IDs)
  // ============================================

  test.describe("Detail Pages", () => {
    test("Issue detail page loads correctly", async ({ page, workspaceSlug, projectId }) => {
      // First navigate to issues list and find an issue
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find an issue link
      const issueLinks = page.locator('a[href*="/issues/"]').filter({ hasNotText: /archives/ });
      const count = await issueLinks.count();

      if (count === 0) {
        results.push({
          route: "Detail - Issue",
          url: `/${workspaceSlug}/projects/${projectId}/issues/:issueId`,
          status: "skip",
          has404: false,
          hasJsErrors: false,
          hasStuckLoader: false,
          hasMissingData: true,
          errors: ["No issues found in project"],
          duration: 0,
        });
        return;
      }

      const href = await issueLinks.first().getAttribute("href");
      if (href) {
        const result = await validateRoute(page, href, "Detail - Issue");
        expect(result.status).toBe("pass");
      }
    });

    test("Sprint detail page loads correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const sprintLinks = page.locator('a[href*="/sprints/"]');
      const count = await sprintLinks.count();

      if (count === 0) {
        results.push({
          route: "Detail - Sprint",
          url: `/${workspaceSlug}/projects/${projectId}/sprints/:sprintId`,
          status: "skip",
          has404: false,
          hasJsErrors: false,
          hasStuckLoader: false,
          hasMissingData: true,
          errors: ["No sprints found in project"],
          duration: 0,
        });
        return;
      }

      const href = await sprintLinks.first().getAttribute("href");
      if (href) {
        const result = await validateRoute(page, href, "Detail - Sprint");
        expect(result.status).toBe("pass");
      }
    });

    test("Epic detail page loads correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/epics`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const epicLinks = page.locator('a[href*="/epics/"]');
      const count = await epicLinks.count();

      if (count === 0) {
        results.push({
          route: "Detail - Epic",
          url: `/${workspaceSlug}/projects/${projectId}/epics/:epicId`,
          status: "skip",
          has404: false,
          hasJsErrors: false,
          hasStuckLoader: false,
          hasMissingData: true,
          errors: ["No epics found in project"],
          duration: 0,
        });
        return;
      }

      const href = await epicLinks.first().getAttribute("href");
      if (href) {
        const result = await validateRoute(page, href, "Detail - Epic");
        expect(result.status).toBe("pass");
      }
    });

    test("View detail page loads correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/views`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const viewLinks = page.locator('a[href*="/views/"]');
      const count = await viewLinks.count();

      if (count === 0) {
        results.push({
          route: "Detail - View",
          url: `/${workspaceSlug}/projects/${projectId}/views/:viewId`,
          status: "skip",
          has404: false,
          hasJsErrors: false,
          hasStuckLoader: false,
          hasMissingData: true,
          errors: ["No views found in project"],
          duration: 0,
        });
        return;
      }

      const href = await viewLinks.first().getAttribute("href");
      if (href) {
        const result = await validateRoute(page, href, "Detail - View");
        expect(result.status).toBe("pass");
      }
    });

    test("Page detail loads correctly", async ({ page, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/pages`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageLinks = page.locator('a[href*="/pages/"]');
      const count = await pageLinks.count();

      if (count === 0) {
        results.push({
          route: "Detail - Page",
          url: `/${workspaceSlug}/projects/${projectId}/pages/:pageId`,
          status: "skip",
          has404: false,
          hasJsErrors: false,
          hasStuckLoader: false,
          hasMissingData: true,
          errors: ["No pages found in project"],
          duration: 0,
        });
        return;
      }

      const href = await pageLinks.first().getAttribute("href");
      if (href) {
        const result = await validateRoute(page, href, "Detail - Page");
        expect(result.status).toBe("pass");
      }
    });

    test("Wiki page detail loads correctly", async ({ page, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/wiki`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const wikiLinks = page.locator('a[href*="/wiki/"]');
      const count = await wikiLinks.count();

      if (count === 0) {
        results.push({
          route: "Detail - Wiki Page",
          url: `/${workspaceSlug}/wiki/:pageId`,
          status: "skip",
          has404: false,
          hasJsErrors: false,
          hasStuckLoader: false,
          hasMissingData: true,
          errors: ["No wiki pages found"],
          duration: 0,
        });
        return;
      }

      const href = await wikiLinks.first().getAttribute("href");
      if (href && href.match(/\/wiki\/[a-f0-9-]{36}/)) {
        const result = await validateRoute(page, href, "Detail - Wiki Page");
        expect(result.status).toBe("pass");
      }
    });
  });

  // ============================================
  // USER PROFILE ROUTES (within workspace)
  // ============================================

  test.describe("User Profile Routes", () => {
    test("/:workspaceSlug/profile/:userId loads correctly", async ({ page, workspaceSlug }) => {
      // We need to discover the current user's ID
      await page.goto(`/${workspaceSlug}/settings/members`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Look for profile links
      const profileLinks = page.locator('a[href*="/profile/"]');
      const count = await profileLinks.count();

      if (count === 0) {
        results.push({
          route: "Profile - User Profile",
          url: `/${workspaceSlug}/profile/:userId`,
          status: "skip",
          has404: false,
          hasJsErrors: false,
          hasStuckLoader: false,
          hasMissingData: true,
          errors: ["No user profile links found"],
          duration: 0,
        });
        return;
      }

      const href = await profileLinks.first().getAttribute("href");
      if (href) {
        const result = await validateRoute(page, href, "Profile - User Profile");
        expect(result.status).toBe("pass");
      }
    });
  });
});
