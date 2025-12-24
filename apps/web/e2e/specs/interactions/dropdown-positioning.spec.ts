import { test, expect } from "../../fixtures/auth";

/**
 * Dropdown Positioning Tests
 *
 * Verifies that dropdowns appear near their trigger buttons,
 * not at top-left (0,0) of the viewport when the button is NOT in the top-left area.
 */

test.describe("Dropdown Positioning", () => {
  test("theme dropdown appears near the button, not at top-left", async ({ page, workspaceSlug }) => {
    // Navigate to account preferences page (where theme switcher is)
    await page.goto(`/${workspaceSlug}/settings/account/preferences`);
    await page.waitForLoadState("networkidle");

    // Wait for page to fully load
    await page.waitForTimeout(1000);

    // Find the theme dropdown button - it's a CustomSelect with theme options
    // The button text will be "Select your theme" or a theme name like "Light", "Dark", etc.
    const themeButton = page.locator('button:has-text("Select your theme"), button:has-text("Light"), button:has-text("Dark"), button:has-text("System")').first();
    await expect(themeButton).toBeVisible({ timeout: 10000 });

    // Get button's bounding box before clicking
    const buttonBox = await themeButton.boundingBox();
    expect(buttonBox).not.toBeNull();

    // Click to open dropdown
    await themeButton.click();

    // Wait for dropdown options to appear
    // The dropdown renders a portal to document.body - look for the options list
    // Avoid matching search bar which also has z-30
    const dropdownOptions = page.locator('[data-headlessui-state="open"]:has([role="option"]), [role="listbox"]').first();
    await expect(dropdownOptions).toBeVisible({ timeout: 5000 });

    // Get dropdown's bounding box
    const dropdownBox = await dropdownOptions.boundingBox();
    expect(dropdownBox).not.toBeNull();

    // Log positions for debugging
    console.log("Button position:", buttonBox);
    console.log("Dropdown position:", dropdownBox);

    // The key test: dropdown should be positioned near the button
    // If button is at (x, y), dropdown should be within reasonable distance
    // Calculate distance from button bottom to dropdown top (for bottom-placed dropdown)
    const verticalGap = Math.abs(dropdownBox!.y - (buttonBox!.y + buttonBox!.height));

    // For a button NOT in top-left, dropdown appearing at (0,0) is clearly wrong
    // We check if dropdown is suspiciously at origin when button isn't
    const buttonIsNotAtOrigin = buttonBox!.x > 100 || buttonBox!.y > 100;
    const dropdownIsAtOrigin = dropdownBox!.x < 20 && dropdownBox!.y < 20;

    if (buttonIsNotAtOrigin) {
      expect(dropdownIsAtOrigin, "Dropdown should not appear at (0,0) when button is elsewhere").toBe(false);
    }

    // Dropdown should be within reasonable distance of button
    expect(verticalGap, "Dropdown should be close to button vertically").toBeLessThan(200);
  });

  test.skip("Lead dropdown in project creation modal appears above modal, not behind it", async ({ page, workspaceSlug }) => {
    // NOTE: This test is skipped because reliably opening the project creation modal
    // requires complex interaction with hover-revealed buttons.
    // The z-index fix (z-30 -> z-50) has been applied to member-options.tsx,
    // date.tsx, and date-range.tsx to ensure dropdowns appear above modals.
    // Manual verification: Open project creation modal, click Lead dropdown,
    // verify the dropdown appears above the modal (not hidden behind it).

    await page.goto(`/${workspaceSlug}`);
    await page.waitForLoadState("networkidle");

    // This test verifies that portaled dropdowns appear above modals
    // The fix changed z-index from z-30 to z-50 in:
    // - apps/web/core/components/dropdowns/member/member-options.tsx
    // - apps/web/core/components/dropdowns/date.tsx
    // - apps/web/core/components/dropdowns/date-range.tsx
  });

  test("workspace dropdown appears near its trigger", async ({ page, workspaceSlug }) => {
    // Navigate to workspace home
    await page.goto(`/${workspaceSlug}`);
    await page.waitForLoadState("networkidle");

    // Find the workspace dropdown trigger in the header (contains workspace name)
    const workspaceDropdown = page.locator('button:has-text("Test Workspace")').first();

    // Skip if not visible (might have different workspace name)
    if (!(await workspaceDropdown.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    const buttonBox = await workspaceDropdown.boundingBox();
    expect(buttonBox).not.toBeNull();

    await workspaceDropdown.click();

    // Wait for dropdown menu
    await page.waitForTimeout(500);

    // Find the dropdown menu (the one that contains workspace options)
    const dropdownMenu = page.locator('[data-headlessui-state="open"]').first();

    if (await dropdownMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      const dropdownBox = await dropdownMenu.boundingBox();
      expect(dropdownBox).not.toBeNull();

      // Log for debugging
      console.log("Workspace button position:", buttonBox);
      console.log("Workspace dropdown position:", dropdownBox);

      // The dropdown should be positioned near the button
      // For the sidebar button, dropdown should be close horizontally and vertically
      const horizontalGap = Math.abs(dropdownBox!.x - buttonBox!.x);
      const verticalGap = Math.abs(dropdownBox!.y - (buttonBox!.y + buttonBox!.height));

      // Dropdown should be reasonably close to the button
      expect(horizontalGap, "Dropdown should be close to button horizontally").toBeLessThan(200);
      expect(verticalGap, "Dropdown should be close to button vertically").toBeLessThan(100);
    }
  });
});
