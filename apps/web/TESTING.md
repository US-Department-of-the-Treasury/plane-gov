# End-to-End Testing Guide

This guide covers the Playwright-based E2E testing infrastructure for the Plane web application.

## Quick Start

```bash
# Run quick smoke tests (~2 minutes)
pnpm test:smoke

# Run comprehensive E2E tests (~10 minutes)
pnpm test:e2e

# Run all tests including interactions
pnpm test:comprehensive
```

Expected output on success:

```
✓ 15 passed (2m)
```

## Prerequisites

**One-time setup:**

```bash
# Install Playwright browsers (required first time only)
pnpm exec playwright install chromium

# Verify installation
pnpm exec playwright --version
```

**Running services:**

The application must be running before tests execute:

```bash
# Terminal 1: Start all services
pnpm dev:all
# Wait for "Web app: http://localhost:3000" message

# Terminal 2: Run tests
pnpm test:smoke
```

**Note:** The `webServer` configuration in `playwright.config.ts` can auto-start the dev server, but manual startup is recommended for faster feedback during development.

## Test Structure

```
apps/web/e2e/
├── fixtures/
│   ├── auth.ts           # Authentication helpers and fixtures
│   ├── error-tracker.ts  # Console error detection
│   └── index.ts          # Exports all fixtures
├── factories/
│   ├── issue.factory.ts  # Generate realistic issue data
│   ├── sprint.factory.ts # Generate sprint test data
│   ├── epic.factory.ts   # Generate epic test data
│   └── draft.factory.ts  # Generate draft test data
├── specs/
│   ├── smoke/            # Quick route loading tests (~2 min)
│   │   ├── auth-routes.spec.ts
│   │   ├── workspace-routes.spec.ts
│   │   ├── project-routes.spec.ts
│   │   └── settings-routes.spec.ts
│   ├── crud/             # Full E2E CRUD flows (~8 min)
│   │   ├── issues.spec.ts
│   │   ├── drafts.spec.ts
│   │   ├── sprints.spec.ts
│   │   └── epics.spec.ts
│   └── interactions/     # Complex UI interactions (future)
├── global-setup.ts       # Runs once: creates auth state
├── global-teardown.ts    # Runs once: cleanup
└── .auth/                # Stored authentication state (gitignored)
    └── user.json
```

## Test Commands

### Development Commands

```bash
# Smoke tests - quick route validation
pnpm test:smoke

# E2E tests - smoke + CRUD tests
pnpm test:e2e

# Comprehensive - all tests
pnpm test:comprehensive

# Interactive UI mode - for debugging
pnpm test:e2e:ui

# Headed mode - see browser during tests
pnpm test:e2e:headed

# Run specific test file
pnpm exec playwright test e2e/specs/crud/issues.spec.ts

# Run tests matching a pattern
pnpm exec playwright test --grep @smoke

# Debug a specific test
pnpm exec playwright test --debug e2e/specs/crud/issues.spec.ts
```

### CI Commands

```bash
# Run in CI mode (with retries)
CI=1 pnpm test:e2e

# Generate HTML report
pnpm exec playwright show-report

# View JSON results
cat test-results/results.json | jq
```

## Test Projects

The test suite is divided into projects for selective execution:

| Project        | Description                        | Run Command                              |
| -------------- | ---------------------------------- | ---------------------------------------- |
| `smoke`        | Quick route loading tests (~2 min) | `pnpm test:smoke`                        |
| `crud`         | Full CRUD E2E tests (~8 min)       | `playwright test --project=crud`         |
| `interactions` | Complex UI interactions (future)   | `playwright test --project=interactions` |
| `chromium`     | All tests in Chrome                | `playwright test --project=chromium`     |
| `mobile`       | Mobile viewport tests              | `playwright test --project=mobile`       |

## Authentication

Tests use a shared authentication state to avoid repeated logins.

### How It Works

1. **Global Setup** (`global-setup.ts`) runs once before all tests
2. Authenticates via UI using test credentials
3. Saves auth state to `e2e/.auth/user.json`
4. All tests reuse this auth state (valid for 24 hours)

### Environment Variables

```bash
# Test user credentials (set in .env or environment)
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_USER_PASSWORD=testpassword123

# Test workspace and project
E2E_TEST_WORKSPACE_SLUG=treasury
E2E_TEST_PROJECT_ID=test-project

# Base URL (optional, defaults to localhost:3000)
E2E_BASE_URL=http://localhost:3000
```

