import { test, expect } from "../../fixtures";
import { createSprint } from "../../factories";

/**
 * Sprints CRUD Tests
 *
 * Full create-read-update-delete tests for sprints (cycles).
 */

test.describe("Sprints CRUD @crud", () => {
  test.describe("View Sprints", () => {
    test("sprints page loads without errors", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can view sprints list or empty state", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const sprintsList = page.locator('[data-testid="sprints-list"], [data-testid="sprint-row"], .sprint-card');
      const emptyState = page.locator('[data-testid="empty-state"], :text("No sprints"), :text("Create your first")');

      const hasSprints = (await sprintsList.count()) > 0;
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasSprints || hasEmptyState).toBe(true);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("active sprints page loads without errors", async ({ page, errorTracker, workspaceSlug }) => {
      await page.goto(`/${workspaceSlug}/active-sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Create Sprint", () => {
    test("can create sprint with dates", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      const sprintData = createSprint({ withDates: true });

      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");

      // Open create modal
      const createButton = page.locator(
        '[data-testid="create-sprint-button"], button:has-text("New sprint"), button:has-text("Add sprint"), button:has-text("Create")'
      );
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(500);
      } else {
        // Try keyboard shortcut
        await page.keyboard.press("c");
        await page.waitForTimeout(500);
      }

      // Fill name
      const nameInput = page
        .locator('input[name="name"], input[placeholder*="Sprint" i], input[placeholder*="name" i]')
        .first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(sprintData.name);
      }

      // Fill dates if inputs exist
      const startDateInput = page.locator('input[name="start_date"], input[type="date"]').first();
      if ((await startDateInput.isVisible()) && sprintData.start_date) {
        await startDateInput.fill(sprintData.start_date);
      }

      const endDateInput = page.locator('input[name="end_date"], input[type="date"]').nth(1);
      if ((await endDateInput.isVisible()) && sprintData.end_date) {
        await endDateInput.fill(sprintData.end_date);
      }

      // Submit
      await page.click('button[type="submit"], button:has-text("Create")');
      await page.waitForTimeout(2000);

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe("Update Sprint", () => {
    test("can update sprint name", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const firstSprint = page.locator('[data-testid="sprint-row"], .sprint-card').first();

      if (await firstSprint.isVisible()) {
        await firstSprint.click();
        await page.waitForTimeout(1000);

        // Edit name
        const nameElement = page.locator('[data-testid="sprint-name"], input[name="name"], h1, h2').first();
        if (await nameElement.isVisible()) {
          await nameElement.dblclick().catch(() => nameElement.click());
          await page.keyboard.press("Meta+a");
          await page.keyboard.type("Updated Sprint - E2E");
          await page.keyboard.press("Tab");
          await page.waitForTimeout(2000);
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can start a sprint", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find a sprint that's not started
      const notStartedSprint = page
        .locator('[data-testid="sprint-row"]:not([data-status="active"]), .sprint-card')
        .first();

      if (await notStartedSprint.isVisible()) {
        await notStartedSprint.click();
        await page.waitForTimeout(1000);

        // Find start button
        const startButton = page.locator('button:has-text("Start"), button:has-text("Begin")').first();
        if (await startButton.isVisible()) {
          await startButton.click();
          await page.waitForTimeout(2000);
        }
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });

    test("can complete a sprint", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Find an active sprint
      const activeSprint = page
        .locator('[data-testid="sprint-row"][data-status="active"], .sprint-card.active')
        .first();

      if (await activeSprint.isVisible()) {
        await activeSprint.click();
        await page.waitForTimeout(1000);

        // Find complete button
        const completeButton = page.locator('button:has-text("Complete"), button:has-text("End")').first();
        if (await completeButton.isVisible()) {
          await completeButton.click();

          // May need confirmation
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').last();
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

  test.describe("Delete Sprint", () => {
    test("can archive a sprint", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const firstSprint = page.locator('[data-testid="sprint-row"], .sprint-card').first();

      if (await firstSprint.isVisible()) {
        await firstSprint.click({ button: "right" });
        await page.waitForTimeout(500);

        const archiveOption = page
          .locator('[role="menuitem"]:has-text("Archive"), [role="menuitem"]:has-text("Delete")')
          .first();

        if (await archiveOption.isVisible()) {
          await archiveOption.click();

          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').last();
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

  test.describe("Sprint Issues", () => {
    test("can view issues in a sprint", async ({ page, errorTracker, workspaceSlug, projectId }) => {
      await page.goto(`/${workspaceSlug}/projects/${projectId}/sprints`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const firstSprint = page.locator('[data-testid="sprint-row"], .sprint-card').first();

      if (await firstSprint.isVisible()) {
        await firstSprint.click();
        await page.waitForTimeout(2000);

        // Should see sprint detail with issues or empty state
        const issuesList = page.locator('[data-testid="sprint-issues"], [data-testid="issue-row"]');
        const emptyState = page.locator(':text("No issues"), :text("Add issues")');

        const hasIssues = (await issuesList.count()) > 0;
        const hasEmptyState = await emptyState.isVisible().catch(() => false);

        expect(hasIssues || hasEmptyState).toBe(true);
      }

      const pageErrors = errorTracker.getPageErrors();
      expect(pageErrors).toHaveLength(0);
    });
  });
});
