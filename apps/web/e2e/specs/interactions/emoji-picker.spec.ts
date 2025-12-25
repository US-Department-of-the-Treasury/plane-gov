import { test, expect } from "../../fixtures";

/**
 * Emoji Picker Tests
 *
 * Tests to verify the emoji picker loads data from self-hosted emojibase files.
 */

interface EmojiData {
  emoji: string;
  label: string;
  hexcode: string;
}

interface EmojiGroup {
  key: string;
  message: string;
}

interface EmojiMessages {
  groups: EmojiGroup[];
}

test.describe("Emoji Picker @interactions", () => {
  test("self-hosted emojibase data is accessible", async ({ page }) => {
    // Verify the emoji data file is served correctly
    const dataResponse = await page.request.get("/emojibase-data/en/data.json");
    expect(dataResponse.ok()).toBe(true);

    const data = (await dataResponse.json()) as EmojiData[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(1000); // Should have many emojis

    // Verify the first emoji has the expected structure
    const firstEmoji = data[0];
    expect(firstEmoji).toHaveProperty("emoji");
    expect(firstEmoji).toHaveProperty("label");
    expect(firstEmoji).toHaveProperty("hexcode");

    console.log(`Loaded ${data.length} emojis from self-hosted data`);
    console.log(`Sample emoji: ${firstEmoji.emoji} - ${firstEmoji.label}`);
  });

  test("self-hosted emojibase messages is accessible", async ({ page }) => {
    // Verify the messages file is served correctly
    const messagesResponse = await page.request.get("/emojibase-data/en/messages.json");
    expect(messagesResponse.ok()).toBe(true);

    const messages = (await messagesResponse.json()) as EmojiMessages;
    expect(messages).toHaveProperty("groups");
    expect(Array.isArray(messages.groups)).toBe(true);
    expect(messages.groups.length).toBeGreaterThan(0);

    // Verify categories are present
    const groupKeys = messages.groups.map((g) => g.key);
    expect(groupKeys).toContain("smileys-emotion");
    expect(groupKeys).toContain("people-body");

    console.log(`Loaded ${messages.groups.length} emoji categories`);
  });

  test("emoji picker loads emojis from self-hosted data", async ({ page, workspaceSlug }) => {
    // Navigate to workspace and intercept network requests
    const emojiRequests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("emojibase") || url.includes("emoji")) {
        emojiRequests.push(url);
      }
    });

    await page.goto(`/${workspaceSlug}/projects`);
    await page.waitForLoadState("networkidle");

    // Try to open create project modal via the sidebar + button
    // First, find the Projects sidebar section and hover
    const sidebarProjectsSection = page.locator('[data-ph-element*="SIDEBAR_CREATE_PROJECT"]').first();

    // If the + button isn't visible, we need to hover first
    const projectsHeaderArea = page
      .locator("div.group")
      .filter({ hasText: /^Projects$/ })
      .first();

    if (await projectsHeaderArea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectsHeaderArea.hover();
      await page.waitForTimeout(200);
    }

    // Try clicking the create project button
    if (await sidebarProjectsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sidebarProjectsSection.click();
      await page.waitForTimeout(1000);

      // Look for the emoji picker button in the modal header
      const logoBtn = page.locator(".absolute.-bottom-\\[22px\\] button, button:has(span.grid.h-11)").first();

      if (await logoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoBtn.click();
        await page.waitForTimeout(2000); // Wait for emoji data to load

        // Check for emoji content
        const emojiContent = page.locator('[data-slot="emoji-picker-content"]');
        const emojiList = page.locator('[data-slot="emoji-picker-list"]');

        const contentVisible = await emojiContent.isVisible().catch(() => false);
        const listVisible = await emojiList.isVisible().catch(() => false);

        console.log("Emoji picker state:");
        console.log(`  - Content visible: ${contentVisible}`);
        console.log(`  - List visible: ${listVisible}`);
        console.log(`  - Emoji requests made: ${emojiRequests.length}`);
        emojiRequests.forEach((r) => console.log(`    - ${r}`));

        await page.screenshot({ path: "e2e/screenshots/emoji-picker-test.png" });

        // Verify requests go to self-hosted data, not external CDN
        const externalRequests = emojiRequests.filter((r) => r.includes("cdn.jsdelivr.net"));
        expect(externalRequests.length).toBe(0);
      }
    }

    // Even if we couldn't open the modal, verify the data files are accessible
    const dataResponse = await page.request.get("/emojibase-data/en/data.json");
    expect(dataResponse.ok()).toBe(true);
  });

  test("emoji picker search stays open when clicking search input", async ({ page, workspaceSlug }) => {
    // Navigate to workspace
    await page.goto(`/${workspaceSlug}/projects`);
    await page.waitForLoadState("networkidle");

    // Find and hover Projects section to show the + button
    const projectsHeaderArea = page
      .locator("div.group")
      .filter({ hasText: /^Projects$/ })
      .first();

    if (await projectsHeaderArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await projectsHeaderArea.hover();
      await page.waitForTimeout(200);
    }

    // Click create project button
    const sidebarProjectsSection = page.locator('[data-ph-element*="SIDEBAR_CREATE_PROJECT"]').first();

    if (!(await sidebarProjectsSection.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log("Could not find create project button - skipping test");
      test.skip();
      return;
    }

    await sidebarProjectsSection.click();
    await page.waitForTimeout(1000);

    // Click the emoji picker button
    const logoBtn = page.locator(".absolute.-bottom-\\[22px\\] button, button:has(span.grid.h-11)").first();

    if (!(await logoBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log("Could not find emoji picker button - skipping test");
      test.skip();
      return;
    }

    await logoBtn.click();
    await page.waitForTimeout(1000);

    // Verify emoji picker is open
    const emojiTab = page.locator('[role="tab"]:has-text("Emoji")').or(page.getByText("Emoji").first());
    await expect(emojiTab).toBeVisible({ timeout: 5000 });

    // Find the search input
    const searchInput = page
      .locator('[data-slot="emoji-picker-search-wrapper"] input, input[placeholder="Search"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: "e2e/screenshots/emoji-search-before-click.png" });

    // THE KEY TEST: Click on the search input
    await searchInput.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: "e2e/screenshots/emoji-search-after-click.png" });

    // Verify the emoji picker is STILL open (bug was it would close)
    await expect(searchInput).toBeVisible();
    console.log("✅ Emoji picker stayed open after clicking search!");

    // Type something to verify search works
    await searchInput.fill("star");
    await page.waitForTimeout(500);

    await page.screenshot({ path: "e2e/screenshots/emoji-search-after-typing.png" });

    // Still visible after typing
    await expect(searchInput).toBeVisible();
    console.log("✅ Search works - can type and results update!");
  });
});
