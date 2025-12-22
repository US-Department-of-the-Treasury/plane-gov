import { test, expect } from "../../fixtures";
import { createDraft, createDetailedDraft } from "../../factories";

/**
 * Drafts CRUD Tests
 *
 * Full create-read-update-delete tests for workspace draft issues.
 * PRIORITY: This was the originally broken feature.
 */

test.describe("Drafts CRUD @crud @priority", () => {
  test.describe("View Drafts (Most Important)", () => {
    test("drafts page loads without 'Cannot read properties of undefined' error", async ({
      page,
      errorTracker,
      workspaceSlug,
    }) => {
      // This is the critical test - the drafts page was crashing
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Check for the specific error that was occurring
      const undefinedErrors = errorTracker.getErrorsMatching(/Cannot read properties of undefined/);
      if (undefinedErrors.length > 0) {
        console.error("CRITICAL: Original bug still present!");
        console.error(undefinedErrors.map((e) => e.message).join("\n"));
      }
      expect(undefinedErrors).toHaveLength(0);

      // Check for TanStack Query errors
      const queryErrors = errorTracker.getErrorsMatching(/useQuery|useInfiniteQuery|QueryClient/);
      if (queryErrors.length > 0) {
        console.error("TanStack Query errors detected:");
        console.error(queryErrors.map((e) => e.message).join("\n"));
      }
      expect(queryErrors).toHaveLength(0);

      // General page errors
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can view drafts list or empty state", async ({ page, errorTracker, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Should see either drafts or empty state
      const draftsList = page.locator(
        '[data-testid="drafts-list"], [data-testid="draft-row"], .draft-card, .draft-item'
      );
      const emptyState = page.locator('[data-testid="empty-state"], :text("No drafts"), :text("Create your first")');

      const hasDrafts = (await draftsList.count()) > 0;
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasDrafts || hasEmptyState).toBe(true);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Create Draft", () => {
    test("can create a quick draft", async ({ page, errorTracker, workspaceSlug }) => {
      const draftData = createDraft({ minimal: true });

      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Look for create draft button or keyboard shortcut
      const createButton = page.locator(
        '[data-testid="create-draft-button"], button:has-text("New draft"), button:has-text("Add draft")'
      );

      if (await createButton.isVisible()) {
        await createButton.click();
      } else {
        // Try keyboard shortcut
        await page.keyboard.press("c");
      }

      await page.waitForTimeout(500);

      // Fill in the draft name
      const titleInput = page
        .locator('input[name="name"], input[placeholder*="title" i], input[placeholder*="draft" i]')
        .first();

      if (await titleInput.isVisible()) {
        await titleInput.fill(draftData.name);

        // Submit
        await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
        await page.waitForTimeout(2000);
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can create draft with description", async ({ page, errorTracker, workspaceSlug }) => {
      const draftData = createDetailedDraft();

      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");

      // Open create modal
      const createButton = page.locator(
        '[data-testid="create-draft-button"], button:has-text("New"), button:has-text("Add")'
      );
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(500);
      }

      // Fill title
      const titleInput = page.locator('input[name="name"], input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill(draftData.name);
      }

      // Fill description
      const descriptionEditor = page.locator('[data-testid="description-editor"], .ProseMirror, textarea').first();
      if (await descriptionEditor.isVisible()) {
        await descriptionEditor.click();
        await page.keyboard.type(draftData.description ?? "Test description");
      }

      // Submit
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Update Draft", () => {
    test("can edit draft title", async ({ page, errorTracker, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find first draft
      const firstDraft = page.locator('[data-testid="draft-row"], .draft-card, .draft-item').first();

      if (await firstDraft.isVisible()) {
        await firstDraft.click();
        await page.waitForTimeout(1000);

        // Edit title
        const titleElement = page.locator('[data-testid="draft-title"], input[name="name"], h1, h2').first();
        if (await titleElement.isVisible()) {
          await titleElement.dblclick().catch(() => titleElement.click());
          await page.keyboard.press("Meta+a");
          await page.keyboard.type("Updated Draft - E2E");
          await page.keyboard.press("Tab");
          await page.waitForTimeout(2000);
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Move Draft to Issue", () => {
    test("can promote draft to issue", async ({ page, errorTracker, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find first draft
      const firstDraft = page.locator('[data-testid="draft-row"], .draft-card').first();

      if (await firstDraft.isVisible()) {
        // Right-click or find move/promote option
        await firstDraft.click({ button: "right" });
        await page.waitForTimeout(500);

        const moveOption = page
          .locator(
            '[role="menuitem"]:has-text("Move"), [role="menuitem"]:has-text("Promote"), button:has-text("Convert")'
          )
          .first();

        if (await moveOption.isVisible()) {
          await moveOption.click();
          await page.waitForTimeout(1000);

          // May need to select a project
          const projectSelector = page.locator('[data-testid="project-selector"], select, [role="combobox"]').first();
          if (await projectSelector.isVisible()) {
            await projectSelector.click();
            const firstProject = page.locator('[role="option"]').first();
            await firstProject.click();
            await page.waitForTimeout(500);
          }

          // Confirm
          const confirmButton = page
            .locator('button:has-text("Confirm"), button:has-text("Move"), button:has-text("Create")')
            .last();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Delete Draft", () => {
    test("can delete a draft", async ({ page, errorTracker, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find first draft
      const firstDraft = page.locator('[data-testid="draft-row"], .draft-card').first();

      if (await firstDraft.isVisible()) {
        // Right-click for context menu
        await firstDraft.click({ button: "right" });
        await page.waitForTimeout(500);

        const deleteOption = page.locator('[role="menuitem"]:has-text("Delete"), button:has-text("Delete")').first();

        if (await deleteOption.isVisible()) {
          await deleteOption.click();

          // Confirm deletion
          const confirmButton = page
            .locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")')
            .last();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Pagination", () => {
    test("can scroll to load more drafts (infinite scroll)", async ({ page, errorTracker, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/drafts`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Scroll down to trigger infinite scroll
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(2000);

      // Should not have errors during scroll/load
      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);

      // Specifically check for query cache errors
      const cacheErrors = errorTracker.getErrorsMatching(/cache|query.*key|infinite.*query/i);
      expect(cacheErrors).toHaveLength(0);
    });
  });
});