### Troubleshooting Auth

**Symptom:** Tests fail with "Not authenticated" or redirect to login

**Causes:**

- Auth state is stale (>24 hours old)
- Test user credentials changed
- Application cleared cookies

**Fix:**

```bash
# Delete stale auth state
rm -rf apps/web/e2e/.auth/

# Re-run tests (will create fresh auth)
pnpm test:smoke
```

## Test Data Factories

Use factories to generate realistic test data:

```typescript
import { createIssue, createBugIssue, createFeatureIssue } from "../../factories";

// Minimal issue (name only)
const issue = createIssue({ minimal: true });

// Complete issue (all fields)
const issue = createIssue({ complete: true });

// Issue with specific overrides
const issue = createIssue({
  overrides: {
    name: "Fix critical bug",
    priority: "urgent",
  },
});

// Pre-configured bug report
const bug = createBugIssue();

// Pre-configured feature request
const feature = createFeatureIssue();

// Multiple issues
const issues = createIssues(10, { minimal: true });
```

Available factories:

- `createIssue()` - Issues with various priorities
- `createSprint()` - Sprints with date ranges
- `createEpic()` - Epics with descriptions
- `createDraft()` - Draft issues

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "../../fixtures";

test.describe("Feature Name @smoke", () => {
  test("should do something", async ({ page, errorTracker, workspaceSlug }) => {
    // Navigate to page
    await page.goto(`/${workspaceSlug}/some-page`);
    await page.waitForLoadState("networkidle");

    // Interact with UI
    await page.click('button:has-text("Click Me")');
    await page.fill('input[name="field"]', "value");

    // Assert
    await expect(page.getByText("Success")).toBeVisible();

    // Verify no console errors
    const errors = errorTracker.getPageErrors();
    expect(errors).toHaveLength(0);
  });
});
```

### Using Fixtures

```typescript
test("with all fixtures", async ({
  page, // Authenticated Playwright page
  errorTracker, // Console error tracker
  workspaceSlug, // Test workspace slug (default: "treasury")
  projectId, // Test project ID (default: "test-project")
}) => {
  // page is already authenticated
  // errorTracker captures console.error() calls
  // workspaceSlug and projectId are from environment
});
```

### Error Tracking

Every test has access to `errorTracker` fixture:

```typescript
test("check for specific errors", async ({ page, errorTracker }) => {
  await page.goto("/some-page");

  // Get all console errors on this page
  const allErrors = errorTracker.getPageErrors();

  // Get errors matching a pattern
  const undefinedErrors = errorTracker.getErrorsMatching(/undefined/);

  // Get human-readable summary
  const summary = errorTracker.getSummary();
  console.log(summary);

  // Assert no errors
  expect(allErrors).toHaveLength(0);
});
```

### Best Practices

1. **Use selectors in order of preference:**

   ```typescript
   // 1. Test IDs (most stable)
   await page.click('[data-testid="add-issue"]');

   // 2. Semantic selectors
   await page.click('button[type="submit"]');

   // 3. Text content (last resort)
   await page.click('button:has-text("Create Issue")');
   ```

2. **Wait for network to settle:**

   ```typescript
   await page.goto("/path");
   await page.waitForLoadState("networkidle");
   await page.waitForTimeout(2000); // Additional buffer for async state updates
   ```

3. **Handle optional UI elements:**

   ```typescript
   const dropdown = page.locator('[data-testid="priority"]');
   if (await dropdown.isVisible()) {
     await dropdown.click();
   }
   ```

4. **Always check for errors:**
   ```typescript
   const pageErrors = errorTracker.getPageErrors();
   expect(pageErrors).toHaveLength(0);
   ```

## Debugging Tests

### Interactive UI Mode

The best way to debug tests:

```bash
pnpm test:e2e:ui
```

Features:

- Pick tests to run
- Step through test execution
- See browser state at each step
- Time-travel through test actions
- Inspect selectors visually

### Headed Mode

Watch the browser during test execution:

```bash
pnpm test:e2e:headed
```

### Trace Viewer

When tests fail in CI, traces are automatically captured:

```bash
# View trace from failed test
pnpm exec playwright show-trace test-results/.../trace.zip
```

### VS Code Extension

Install the [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) extension:

- Run/debug tests from editor
- Set breakpoints in test code
- See test results inline

### Console Logging

```typescript
test("debug test", async ({ page }) => {
  console.log("Current URL:", page.url());
  console.log("Page title:", await page.title());

  // Log element state
  const button = page.locator("button");
  console.log("Button visible:", await button.isVisible());
  console.log("Button text:", await button.textContent());
});
```

## CI Integration

Tests run automatically in CI via GitHub Actions:

```yaml
# .github/workflows/e2e-tests.yml
- name: Run E2E tests
  run: |
    pnpm install
    pnpm test:e2e
  env:
    CI: true
    E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
    E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
