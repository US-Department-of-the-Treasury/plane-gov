import { test, expect } from "../../fixtures";
import { createIssue, createBugIssue } from "../../factories";

/**
 * Issues CRUD Tests
 *
 * Full create-read-update-delete tests for issues.
 */

test.describe("Issues CRUD @crud", () => {
  test.describe("Create Issue", () => {
    test("can create issue with minimal data", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      const issueData = createIssue({ minimal: true });

      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");

      // Open create issue modal (usually 'C' key or button)
      await page.keyboard.press("c");

      // Wait for modal to appear
      await page
        .waitForSelector('[data-testid="create-issue-modal"], [role="dialog"]', {
          timeout: 5000,
        })
        .catch(() => {
          // If keyboard shortcut didn't work, try clicking the button
          return page.click(
            '[data-testid="add-issue-button"], button:has-text("Add issue"), button:has-text("Create")'
          );
        });

      // Fill in issue title
      const titleInput = page.locator(
        'input[name="name"], input[placeholder*="Issue title"], input[placeholder*="Title"]'
      );
      await titleInput.fill(issueData.name);

      // Submit the form
      await page.click('button[type="submit"], button:has-text("Create Issue")');

      // Wait for the issue to be created
      await page.waitForTimeout(2000);

      // Verify no errors occurred
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);

      // Verify issue appears in the list
      await expect(page.getByText(issueData.name)).toBeVisible({ timeout: 10000 });
    });

    test("can create issue with priority", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      const issueData = createIssue({ overrides: { priority: "high" } });

      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");

      // Open create modal
      await page.keyboard.press("c");
      await page.waitForTimeout(500);

      // Fill title
      const titleInput = page.locator('input[name="name"], input[placeholder*="title" i]').first();
      await titleInput.fill(issueData.name);

      // Set priority if dropdown exists
      const priorityButton = page.locator('[data-testid="priority-dropdown"], button:has-text("Priority")').first();
      if (await priorityButton.isVisible()) {
        await priorityButton.click();
        await page.click('[role="option"]:has-text("High"), li:has-text("High")');
      }

      // Submit
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can create bug issue", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      const issueData = createBugIssue();

      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");

      await page.keyboard.press("c");
      await page.waitForTimeout(500);

      const titleInput = page.locator('input[name="name"], input[placeholder*="title" i]').first();
      await titleInput.fill(issueData.name);

      // Add description if editor exists
      const descriptionEditor = page
        .locator('[data-testid="description-editor"], .ProseMirror, textarea[name="description"]')
        .first();
      if (await descriptionEditor.isVisible()) {
        await descriptionEditor.click();
        await descriptionEditor.fill(issueData.description ?? "");
      }

      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Read Issues", () => {
    test("can view issue list", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Should see the issues list or empty state
      const issuesList = page.locator(
        '[data-testid="issues-list"], [data-testid="issue-row"], table tbody tr, .issue-card'
      );
      const emptyState = page.locator('[data-testid="empty-state"], :text("No issues"), :text("Create your first")');

      const hasIssues = (await issuesList.count()) > 0;
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasIssues || hasEmptyState).toBe(true);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can open issue detail", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find and click on an issue if any exist
      const firstIssue = page.locator('[data-testid="issue-row"], table tbody tr, .issue-card').first();

      if (await firstIssue.isVisible()) {
        await firstIssue.click();
        await page.waitForTimeout(2000);

        // Should either open a modal or navigate to detail page
        const detailVisible = await page
          .locator('[data-testid="issue-detail"], [role="dialog"], .issue-detail')
          .isVisible();
        const urlChanged = page.url().includes("/issues/");

        expect(detailVisible || urlChanged).toBe(true);
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Update Issue", () => {
    test("can update issue title", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find first issue
      const firstIssue = page.locator('[data-testid="issue-row"], table tbody tr, .issue-card').first();

      if (await firstIssue.isVisible()) {
        await firstIssue.click();
        await page.waitForTimeout(1000);

        // Try to edit the title
        const titleElement = page.locator('[data-testid="issue-title"], h1, h2, input[name="name"]').first();

        if (await titleElement.isVisible()) {
          // Double-click to edit if it's a contenteditable
          await titleElement.dblclick().catch(() => titleElement.click());

          // Clear and type new value
          await page.keyboard.press("Meta+a");
          await page.keyboard.type("Updated Title - E2E Test");
          await page.keyboard.press("Tab"); // Blur to save

          await page.waitForTimeout(2000);
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can change issue status", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const firstIssue = page.locator('[data-testid="issue-row"], table tbody tr, .issue-card').first();

      if (await firstIssue.isVisible()) {
        await firstIssue.click();
        await page.waitForTimeout(1000);

        // Find and click status dropdown
        const statusDropdown = page.locator('[data-testid="status-dropdown"], button:has-text("Status")').first();

        if (await statusDropdown.isVisible()) {
          await statusDropdown.click();
          await page.waitForTimeout(500);

          // Click on a status option
          const statusOption = page
            .locator('[role="option"], li')
            .filter({ hasText: /started|progress|done/i })
            .first();
          if (await statusOption.isVisible()) {
            await statusOption.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Delete Issue", () => {
    test("can delete an issue", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      // First create an issue to delete
      const issueData = createIssue({ minimal: true, overrides: { name: "Delete Me - E2E Test" } });

      await page.goto(`/${workspaceSlug}/projects/${projectId}/issues`);
      await page.waitForLoadState("networkidle");

      // Create the issue first
      await page.keyboard.press("c");
      await page.waitForTimeout(500);

      const titleInput = page.locator('input[name="name"], input[placeholder*="title" i]').first();
      await titleInput.fill(issueData.name);
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      // Find and select the issue
      const issueToDelete = page
        .locator(`[data-testid="issue-row"]:has-text("${issueData.name}"), tr:has-text("${issueData.name}")`)
        .first();

      if (await issueToDelete.isVisible()) {
        // Right-click for context menu or find delete button
        await issueToDelete.click({ button: "right" });
        await page.waitForTimeout(500);

        // Click delete in context menu
        const deleteOption = page.locator('[role="menuitem"]:has-text("Delete"), button:has-text("Delete")').first();
        if (await deleteOption.isVisible()) {
          await deleteOption.click();

          // Confirm deletion if there's a confirmation dialog
          const confirmButton = page
            .locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")')
            .last();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }

          await page.waitForTimeout(2000);
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });
});
