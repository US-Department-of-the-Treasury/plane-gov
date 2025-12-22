/* eslint-disable react-hooks/rules-of-hooks */
// Note: "use" is Playwright's fixture function, not a React hook
/**
 * Combined Test Fixtures
 *
 * Merges all fixtures into a single test export.
 * Import this in test files for full functionality.
 */

import { test as base, expect } from "@playwright/test";
import { ErrorTracker } from "./error-tracker";
import { TEST_WORKSPACE_SLUG, TEST_PROJECT_ID, AUTH_STATE_PATH, urls } from "./auth";

/**
 * Combined fixture types
 */
interface CombinedFixtures {
  /** Error tracking during tests */
  errorTracker: ErrorTracker;
  /** Test workspace slug */
  workspaceSlug: string;
  /** Test project ID */
  projectId: string;
  /** URL builder utilities */
  urls: typeof urls;
}

/**
 * Combined test fixture with error tracking and auth context
 */
export const test = base.extend<CombinedFixtures>({
  // Use stored auth state
  storageState: AUTH_STATE_PATH,

  // Error tracker fixture
  errorTracker: async ({ page }, use) => {
    const tracker = new ErrorTracker();
    tracker.attach(page);
    await use(tracker);
  },

  // Workspace slug
  workspaceSlug: TEST_WORKSPACE_SLUG,

  // Project ID
  projectId: TEST_PROJECT_ID,

  // URL helpers
  urls: async (_, use) => {
    await use(urls);
  },
});

export { expect, urls };
export { ErrorTracker } from "./error-tracker";
export type { TrackedError, ErrorTrackerOptions } from "./error-tracker";
export { TEST_WORKSPACE_SLUG, TEST_PROJECT_ID, TEST_USER, loginViaUI, isAuthenticated, AUTH_STATE_PATH } from "./auth";
