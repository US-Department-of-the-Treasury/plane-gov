import type { FullConfig } from "@playwright/test";

/**
 * Global Teardown
 *
 * Runs once after all tests complete.
 * Use for cleanup of test data or resources.
 */

function globalTeardown(_config: FullConfig) {
  console.log("E2E tests completed. Running teardown...");

  // Add any cleanup logic here, such as:
  // - Deleting test workspaces
  // - Cleaning up test data via API
  // - Closing external connections

  console.log("Teardown complete.");
}

export default globalTeardown;
