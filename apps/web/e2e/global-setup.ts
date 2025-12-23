import { chromium, FullConfig } from "@playwright/test";
import { loginViaUI, AUTH_STATE_PATH, TEST_WORKSPACE_SLUG } from "./fixtures/auth";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to store discovered project ID
const PROJECT_ID_PATH = path.join(path.dirname(AUTH_STATE_PATH), "project-id.txt");

// Path to project root (for running db seed)
// __dirname is apps/web/e2e, so go up 3 levels to reach project root
const PROJECT_ROOT = path.resolve(__dirname, "../../../");

/**
 * Seed the database with test data
 * Uses the Django management command directly for non-interactive execution
 */
function seedDatabase(): boolean {
  const apiDir = path.join(PROJECT_ROOT, "apps/api");
  const venvPath = path.join(apiDir, "venv");

  // Check if venv exists
  if (!fs.existsSync(venvPath)) {
    console.warn("Python venv not found - skipping database seed");
    console.warn("Run ./scripts/dev.sh first to set up the environment");
    return false;
  }

  // Check if .env exists
  const envPath = path.join(apiDir, ".env");
  if (!fs.existsSync(envPath)) {
    console.warn(".env not found - skipping database seed");
    return false;
  }

  console.log("Seeding database with test data...");

  try {
    // Run the db_reset command with --confirm to skip interactive prompt
    // Using shell to properly activate venv and source .env
    execSync(
      `cd "${apiDir}" && source venv/bin/activate && set -a && source .env && set +a && python manage.py db_reset --confirm`,
      {
        stdio: "inherit",
        shell: "/bin/bash",
        timeout: 120000, // 2 minute timeout
      }
    );
    console.log("Database seeded successfully");
    return true;
  } catch (error) {
    console.error("Failed to seed database:", error);
    return false;
  }
}

/**
 * Global Setup
 *
 * Runs once before all tests to:
 * 1. Seed the database with test data (if needed)
 * 2. Set up authentication state
 *
 * The auth state is saved and reused by all tests.
 */

async function globalSetup(config: FullConfig) {
  // Ensure auth directory exists
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Check if we should skip seeding (E2E_SKIP_SEED=1)
  const skipSeed = process.env.E2E_SKIP_SEED === "1";

  // Check if we already have valid auth state AND project ID
  const hasValidAuth = fs.existsSync(AUTH_STATE_PATH) && fs.existsSync(PROJECT_ID_PATH);
  if (hasValidAuth) {
    const authStats = fs.statSync(AUTH_STATE_PATH);
    const projectStats = fs.statSync(PROJECT_ID_PATH);
    const hoursSinceModified = (Date.now() - authStats.mtimeMs) / (1000 * 60 * 60);
    const projectHoursSinceModified = (Date.now() - projectStats.mtimeMs) / (1000 * 60 * 60);

    // Reuse auth state if both are less than 24 hours old
    if (hoursSinceModified < 24 && projectHoursSinceModified < 24) {
      const projectId = fs.readFileSync(PROJECT_ID_PATH, "utf-8").trim();
      console.log(`Using existing auth state and project ID: ${projectId}`);
      return;
    }
  }

  // Seed database before creating auth state (unless skipped)
  if (!skipSeed) {
    seedDatabase();
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

      // Find project links that contain a UUID in the href (not just /projects/)
      // Pattern: /workspace/projects/UUID/... where UUID is 36 chars
      const projectLinks = page.locator('a[href*="/projects/"]');
      const count = await projectLinks.count();

      for (let i = 0; i < count; i++) {
        const href = await projectLinks.nth(i).getAttribute("href");
        if (href) {
          // Extract UUID from href like /test-workspace/projects/59f71e93-e63d-4cf2-b5d3-3673d5f5b04f/issues
          const match = href.match(/\/projects\/([a-f0-9-]{36})/);
          if (match) {
            const projectId = match[1];
            fs.writeFileSync(PROJECT_ID_PATH, projectId);
            console.log(`Project ID discovered and saved: ${projectId}`);
            break;
          }
        }
      }

      // Verify file was written
      if (!fs.existsSync(PROJECT_ID_PATH)) {
        console.warn("Could not find any project with UUID in href. Links found:", count);
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
