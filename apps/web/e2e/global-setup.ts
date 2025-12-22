import { chromium, FullConfig } from "@playwright/test";
import { loginViaUI, AUTH_STATE_PATH } from "./fixtures/auth";
import fs from "fs";
import path from "path";

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
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Go to login page
    await page.goto(baseURL);

    // Check if we're already logged in (e.g., if app auto-logs in from env)
    const url = page.url();
    if (url.includes("/treasury") || url.includes("/workspace")) {
      console.log("Already authenticated, saving state");
    } else {
      // Perform login
      await loginViaUI(page);
      console.log("Login successful");
    }

    // Save storage state
    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`Auth state saved to ${AUTH_STATE_PATH}`);
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
