import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Visual Capture Utility for shadcn/ui Migration
 *
 * Use this utility to capture before/after screenshots during component migration.
 * Screenshots are saved to test-results/visual-captures/ and can be included in PRs.
 *
 * @example
 * ```typescript
 * import { VisualCapture } from "../utils/visual-capture";
 *
 * test("MemberDropdown migration", async ({ page }) => {
 *   const capture = new VisualCapture(page, "member-dropdown");
 *
 *   // Capture before state
 *   await page.goto("/workspace/settings");
 *   await capture.captureElement('[data-testid="member-dropdown"]', "closed-state");
 *
 *   // Trigger interaction
 *   await page.click('[data-testid="member-dropdown-trigger"]');
 *
 *   // Capture after state
 *   await capture.captureElement('[data-testid="member-dropdown"]', "open-state");
 *
 *   // Generate comparison report
 *   capture.generateReport();
 * });
 * ```
 */

export class VisualCapture {
  private page: Page;
  private componentName: string;
  private outputDir: string;
  private captures: Array<{ name: string; path: string; timestamp: Date }> = [];

  constructor(page: Page, componentName: string) {
    this.page = page;
    this.componentName = componentName;
    this.outputDir = path.join(process.cwd(), "test-results", "visual-captures", componentName);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Capture a full page screenshot
   */
  async capturePage(name: string, options?: { fullPage?: boolean }): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(this.outputDir, filename);

    await this.page.screenshot({
      path: filepath,
      fullPage: options?.fullPage ?? false,
    });

    this.captures.push({ name, path: filepath, timestamp: new Date() });
    console.log(`📸 Captured: ${filename}`);

    return filepath;
  }

  /**
   * Capture a specific element by selector
   */
  async captureElement(selector: string, name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${name}_${timestamp}.png`;
    const filepath = path.join(this.outputDir, filename);

    const element = this.page.locator(selector);
    await expect(element).toBeVisible({ timeout: 10000 });

    await element.screenshot({ path: filepath });

    this.captures.push({ name, path: filepath, timestamp: new Date() });
    console.log(`📸 Captured element: ${filename}`);

    return filepath;
  }

  /**
   * Capture the viewport with a highlighted element
   */
  async captureWithHighlight(selector: string, name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${name}_highlighted_${timestamp}.png`;
    const filepath = path.join(this.outputDir, filename);

    // Add highlight styling
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        (element as HTMLElement).style.outline = "3px solid #ff0000";
        (element as HTMLElement).style.outlineOffset = "2px";
      }
    }, selector);

    await this.page.screenshot({ path: filepath });

    // Remove highlight
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        (element as HTMLElement).style.outline = "";
        (element as HTMLElement).style.outlineOffset = "";
      }
    }, selector);

    this.captures.push({ name, path: filepath, timestamp: new Date() });
    console.log(`📸 Captured with highlight: ${filename}`);

    return filepath;
  }

  /**
   * Capture dropdown/popover positioning
   * Takes a screenshot of trigger + content to verify positioning
   */
  async captureDropdown(
    triggerSelector: string,
    contentSelector: string,
    name: string
  ): Promise<{ trigger: string; content: string; combined: string }> {
    // Capture trigger element
    const triggerPath = await this.captureElement(triggerSelector, `${name}_trigger`);

    // Click to open dropdown
    await this.page.click(triggerSelector);
    await this.page.waitForTimeout(300); // Wait for animation

    // Capture content element
    const contentPath = await this.captureElement(contentSelector, `${name}_content`);

    // Capture combined view
    const combinedPath = await this.capturePage(`${name}_combined`);

    // Close dropdown
    await this.page.keyboard.press("Escape");

    return { trigger: triggerPath, content: contentPath, combined: combinedPath };
  }

  /**
   * Get bounding box info for positioning verification
   */
  async getPositionInfo(
    triggerSelector: string,
    contentSelector: string
  ): Promise<{
    trigger: DOMRect | null;
    content: DOMRect | null;
    verticalGap: number;
    horizontalGap: number;
    isBelow: boolean;
    isAligned: boolean;
  }> {
    const trigger = await this.page.locator(triggerSelector).boundingBox();
    const content = await this.page.locator(contentSelector).boundingBox();

    if (!trigger || !content) {
      return {
        trigger: null,
        content: null,
        verticalGap: 0,
        horizontalGap: 0,
        isBelow: false,
        isAligned: false,
      };
    }

    const verticalGap = content.y - (trigger.y + trigger.height);
    const horizontalGap = Math.abs(content.x - trigger.x);
    const isBelow = content.y > trigger.y;
    const isAligned = horizontalGap < 50; // Within 50px horizontally

    return {
      trigger: trigger as unknown as DOMRect,
      content: content as unknown as DOMRect,
      verticalGap,
      horizontalGap,
      isBelow,
      isAligned,
    };
  }

  /**
   * Generate a markdown report of all captures
   */
  generateReport(): string {
    const reportPath = path.join(this.outputDir, "CAPTURE_REPORT.md");

    let content = `# Visual Capture Report: ${this.componentName}\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;
    content += `## Captures\n\n`;

    for (const capture of this.captures) {
      const relativePath = path.relative(this.outputDir, capture.path);
      content += `### ${capture.name}\n`;
      content += `- File: \`${relativePath}\`\n`;
      content += `- Time: ${capture.timestamp.toISOString()}\n`;
      content += `![${capture.name}](./${relativePath})\n\n`;
    }

    fs.writeFileSync(reportPath, content);
    console.log(`📄 Report generated: ${reportPath}`);

    return reportPath;
  }

  /**
   * Clean up old captures (keep last N)
   */
  cleanup(keepLast: number = 10): void {
    const files = fs.readdirSync(this.outputDir)
      .filter((f) => f.endsWith(".png"))
      .map((f) => ({
        name: f,
        path: path.join(this.outputDir, f),
        mtime: fs.statSync(path.join(this.outputDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length > keepLast) {
      const toDelete = files.slice(keepLast);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Cleaned up: ${file.name}`);
      }
    }
  }
}

/**
 * Helper to verify dropdown positioning (used in E2E tests)
 */
export async function verifyDropdownPositioning(
  page: Page,
  triggerSelector: string,
  contentSelector: string
): Promise<{ isCorrect: boolean; message: string }> {
  const trigger = await page.locator(triggerSelector).boundingBox();
  const content = await page.locator(contentSelector).boundingBox();

  if (!trigger) {
    return { isCorrect: false, message: "Trigger element not found" };
  }

  if (!content) {
    return { isCorrect: false, message: "Content element not found or not visible" };
  }

  // Check if content is at (0, 0) - common positioning bug
  if (content.x < 20 && content.y < 20 && trigger.x > 100) {
    return {
      isCorrect: false,
      message: `Content at (${content.x}, ${content.y}) but trigger at (${trigger.x}, ${trigger.y})`,
    };
  }

  // Check if content is reasonably close to trigger
  const verticalDistance = Math.abs(content.y - (trigger.y + trigger.height));
  if (verticalDistance > 200) {
    return {
      isCorrect: false,
      message: `Content too far from trigger vertically: ${verticalDistance}px`,
    };
  }

  return {
    isCorrect: true,
    message: `Positioning correct: content at (${content.x}, ${content.y})`,
  };
}
