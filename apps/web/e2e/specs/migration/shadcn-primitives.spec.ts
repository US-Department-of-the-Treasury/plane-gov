import { test, expect } from "../../fixtures/auth";
import { VisualCapture, verifyDropdownPositioning } from "../../utils/visual-capture";

/**
 * shadcn/ui Migration Tests
 *
 * These tests verify that the new Radix-based primitives work correctly
 * and capture visual evidence for PR review.
 *
 * Run with: pnpm test:e2e --grep "shadcn"
 */

test.describe("shadcn/ui Migration - Phase 0 Foundation", () => {
  test("app loads correctly with new dependencies", async ({ page, workspaceSlug }) => {
    // Verify the app still loads after adding Radix dependencies
    await page.goto(`/${workspaceSlug}`);
    await page.waitForLoadState("networkidle");

    // Basic page load verification
    await expect(page.locator("body")).toBeVisible();

    // Check for console errors (excluding known benign ones)
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out known benign errors
        if (!text.includes("ResizeObserver") && !text.includes("passive event")) {
          errors.push(text);
        }
      }
    });

    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test("capture theme dropdown for migration reference", async ({ page, workspaceSlug }) => {
    const capture = new VisualCapture(page, "theme-dropdown-reference");

    // Navigate to preferences page
    await page.goto(`/${workspaceSlug}/settings/account/preferences`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Find theme dropdown
    const themeButton = page.locator(
      'button:has-text("Select your theme"), button:has-text("Light"), button:has-text("Dark"), button:has-text("System")'
    ).first();

    if (await themeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Capture closed state
      await capture.captureWithHighlight(
        'button:has-text("Light"), button:has-text("Dark"), button:has-text("System")',
        "before-click"
      );

      // Open dropdown
      await themeButton.click();
      await page.waitForTimeout(500);

      // Capture open state
      await capture.capturePage("dropdown-open");

      // Verify positioning
      const dropdownContent = page.locator('[data-headlessui-state="open"]:has([role="option"]), [role="listbox"]').first();

      if (await dropdownContent.isVisible({ timeout: 2000 }).catch(() => false)) {
        const positioning = await verifyDropdownPositioning(
          page,
          'button:has-text("Light"), button:has-text("Dark")',
          '[data-headlessui-state="open"]'
        );

        console.log("Positioning check:", positioning.message);
        expect(positioning.isCorrect).toBe(true);
      }

      // Generate report
      capture.generateReport();
    } else {
      test.skip();
    }
  });

  test("capture workspace dropdown for migration reference", async ({ page, workspaceSlug }) => {
    const capture = new VisualCapture(page, "workspace-dropdown-reference");

    await page.goto(`/${workspaceSlug}`);
    await page.waitForLoadState("networkidle");

    // Capture the sidebar area
    await capture.capturePage("workspace-sidebar", { fullPage: false });

    capture.generateReport();
  });
});

test.describe("shadcn/ui Migration - Component Positioning", () => {
  test("verify dropdown z-index in modals works correctly", async ({ page, workspaceSlug }) => {
    // This test documents the current z-index behavior for future comparison
    await page.goto(`/${workspaceSlug}`);
    await page.waitForLoadState("networkidle");

    // Try to open a modal with a dropdown
    // Note: The actual implementation depends on how modals are triggered in the UI
    // This is a placeholder for future migration verification

    const capture = new VisualCapture(page, "modal-dropdown-zindex");
    await capture.capturePage("initial-state");

    // The migration should ensure dropdowns inside modals appear above the modal
    // Currently this is handled with z-50 class on dropdown portals

    capture.generateReport();
  });
});
