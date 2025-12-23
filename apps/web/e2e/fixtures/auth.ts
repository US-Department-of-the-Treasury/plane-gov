/* eslint-disable react-hooks/rules-of-hooks */
// Note: "use" is Playwright's fixture function, not a React hook
import { test as base, Page } from "@playwright/test";
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
  email: process.env.E2E_TEST_USER_EMAIL ?? "test@example.com",
  password: process.env.E2E_TEST_USER_PASSWORD ?? "password123",
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
 * Note: Plane uses a multi-step login flow:
 * 1. Enter email -> Click Continue
 * 2. Enter password -> Click Sign In
 */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto("/");

  // Step 1: Wait for email input and enter email
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);

  // Click Continue/Submit to proceed to password step
  await page.click('button[type="submit"]');

  // Step 2: Wait for password input (appears after email verification)
  await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 15000 });
  await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for navigation to workspace or dashboard
  await page.waitForURL(/\/(workspace|test-workspace)/, { timeout: 30000 });
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
  stickies: (workspaceSlug: string) => `/${workspaceSlug}/stickies`,
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