```

CI configuration:

- Runs smoke + CRUD tests by default
- 2 retries on failure
- 2 parallel workers (for stability)
- HTML and JSON reports generated
- Screenshots and videos on failure

## Troubleshooting

### Tests Fail with "Timeout waiting for page to load"

**Cause:** Dev server not running or slow to start

**Fix:**

```bash
# Start dev server manually first
pnpm dev:all

# Then run tests in separate terminal
pnpm test:smoke
```

### Tests Pass Locally but Fail in CI

**Common causes:**

- Race conditions (add `waitForLoadState("networkidle")`)
- Timing differences (increase timeouts)
- Missing auth credentials (check CI secrets)

**Fix:**

```typescript
// Add explicit waits
await page.waitForSelector('[data-testid="content"]', { timeout: 10000 });
await page.waitForTimeout(2000); // Buffer for async updates
```

### Playwright Browsers Not Installed

**Symptom:**

```
browserType.launch: Executable doesn't exist at /path/to/chromium
```

**Fix:**

```bash
pnpm exec playwright install chromium
```

### Auth State Invalid

**Symptom:** Tests redirect to login page

**Fix:**

```bash
rm -rf apps/web/e2e/.auth/
pnpm test:smoke  # Will recreate auth state
```

### Flaky Tests

**Causes:**

- Network timing issues
- Animation timing
- Race conditions in state updates

**Solutions:**

1. Add explicit waits:

   ```typescript
   await page.waitForLoadState("networkidle");
   await page.waitForTimeout(1000);
   ```

2. Use `waitForSelector` with retries:

   ```typescript
   await page.waitForSelector('[data-testid="element"]', {
     timeout: 10000,
     state: "visible",
   });
   ```

3. Increase test timeout in `playwright.config.ts`:
   ```typescript
   timeout: 90000, // 90 seconds
   ```

### Performance Issues

**Symptom:** Tests are too slow

**Optimizations:**

1. Run tests in parallel:

   ```bash
   pnpm exec playwright test --workers=4
   ```

2. Skip non-critical projects:

   ```bash
   pnpm test:smoke  # Only smoke tests
   ```

3. Use `fullyParallel: true` in test files:
   ```typescript
   test.describe.configure({ mode: "parallel" });
   ```

## Test Coverage

### Current Coverage

| Area             | Smoke Tests | CRUD Tests | Total Tests |
| ---------------- | ----------- | ---------- | ----------- |
| Auth Routes      | 2           | -          | 2           |
| Workspace Routes | 9           | -          | 9           |
| Project Routes   | 5           | -          | 5           |
| Settings Routes  | 7           | -          | 7           |
| Issues           | 1           | 8          | 9           |
| Drafts           | 1           | 8          | 9           |
| Sprints          | 1           | 6          | 7           |
| Epics            | 1           | 6          | 7           |
| **Total**        | **27**      | **28**     | **55**      |

### Adding New Tests

1. **Smoke tests** - Add to `e2e/specs/smoke/`
   - Quick route loading validation
   - No complex interactions
   - Focus on console error detection

2. **CRUD tests** - Add to `e2e/specs/crud/`
   - Full create, read, update, delete flows
   - Use factories for test data
   - Verify functionality and error-free execution

3. **Interaction tests** - Add to `e2e/specs/interactions/`
   - Complex UI interactions
   - Drag and drop
   - Modal workflows
   - Dropdown behaviors

## Further Reading

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Playwright Tests](https://playwright.dev/docs/debug)
- [Playwright VS Code Extension](https://playwright.dev/docs/getting-started-vscode)
