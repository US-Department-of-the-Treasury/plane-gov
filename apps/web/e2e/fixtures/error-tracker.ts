/* eslint-disable react-hooks/rules-of-hooks */
// Note: "use" is Playwright's fixture function, not a React hook
import { test as base, Page, ConsoleMessage, Request, Response } from "@playwright/test";

/**
 * Error Tracker Fixture
 *
 * Captures and filters console errors, page errors, and network failures
 * during Playwright tests. Provides methods to assert no errors occurred.
 */

export interface TrackedError {
  type: "console" | "pageerror" | "request-failed" | "server-error";
  message: string;
  url: string;
  timestamp: Date;
  stack?: string;
}

export interface ErrorTrackerOptions {
  /** Custom patterns to ignore in addition to defaults */
  ignorePatterns?: RegExp[];
  /** Whether to track network failures (default: true) */
  trackNetworkFailures?: boolean;
  /** Whether to track 5xx server errors (default: true) */
  trackServerErrors?: boolean;
}

const DEFAULT_IGNORE_PATTERNS = [
  // React development warnings that are expected
  /Warning: ReactDOM.render is no longer supported/,
  /Warning: Using UNSAFE_/,
  /Warning: Cannot update a component/,

  // React Router SPA mode hydration mismatch - expected in SPA mode
  /Minified React error #418/,
  /error #418/,
  /Hydration failed/,
  /There was an error while hydrating/,

  // Source map and DevTools warnings
  /DevTools failed to load source map/,
  /Could not load content for/,
  /Failed to load resource.*\.map/,

  // Auth-related errors when not logged in (expected)
  /401 Unauthorized/,
  /403 Forbidden/,
  /Failed to load resource.*401/,
  /Failed to load resource.*403/,

  // React Router lazy loading errors
  /React Router caught the following error during render/,

  // Missing env file warnings
  /MISSING_ENV_FILE/,

  // Favicon and static asset 404s
  /favicon\.ico/,
  /manifest\.json.*404/,

  // PostHog/Analytics (if any remnants)
  /posthog/i,

  // Vite HMR websocket (development)
  /WebSocket connection to.*failed/,

  // Browser extensions
  /chrome-extension/,
  /moz-extension/,
];

export class ErrorTracker {
  private errors: TrackedError[] = [];
  private ignorePatterns: RegExp[];
  private trackNetworkFailures: boolean;
  private trackServerErrors: boolean;

  constructor(options: ErrorTrackerOptions = {}) {
    this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...(options.ignorePatterns ?? [])];
    this.trackNetworkFailures = options.trackNetworkFailures ?? true;
    this.trackServerErrors = options.trackServerErrors ?? true;
  }

  private shouldIgnore(message: string): boolean {
    return this.ignorePatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Attach error tracking listeners to a page
   */
  attach(page: Page): void {
    // Console errors
    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!this.shouldIgnore(text)) {
          this.errors.push({
            type: "console",
            message: text,
            url: page.url(),
            timestamp: new Date(),
          });
        }
      }
    });

    // Page errors (uncaught exceptions)
    page.on("pageerror", (error: Error) => {
      if (!this.shouldIgnore(error.message)) {
        this.errors.push({
          type: "pageerror",
          message: error.message,
          url: page.url(),
          timestamp: new Date(),
          stack: error.stack,
        });
      }
    });

    // Network request failures
    if (this.trackNetworkFailures) {
      page.on("requestfailed", (request: Request) => {
        const failure = request.failure();
        const message = `Request failed: ${request.url()} - ${failure?.errorText ?? "unknown"}`;
        if (!this.shouldIgnore(message)) {
          this.errors.push({
            type: "request-failed",
            message,
            url: page.url(),
            timestamp: new Date(),
          });
        }
      });
    }

    // 5xx server errors
    if (this.trackServerErrors) {
      page.on("response", (response: Response) => {
        const status = response.status();
        if (status >= 500 && status < 600) {
          const message = `Server error: ${response.url()} - ${status} ${response.statusText()}`;
          if (!this.shouldIgnore(message)) {
            this.errors.push({
              type: "server-error",
              message,
              url: page.url(),
              timestamp: new Date(),
            });
          }
        }
      });
    }
  }

  /**
   * Get all tracked errors
   */
  getErrors(): TrackedError[] {
    return [...this.errors];
  }

  /**
   * Get errors filtered by type
   */
  getErrorsByType(type: TrackedError["type"]): TrackedError[] {
    return this.errors.filter((e) => e.type === type);
  }

  /**
   * Get errors matching a pattern
   */
  getErrorsMatching(pattern: RegExp): TrackedError[] {
    return this.errors.filter((e) => pattern.test(e.message));
  }

  /**
   * Check if any errors contain a specific message
   */
  hasErrorContaining(text: string): boolean {
    return this.errors.some((e) => e.message.includes(text));
  }

  /**
   * Get page errors (uncaught exceptions) - most critical
   */
  getPageErrors(): TrackedError[] {
    return this.getErrorsByType("pageerror");
  }

  /**
   * Get console errors
   */
  getConsoleErrors(): TrackedError[] {
    return this.getErrorsByType("console");
  }

  /**
   * Get total error count
   */
  count(): number {
    return this.errors.length;
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Clear all tracked errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Get a formatted error summary for test output
   */
  getSummary(): string {
    if (this.errors.length === 0) {
      return "No errors tracked";
    }

    const lines = [`${this.errors.length} error(s) tracked:\n`];

    for (const error of this.errors) {
      lines.push(`[${error.type}] ${error.message}`);
      lines.push(`  URL: ${error.url}`);
      if (error.stack) {
        lines.push(`  Stack: ${error.stack.split("\n")[0]}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}

/**
 * Playwright test fixture with error tracking
 */
type ErrorTrackerFixtures = {
  errorTracker: ErrorTracker;
};

export const test = base.extend<ErrorTrackerFixtures>({
  errorTracker: async ({ page }, use) => {
    const tracker = new ErrorTracker();
    tracker.attach(page);
    await use(tracker);
  },
});

export { expect } from "@playwright/test";
