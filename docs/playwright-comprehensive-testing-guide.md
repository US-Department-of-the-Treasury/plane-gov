# Playwright Comprehensive Application Testing Guide

**Version:** Playwright 1.57.0
**Project:** Plane - Treasury Fork
**Date:** 2025-12-22

This document provides comprehensive patterns for detecting runtime errors like "Cannot read properties of undefined" and building robust test suites.

---

## Table of Contents

1. [Console Error Capture and Assertion APIs](#console-error-capture)
2. [Network Request Interception for Error Detection](#network-interception)
3. [Page Event Handling (console, pageerror)](#page-event-handling)
4. [Screenshot and Video Capture for Debugging](#screenshot-video)
5. [Test Fixtures and Setup/Teardown](#test-fixtures)
6. [Expect Assertions for React Applications](#expect-assertions)
7. [Locator Strategies for Modern React Apps](#locator-strategies)
8. [Global Setup/Teardown for Authentication](#global-setup)
9. [Reporter Configuration](#reporter-configuration)
10. [Best Practices](#best-practices)

---

## 1. Console Error Capture and Assertion APIs {#console-error-capture}

### Current Implementation

Your existing test already implements basic console capture:

```typescript
// From /Users/corcoss/code/plane/apps/web/e2e/migration-verification.spec.ts
const consoleMessages: { type: string; text: string; url: string }[] = [];

test.beforeEach(({ page }) => {
  consoleMessages.length = 0;

  // Listen for console messages
  page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    if (!shouldIgnoreMessage(text)) {
      consoleMessages.push({
        type: msg.type(),
        text: text,
        url: page.url(),
      });
    }
  });

  // Listen for page errors
  page.on("pageerror", (error) => {
    if (!shouldIgnoreMessage(error.message)) {
      consoleMessages.push({
        type: "pageerror",
        text: error.message,
        url: page.url(),
      });
    }
  });
});
```

### Enhanced Console Capture Patterns

#### 1. Capture Console Arguments

```typescript
page.on('console', async (msg: ConsoleMessage) => {
  const values = [];
  for (const arg of msg.args()) {
    // Get actual JavaScript values from console
    values.push(await arg.jsonValue());
  }
  console.log(`[${msg.type()}]`, ...values);
});
```

#### 2. Retrieve All Console Messages

Playwright stores up to 200 console messages:

```typescript
// Get all console messages collected so far
const messages = await page.consoleMessages();
messages.forEach(msg => {
  console.log(`${msg.type()}: ${msg.text()}`);
});
```

#### 3. Filter by Console Type

```typescript
const errors = consoleMessages.filter(msg =>
  msg.type === "error" || msg.type === "pageerror"
);

const warnings = consoleMessages.filter(msg =>
  msg.type === "warning"
);

// Assert no errors
expect(errors.length).toBe(0);
```

#### 4. Pattern-Based Error Detection

```typescript
function detectRuntimeErrors(messages: ConsoleMessage[]): string[] {
  const errorPatterns = [
    /Cannot read properties? of undefined/,
    /Cannot read properties? of null/,
    /is not a function/,
    /is not defined/,
    /Uncaught TypeError/,
    /Uncaught ReferenceError/,
    /Maximum call stack size exceeded/,
    /Out of memory/,
  ];

  return messages
    .filter(msg => msg.type === "error" || msg.type === "pageerror")
    .filter(msg => errorPatterns.some(pattern => pattern.test(msg.text)))
    .map(msg => msg.text);
}

test('page has no runtime errors', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const runtimeErrors = detectRuntimeErrors(consoleMessages);

  if (runtimeErrors.length > 0) {
    console.log('Runtime errors detected:');
    runtimeErrors.forEach(err => console.log(`  - ${err}`));
  }

  expect(runtimeErrors.length).toBe(0);
});
```

#### 5. Stack Trace Capture

```typescript
page.on('pageerror', (error) => {
  console.error('Page error:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
});
```

---

## 2. Network Request Interception for Error Detection {#network-interception}

### Monitor Network Events

```typescript
test('track failed network requests', async ({ page }) => {
  const failedRequests: Request[] = [];

  // Listen for all requests
  page.on('request', request => {
    console.log('>>', request.method(), request.url());
  });

  // Listen for responses
  page.on('response', response => {
    console.log('<<', response.status(), response.url());

    // Track failed requests
    if (!response.ok()) {
      failedRequests.push(response.request());
    }
  });

  // Listen for failed requests (network errors)
  page.on('requestfailed', request => {
    console.error('Request failed:', request.url(), request.failure()?.errorText);
    failedRequests.push(request);
  });

  await page.goto('/');

  // Assert no critical API failures
  const criticalFailures = failedRequests.filter(req =>
    req.url().includes('/api/')
  );

  expect(criticalFailures.length).toBe(0);
});
```

### Intercept and Mock Failing APIs

```typescript
test.beforeEach(async ({ page }) => {
  // Mock API to always return success
  await page.route('**/api/data', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [] }),
  }));

  // Abort unnecessary resources
  await page.route(/(png|jpeg|jpg|svg|woff2)$/, route => route.abort());
});
```

### Wait for Specific Network Responses

```typescript
test('wait for API call before asserting', async ({ page }) => {
  // Start waiting for response before triggering action
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/user') && response.status() === 200
  );

  await page.goto('/dashboard');

  const response = await responsePromise;
  const body = await response.json();

  expect(body.user).toBeDefined();
});
```

### Track Request/Response Logs

```typescript
const networkLogs: Array<{
  type: 'request' | 'response' | 'failed';
  url: string;
  status?: number;
  method?: string;
  error?: string;
}> = [];

page.on('request', request => {
  networkLogs.push({
    type: 'request',
    url: request.url(),
    method: request.method(),
  });
});

page.on('response', response => {
  networkLogs.push({
    type: 'response',
    url: response.url(),
    status: response.status(),
  });
});

page.on('requestfailed', request => {
  networkLogs.push({
    type: 'failed',
    url: request.url(),
    error: request.failure()?.errorText,
  });
});
```

---

## 3. Page Event Handling (console, pageerror) {#page-event-handling}

### All Available Page Events

```typescript
// Page closed
page.on('close', () => {
  console.log('Page closed');
});

// JavaScript console API called
page.on('console', msg => {
  console.log(`Console [${msg.type()}]:`, msg.text());
});

// Page crashed
page.on('crash', () => {
  console.error('Page crashed!');
});

// JavaScript dialog (alert, prompt, confirm)
page.on('dialog', async dialog => {
  console.log(`Dialog: ${dialog.type()} - ${dialog.message()}`);
  await dialog.accept();
});

// DOM Content Loaded
page.on('domcontentloaded', () => {
  console.log('DOM Content Loaded');
});

// Download started
page.on('download', download => {
  console.log('Download:', download.suggestedFilename());
});

// File chooser opened
page.on('filechooser', fileChooser => {
  console.log('File chooser opened');
});

// Frame attached
page.on('frameattached', frame => {
  console.log('Frame attached:', frame.url());
});

// Frame detached
page.on('framedetached', frame => {
  console.log('Frame detached:', frame.url());
});

// Frame navigated
page.on('framenavigated', frame => {
  console.log('Frame navigated:', frame.url());
});

// Page load event
page.on('load', () => {
  console.log('Page loaded');
});

// Uncaught exception
page.on('pageerror', error => {
  console.error('Uncaught exception:', error.message);
});

// New popup opened
page.on('popup', popup => {
  console.log('Popup opened:', popup.url());
});

// Request initiated
page.on('request', request => {
  console.log('Request:', request.url());
});

// Request failed
page.on('requestfailed', request => {
  console.error('Request failed:', request.url());
});

// Request finished
page.on('requestfinished', request => {
  console.log('Request finished:', request.url());
});

// Response received
page.on('response', response => {
  console.log('Response:', response.url(), response.status());
});

// WebSocket created
page.on('websocket', ws => {
  console.log('WebSocket:', ws.url());
});

// Web Worker created
page.on('worker', worker => {
  console.log('Worker:', worker.url());
});
```

### Comprehensive Error Tracking

```typescript
type ErrorEvent = {
  type: 'console' | 'pageerror' | 'requestfailed' | 'crash';
  timestamp: number;
  message: string;
  url: string;
  stack?: string;
};

const errors: ErrorEvent[] = [];

test.beforeEach(({ page }) => {
  errors.length = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({
        type: 'console',
        timestamp: Date.now(),
        message: msg.text(),
        url: page.url(),
      });
    }
  });

  page.on('pageerror', error => {
    errors.push({
      type: 'pageerror',
      timestamp: Date.now(),
      message: error.message,
      url: page.url(),
      stack: error.stack,
    });
  });

  page.on('requestfailed', request => {
    errors.push({
      type: 'requestfailed',
      timestamp: Date.now(),
      message: `Failed: ${request.url()}`,
      url: page.url(),
    });
  });

  page.on('crash', () => {
    errors.push({
      type: 'crash',
      timestamp: Date.now(),
      message: 'Page crashed',
      url: page.url(),
    });
  });
});

test.afterEach(() => {
  if (errors.length > 0) {
    console.log('\n=== Errors Detected ===');
    errors.forEach(err => {
      console.log(`[${err.type}] ${new Date(err.timestamp).toISOString()}`);
      console.log(`  ${err.message}`);
      if (err.stack) {
        console.log(`  Stack: ${err.stack.split('\n')[0]}`);
      }
    });
  }
});
```

---

## 4. Screenshot and Video Capture for Debugging {#screenshot-video}

### Screenshots

#### Basic Screenshot

```typescript
test('take screenshot on error', async ({ page }) => {
  await page.goto('/');

  try {
    await expect(page.getByText('Expected Text')).toBeVisible();
  } catch (error) {
    // Take screenshot when assertion fails
    await page.screenshot({ path: 'screenshots/error.png' });
    throw error;
  }
});
```

#### Full Page Screenshot

```typescript
await page.screenshot({
  path: 'screenshot.png',
  fullPage: true
});
```

#### Element Screenshot

```typescript
await page.locator('.header').screenshot({
  path: 'header.png'
});
```

#### Screenshot to Buffer

```typescript
const buffer = await page.screenshot();
console.log(buffer.toString('base64'));
```

#### Automatic Screenshots on Failure

```typescript
// In playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    // Options: 'off' | 'on' | 'only-on-failure'
  },
});
```

### Videos

#### Configure Video Recording

```typescript
// In playwright.config.ts
export default defineConfig({
  use: {
    video: 'retain-on-failure',
    // Options: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry'
  },
});
```

#### Custom Video Configuration

```typescript
export default defineConfig({
  use: {
    video: {
      mode: 'on-first-retry',
      size: { width: 640, height: 480 }
    }
  },
});
```

#### Access Video Path

```typescript
test('access video', async ({ page }) => {
  await page.goto('/');
  // ... test actions

  // Video is only available after page/context closes
  const path = await page.video()?.path();
  console.log('Video saved to:', path);
});
```

### Test Attachment for Debugging

```typescript
import { test } from '@playwright/test';

test('attach debugging info', async ({ page }, testInfo) => {
  await page.goto('/');

  // Attach screenshot
  const screenshot = await page.screenshot();
  await testInfo.attach('screenshot', {
    body: screenshot,
    contentType: 'image/png',
  });

  // Attach HTML snapshot
  const html = await page.content();
  await testInfo.attach('page-content', {
    body: html,
    contentType: 'text/html',
  });

  // Attach custom data
  await testInfo.attach('console-logs', {
    body: JSON.stringify(consoleMessages, null, 2),
    contentType: 'application/json',
  });
});
```

---

## 5. Test Fixtures and Setup/Teardown {#test-fixtures}

### Built-in Fixtures

Your tests already use built-in fixtures:

```typescript
test('test name', async ({ page, context, browser, browserName, request }) => {
  // page - Isolated page for this test
  // context - Browser context (isolated cookies, storage)
  // browser - Shared browser instance
  // browserName - 'chromium' | 'firefox' | 'webkit'
  // request - API testing context
});
```

### Custom Fixtures

#### Create Custom Fixture for Console Tracking

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

type ConsoleLog = {
  type: string;
  text: string;
  url: string;
  timestamp: number;
};

type ConsoleFixture = {
  consoleLogs: ConsoleLog[];
  setupConsoleTracking: () => Promise<void>;
};

export const test = base.extend<ConsoleFixture>({
  consoleLogs: async ({}, use) => {
    const logs: ConsoleLog[] = [];
    await use(logs);
  },

  setupConsoleTracking: async ({ page, consoleLogs }, use) => {
    const setup = async () => {
      page.on('console', msg => {
        consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
          url: page.url(),
          timestamp: Date.now(),
        });
      });

      page.on('pageerror', error => {
        consoleLogs.push({
          type: 'pageerror',
          text: error.message,
          url: page.url(),
          timestamp: Date.now(),
        });
      });
    };

    await use(setup);
  },
});

export { expect } from '@playwright/test';
```

#### Use Custom Fixture

```typescript
import { test, expect } from './fixtures';

test('uses console tracking', async ({ page, setupConsoleTracking, consoleLogs }) => {
  await setupConsoleTracking();

  await page.goto('/');
  await page.waitForTimeout(2000);

  const errors = consoleLogs.filter(log =>
    log.type === 'error' || log.type === 'pageerror'
  );

  expect(errors).toHaveLength(0);
});
```

### Page Fixture with Auto-Navigation

```typescript
export const test = base.extend({
  page: async ({ baseURL, page }, use) => {
    // Navigate to baseURL automatically
    await page.goto(baseURL);
    await use(page);
  },
});

// In test file
test.use({ baseURL: 'http://localhost:3000' });
```

### Authenticated User Fixture

```typescript
type AuthFixture = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    // Perform login
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for login to complete
    await page.waitForURL('/dashboard');

    await use(page);

    // Cleanup: logout
    await page.getByRole('button', { name: 'Logout' }).click();
  },
});
```

---

## 6. Expect Assertions for React Applications {#expect-assertions}

### Auto-Retrying Assertions

These assertions wait until the condition is met (default 5s timeout):

```typescript
// Element visibility
await expect(page.getByText('Welcome')).toBeVisible();
await expect(page.getByRole('button')).toBeHidden();

// Element state
await expect(page.getByRole('checkbox')).toBeChecked();
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();
await expect(page.getByRole('textbox')).toBeEditable();
await expect(page.getByRole('textbox')).toBeFocused();

// Text content
await expect(page.getByTestId('status')).toHaveText('Submitted');
await expect(page.getByRole('heading')).toContainText('Welcome');

// Attributes
await expect(page.getByRole('link')).toHaveAttribute('href', '/about');
await expect(page.getByRole('button')).toHaveClass('btn-primary');
await expect(page.getByRole('button')).toHaveId('submit-btn');

// CSS
await expect(page.locator('.box')).toHaveCSS('color', 'rgb(255, 0, 0)');

// Count
await expect(page.getByRole('listitem')).toHaveCount(5);

// Value
await expect(page.getByRole('textbox')).toHaveValue('John');

// URL and Title
await expect(page).toHaveTitle(/Playwright/);
await expect(page).toHaveURL('http://localhost:3000/dashboard');
```

### React-Specific Patterns

```typescript
// Wait for React component to render
await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();

// Check component prop rendering
await expect(page.getByTestId('username')).toHaveText('JohnDoe');

// Verify list rendering
const items = page.getByRole('listitem');
await expect(items).toHaveCount(3);
await expect(items.nth(0)).toContainText('Item 1');

// Check for loading states
await expect(page.getByText('Loading...')).toBeHidden();

// Verify error messages
await expect(page.getByRole('alert')).toContainText('Error: Invalid input');
```

### Custom Expect Messages

```typescript
await expect(
  page.getByText('Name'),
  'User should be logged in'
).toBeVisible();
```

### Soft Assertions (Don't Stop Test)

```typescript
// Soft assertions don't terminate test execution
await expect.soft(page.getByTestId('status')).toHaveText('Success');
await expect.soft(page.getByTestId('eta')).toHaveText('1 day');

// Continue test even if above failed
await page.getByRole('link', { name: 'next page' }).click();

// Check if there were any failures
expect(test.info().errors).toHaveLength(0);
```

### Polling Assertions

```typescript
// Poll until condition is met
await expect.poll(async () => {
  const response = await page.request.get('/api/status');
  return response.status();
}, {
  message: 'API should return 200',
  timeout: 10000,
}).toBe(200);
```

### Negative Assertions

```typescript
await expect(page.getByText('Error')).not.toBeVisible();
await expect(page.getByRole('button')).not.toBeDisabled();
```

---

## 7. Locator Strategies for Modern React Apps {#locator-strategies}

### Recommended Locator Priority

1. **Role-based (Best)** - Reflects how users perceive the page
2. **Label-based** - Natural for form controls
3. **Test ID** - Explicit contracts with test
4. **Text content** - User-visible text
5. **CSS/XPath (Last Resort)** - Fragile, tied to implementation

### Role-Based Locators

```typescript
// Buttons
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByRole('button', { name: /submit/i }).click(); // Case insensitive

// Headings
await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();

// Links
await page.getByRole('link', { name: 'About' }).click();

// Form controls
await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
await page.getByRole('checkbox', { name: 'Subscribe' }).check();
await page.getByRole('radio', { name: 'Option 1' }).check();

// Lists
const items = page.getByRole('listitem');
await expect(items).toHaveCount(5);

// Tables
const row = page.getByRole('row', { name: 'John' });
```

### Label-Based Locators

```typescript
// By label text
await page.getByLabel('Password').fill('secret');
await page.getByLabel('Email address').fill('user@example.com');

// By placeholder
await page.getByPlaceholder('Enter your email').fill('test@example.com');
```

### Test ID Locators

```typescript
// Exact match
await page.getByTestId('submit-button').click();

// In your React component:
<button data-testid="submit-button">Submit</button>

// Configure custom test ID attribute
// In playwright.config.ts
export default defineConfig({
  use: {
    testIdAttribute: 'data-test-id', // or 'data-qa', etc.
  },
});
```

### Text Content Locators

```typescript
// Exact text
await page.getByText('Welcome back').click();

// Substring
await page.getByText('Welcome', { exact: false }).click();

// Regex
await page.getByText(/welcome/i).click();
```

### Alt Text for Images

```typescript
await page.getByAltText('Company logo').click();
```

### Title Attribute

```typescript
await page.getByTitle('Close dialog').click();
```

### Chaining and Filtering

```typescript
// Find within another locator
const product = page.getByRole('listitem').filter({ hasText: 'Product 2' });
await product.getByRole('button', { name: 'Add to cart' }).click();

// Filter by text
const activeItems = page.getByRole('listitem').filter({ hasText: 'Active' });

// Filter by another locator
const completedTodos = page.getByRole('listitem').filter({
  has: page.locator('.completed')
});

// Get nth element
await page.getByRole('listitem').nth(0).click();
await page.getByRole('listitem').first().click();
await page.getByRole('listitem').last().click();

// Frame locators
await page.frameLocator('#my-iframe')
  .getByRole('button', { name: 'Submit' })
  .click();
```

### React Component Selectors

```typescript
// For React components with data-testid
const component = page.getByTestId('user-profile');

// Access nested elements
await component.getByRole('button', { name: 'Edit' }).click();

// Check component state via attributes
await expect(component).toHaveAttribute('data-loaded', 'true');
```

### Generate Locators with Codegen

```bash
# Launch test generator
npx playwright codegen http://localhost:3000

# Generate locators interactively
# Click "Pick locator" button, then click elements
```

---

## 8. Global Setup/Teardown for Authentication {#global-setup}

### Project-Level Setup (No File Found)

Since `/Users/corcoss/code/plane/docs/src/test-global-setup-teardown-js.md` returns 404, here are the patterns:

### Global Setup File

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Perform login
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for login to complete
  await page.waitForURL('**/dashboard');

  // Save authenticated state
  await page.context().storageState({
    path: 'playwright/.auth/user.json'
  });

  await browser.close();
}

export default globalSetup;
```

### Global Teardown File

```typescript
// global-teardown.ts
import { FullConfig } from '@playwright/test';
import fs from 'fs';

async function globalTeardown(config: FullConfig) {
  // Cleanup auth files
  if (fs.existsSync('playwright/.auth/user.json')) {
    fs.unlinkSync('playwright/.auth/user.json');
  }
}

export default globalTeardown;
```

### Configure in playwright.config.ts

```typescript
export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),

  use: {
    // Use saved authentication state
    storageState: 'playwright/.auth/user.json',
  },
});
```

### Per-Test Setup with beforeEach

```typescript
test.beforeEach(async ({ page }) => {
  // Runs before each test
  await page.goto('http://localhost:3000');

  // Setup console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text());
    }
  });
});

test.afterEach(async ({ page }, testInfo) => {
  // Runs after each test
  if (testInfo.status !== 'passed') {
    // Take screenshot on failure
    await page.screenshot({
      path: `screenshots/${testInfo.title}-failure.png`
    });
  }
});
```

### Setup Project Pattern

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('**/dashboard');

  // Save storage state
  await page.context().storageState({
    path: 'playwright/.auth/user.json'
  });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

---

## 9. Reporter Configuration for Detailed Error Output {#reporter-configuration}

### Current Configuration

```typescript
// From /Users/corcoss/code/plane/apps/web/playwright.config.ts
export default defineConfig({
  reporter: "html",
  // ...
});
```

### Multiple Reporters

```typescript
export default defineConfig({
  reporter: [
    // Console output during test run
    ['list'],

    // HTML report for detailed results
    ['html', {
      open: 'on-failure',
      outputFolder: 'playwright-report',
    }],

    // JSON for programmatic access
    ['json', {
      outputFile: 'test-results/results.json'
    }],

    // JUnit for CI integration
    ['junit', {
      outputFile: 'test-results/junit.xml'
    }],
  ],
});
```

### List Reporter with Steps

```typescript
export default defineConfig({
  reporter: [
    ['list', {
      printSteps: true  // Show each test step
    }]
  ],
});
```

### Custom Reporter for Console Errors

```typescript
// custom-reporter.ts
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class ConsoleErrorReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed') {
      console.log(`\n❌ ${test.title} FAILED`);

      // Log console errors from attachments
      result.attachments.forEach(attachment => {
        if (attachment.name === 'console-logs') {
          console.log('Console errors:');
          console.log(attachment.body?.toString());
        }
      });

      // Log error message
      console.log('\nError:', result.error?.message);

      // Log stack trace (first 5 lines)
      if (result.error?.stack) {
        const stackLines = result.error.stack.split('\n').slice(0, 5);
        console.log('Stack trace:');
        stackLines.forEach(line => console.log(`  ${line}`));
      }
    }
  }
}

export default ConsoleErrorReporter;
```

```typescript
// Use in playwright.config.ts
export default defineConfig({
  reporter: [
    ['./custom-reporter.ts'],
    ['html'],
  ],
});
```

### Reporter Environment Variables

```bash
# Configure HTML reporter
PLAYWRIGHT_HTML_OPEN=never npx playwright test
PLAYWRIGHT_HTML_OUTPUT_DIR=custom-report npx playwright test

# List reporter with colors
FORCE_COLOR=1 npx playwright test --reporter=list

# JSON output
PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json
```

---

## 10. Best Practices Summary {#best-practices}

### 1. Test Isolation

```typescript
// ✅ Good - Each test is independent
test('test 1', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button').click();
});

test('test 2', async ({ page }) => {
  await page.goto('/');  // Fresh page for each test
  await page.getByRole('button').click();
});

// ❌ Bad - Tests depend on each other
let sharedState;
test('test 1', async ({ page }) => {
  sharedState = await page.textContent('.data');
});
test('test 2', async ({ page }) => {
  expect(sharedState).toBe('value');  // Depends on test 1
});
```

### 2. Use Web-First Assertions

```typescript
// ✅ Good - Auto-waits and retries
await expect(page.getByText('welcome')).toBeVisible();

// ❌ Bad - No waiting, immediate check
expect(await page.getByText('welcome').isVisible()).toBe(true);
```

### 3. Prioritize User-Facing Selectors

```typescript
// ✅ Good - User-facing attributes
page.getByRole('button', { name: 'Submit' });
page.getByLabel('Email');
page.getByPlaceholder('Enter email');

// ❌ Bad - Implementation details
page.locator('button.btn-primary.submit-btn');
page.locator('#submitButton');
```

### 4. Error Detection Pattern

```typescript
// Recommended pattern for comprehensive error detection
test('page loads without errors', async ({ page }) => {
  const errors: string[] = [];

  // Capture all error types
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console: ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`Page error: ${error.message}`);
  });

  page.on('requestfailed', request => {
    errors.push(`Network: ${request.url()} failed`);
  });

  // Navigate and interact
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Interact with page
  await page.getByRole('button', { name: 'Load Data' }).click();
  await page.waitForTimeout(2000);

  // Assert no errors
  if (errors.length > 0) {
    console.log('Errors detected:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  expect(errors).toHaveLength(0);
});
```

### 5. Debugging Failed Tests

```typescript
test('debug on failure', async ({ page }, testInfo) => {
  try {
    await page.goto('/');
    await expect(page.getByText('Expected')).toBeVisible();
  } catch (error) {
    // Capture debug info
    await testInfo.attach('screenshot', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });

    await testInfo.attach('html', {
      body: await page.content(),
      contentType: 'text/html',
    });

    // Get console logs
    const consoleLogs = await page.consoleMessages();
    await testInfo.attach('console-logs', {
      body: JSON.stringify(consoleLogs.map(m => ({
        type: m.type(),
        text: m.text(),
      })), null, 2),
      contentType: 'application/json',
    });

    throw error;
  }
});
```

---

## Configuration Reference

### Your Current Configuration

```typescript
// /Users/corcoss/code/plane/apps/web/playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Enhanced Configuration for Error Detection

```typescript
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Multiple reporters for comprehensive output
  reporter: [
    ['list', { printSteps: true }],
    ['html', { open: 'on-failure' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: "http://localhost:3000",

    // Trace on retry for debugging
    trace: "on-first-retry",

    // Screenshots on failure
    screenshot: "only-on-failure",

    // Video on retry
    video: "retain-on-failure",

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Test timeout
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Global timeout
  timeout: 60000,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## Quick Reference Commands

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/migration-verification.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run with specific reporter
npx playwright test --reporter=list

# Debug mode
npx playwright test --debug

# Run specific project
npx playwright test --project=chromium

# Generate code/locators
npx playwright codegen http://localhost:3000

# Show last HTML report
npx playwright show-report

# Run tests with trace
npx playwright test --trace on

# Run specific test by line number
npx playwright test e2e/migration-verification.spec.ts:75
```

---

## References

- **Official Docs:** https://playwright.dev/docs/intro
- **API Reference:** https://playwright.dev/docs/api/class-playwright
- **Debugging Guide:** https://playwright.dev/docs/debug
- **Best Practices:** https://playwright.dev/docs/best-practices
- **Network Events:** https://playwright.dev/docs/network
- **Locators Guide:** https://playwright.dev/docs/locators
- **Assertions:** https://playwright.dev/docs/test-assertions

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**For Project:** Plane - Treasury Fork (`plane-treasury`)
