import { chromium, FullConfig } from "@playwright/test";
import { loginViaUI, AUTH_STATE_PATH, TEST_WORKSPACE_SLUG } from "./fixtures/auth";
import fs from "fs";
import path from "path";

// Path to store discovered project ID
const PROJECT_ID_PATH = path.join(path.dirname(AUTH_STATE_PATH), "project-id.txt");

/**
 * Global Setup
 *
 * Runs once before all tests to set up authentication state.
 * The auth state is saved and reused by all tests.
 */

async function globalSetup(config: FullConfig) {
  // Ensure auth directory exists
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Check if we already have valid auth state
  if (fs.existsSync(AUTH_STATE_PATH)) {
    const stats = fs.statSync(AUTH_STATE_PATH);
    const hoursSinceModified = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

    // Reuse auth state if less than 24 hours old
    if (hoursSinceModified < 24) {
      console.log("Using existing auth state (less than 24 hours old)");
      return;
    }
  }

  console.log("Creating new auth state...");

  // Get baseURL from config
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL, // Set baseURL so relative URLs work
  });
  const page = await context.newPage();

  try {
    // Go to login page (relative URL works because baseURL is set on context)
    await page.goto("/");

    // Check if we're already logged in (e.g., if app auto-logs in from env)
    const url = page.url();
    if (url.includes(`/${TEST_WORKSPACE_SLUG}`) || url.includes("/workspace")) {
      console.log("Already authenticated, saving state");
    } else {
      // Perform login
      await loginViaUI(page);
      console.log("Login successful");
    }

    // Save storage state
    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`Auth state saved to ${AUTH_STATE_PATH}`);

    // Fetch project ID for tests
    try {
      await page.goto(`/${TEST_WORKSPACE_SLUG}/projects`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find first project link and extract project ID from href
      const projectLink = page.locator('a[href*="/projects/"]').first();
      const href = await projectLink.getAttribute("href");
      if (href) {
        // Extract UUID from href like /test-workspace/projects/59f71e93-e63d-4cf2-b5d3-3673d5f5b04f/issues
        const match = href.match(/\/projects\/([a-f0-9-]{36})/);
        if (match) {
          const projectId = match[1];
          fs.writeFileSync(PROJECT_ID_PATH, projectId);
          console.log(`Project ID discovered and saved: ${projectId}`);
        }
      }
    } catch (projectError) {
      console.warn("Could not discover project ID:", projectError);
    }
  } catch (error) {
    console.error("Failed to create auth state:", error);
    // Create empty auth state so tests can run (they'll handle auth individually)
    const emptyState = {
      cookies: [],
      origins: [],
    };
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(emptyState, null, 2));
    console.log("Created empty auth state - tests may need to handle authentication individually");
  } finally {
    await browser.close();
  }
}

export default globalSetup;
