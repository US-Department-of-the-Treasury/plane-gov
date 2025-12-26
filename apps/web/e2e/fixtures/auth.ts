/* eslint-disable react-hooks/rules-of-hooks */
// Note: "use" is Playwright's fixture function, not a React hook
import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

/**
 * Auth Fixture
 *
 * Provides authenticated page context for E2E tests.
 * Uses stored authentication state from global setup.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to stored auth state (relative to playwright config)
export const AUTH_STATE_PATH = join(__dirname, "../.auth/user.json");

// Test user credentials (should match seed_data defaults)
export const TEST_USER = {
  email: process.env.E2E_TEST_USER_EMAIL ?? "admin@admin.gov",
  password: process.env.E2E_TEST_USER_PASSWORD ?? "admin123",
};

// Default workspace slug for testing (matches seed_data default)
export const TEST_WORKSPACE_SLUG = process.env.E2E_TEST_WORKSPACE_SLUG ?? "test-workspace";

// Path to discovered project ID (written by global-setup)
const PROJECT_ID_PATH = join(__dirname, "../.auth/project-id.txt");

// Default project ID for testing
// This is dynamically discovered by global-setup or can be overridden via env
function getProjectId(): string {
  // First check environment variable
  if (process.env.E2E_TEST_PROJECT_ID) {
    return process.env.E2E_TEST_PROJECT_ID;
  }
  // Try to read from discovered file
  if (fs.existsSync(PROJECT_ID_PATH)) {
    return fs.readFileSync(PROJECT_ID_PATH, "utf-8").trim();
  }
  // Fallback (will likely fail tests if no project exists)
  return "test-project";
}

export const TEST_PROJECT_ID = getProjectId();

/**
 * Perform login via UI
 * Used by global-setup to create auth state
 *
 * Note: Login flow depends on SMTP configuration:
 * - With SMTP: Multi-step (email -> continue -> password)
 * - Without SMTP (local dev): Single form with email + password + "Go to workspace"
 */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto("/");

  // Wait for the page to be fully hydrated - the form should be interactive
  await page.waitForLoadState("networkidle");

  // Wait for email input
  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ state: "visible", timeout: 10000 });

  // Clear and type email
  await emailInput.clear();
  await emailInput.type(TEST_USER.email, { delay: 50 });

  // Check which login flow we have:
  // - "Continue" button = multi-step flow (SMTP enabled)
  // - "Go to workspace" button = single form flow (local dev)
  const continueButton = page.getByRole("button", { name: /^continue$/i });
  const goToWorkspaceButton = page.getByRole("button", { name: /go to workspace/i });

  // Wait a moment for React state to settle
  await page.waitForTimeout(200);

  // Determine which flow we're in
  const hasContinueButton = await continueButton.isVisible().catch(() => false);

  if (hasContinueButton) {
    // Multi-step flow: Click Continue to proceed to password step
    await continueButton.click();

    // Wait for password input (appears after email verification API call)
    const passwordInput = page.locator("#password");
    await passwordInput.waitFor({ state: "visible", timeout: 15000 });

    // Enter password
    await passwordInput.clear();
    await passwordInput.type(TEST_USER.password, { delay: 50 });

    // Submit login
    const signInButton = page.getByRole("button", { name: /continue|sign in/i });
    await signInButton.waitFor({ state: "visible", timeout: 5000 });
    await signInButton.click();
  } else {
    // Single form flow (local dev without SMTP)
    // Password field should already be visible - use ID selector to be specific
    // (getByLabel('Password') also matches "Show password" button)
    const passwordInput = page.locator("#password");
    await passwordInput.waitFor({ state: "visible", timeout: 5000 });

    // Enter password
    await passwordInput.clear();
    await passwordInput.type(TEST_USER.password, { delay: 50 });

    // Wait for button to be enabled (validates both fields are filled)
    await page.waitForTimeout(200);

    // Click "Go to workspace" button
    await goToWorkspaceButton.waitFor({ state: "visible", timeout: 5000 });
    await goToWorkspaceButton.click();
  }

  // Wait for navigation - could be workspace, profile setup, or create-workspace
  // Use a broad pattern that matches any post-login state
  await page.waitForURL(
    (url) => {
      const path = url.pathname;
      // Successful login destinations
      return (
        path.includes(`/${TEST_WORKSPACE_SLUG}`) || // Our workspace
        path.includes("/workspace") || // Generic workspace
        path.includes("/profile") || // Profile setup
        path.includes("/create-workspace") || // New user needs workspace
        path.includes("/invitations") // Pending invitations
      );
    },
    { timeout: 30000 }
  );
}

/**
 * Check if user is authenticated by looking for common authenticated UI elements
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Wait a short time for authentication indicators
    await page.waitForSelector('[data-testid="user-menu"], [data-testid="workspace-sidebar"], nav', {
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auth fixture types
 */
interface AuthFixtures {
  /** Authenticated page context */
  authenticatedPage: Page;
  /** Test workspace slug */
  workspaceSlug: string;
  /** Test project ID */
  projectId: string;
}

/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Use stored auth state for all tests
  storageState: AUTH_STATE_PATH,

  authenticatedPage: async ({ page }, use) => {
    // The page should already be authenticated due to storageState
    await use(page);
  },

  // eslint-disable-next-line no-empty-pattern
  workspaceSlug: async ({}, use) => {
    await use(TEST_WORKSPACE_SLUG);
  },

  // eslint-disable-next-line no-empty-pattern
  projectId: async ({}, use) => {
    await use(TEST_PROJECT_ID);
  },
});

export { expect } from "@playwright/test";

/**
 * Helper to build common URLs
 */
export const urls = {
  home: (workspaceSlug: string) => `/${workspaceSlug}`,
  drafts: (workspaceSlug: string) => `/${workspaceSlug}/drafts`,
  projects: (workspaceSlug: string) => `/${workspaceSlug}/projects`,
  issues: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/issues`,
  sprints: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/sprints`,
  epics: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/epics`,
  views: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/views`,
  pages: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/pages`,
  settings: (workspaceSlug: string) => `/${workspaceSlug}/settings`,
  notifications: (workspaceSlug: string) => `/${workspaceSlug}/notifications`,
  analytics: (workspaceSlug: string, tab: string = "scope") => `/${workspaceSlug}/analytics/${tab}`,
  workspaceViews: (workspaceSlug: string) => `/${workspaceSlug}/workspace-views`,
  activeSprints: (workspaceSlug: string) => `/${workspaceSlug}/active-sprints`,
  resourceView: (workspaceSlug: string) => `/${workspaceSlug}/resource-view`,
  intake: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/intake`,
  archives: {
    issues: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/archives/issues`,
    sprints: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/archives/sprints`,
    epics: (workspaceSlug: string, projectId: string) => `/${workspaceSlug}/projects/${projectId}/archives/epics`,
  },
};
