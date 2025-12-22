/**
 * Draft Issue Factory
 *
 * Generates realistic test data for workspace draft issues.
 */

import { faker } from "@faker-js/faker";
import { IssuePriority } from "./issue.factory";

export interface DraftIssueData {
  name: string;
  description?: string;
  description_html?: string;
  priority?: IssuePriority;
}

export interface DraftFactoryOptions {
  /** Override specific fields */
  overrides?: Partial<DraftIssueData>;
  /** Generate minimal data (name only) */
  minimal?: boolean;
}

/**
 * Generate a single draft issue
 */
export function createDraft(options: DraftFactoryOptions = {}): DraftIssueData {
  const { overrides = {}, minimal = false } = options;

  // Drafts are typically quick captures, so keep names shorter
  const name =
    overrides.name ??
    faker.helpers.arrayElement([
      faker.lorem.sentence({ min: 3, max: 6 }),
      `TODO: ${faker.lorem.sentence({ min: 2, max: 5 })}`,
      `Quick note: ${faker.lorem.words({ min: 3, max: 6 })}`,
      `Idea - ${faker.lorem.sentence({ min: 2, max: 4 })}`,
      `[Draft] ${faker.lorem.sentence({ min: 3, max: 5 })}`,
    ]);

  if (minimal) {
    return {
      name,
      ...overrides,
    };
  }

  return {
    name,
    description: faker.lorem.paragraph(),
    priority: faker.helpers.arrayElement<IssuePriority>(["urgent", "high", "medium", "low", "none"]),
    ...overrides,
  };
}

/**
 * Generate multiple draft issues
 */
export function createDrafts(count: number, options: DraftFactoryOptions = {}): DraftIssueData[] {
  return Array.from({ length: count }, () => createDraft(options));
}

/**
 * Generate a quick capture draft (minimal)
 */
export function createQuickDraft(overrides: Partial<DraftIssueData> = {}): DraftIssueData {
  return createDraft({ minimal: true, overrides });
}

/**
 * Generate a detailed draft
 */
export function createDetailedDraft(overrides: Partial<DraftIssueData> = {}): DraftIssueData {
  return createDraft({
    overrides: {
      description: faker.lorem.paragraphs({ min: 2, max: 4 }),
      description_html: `<p>${faker.lorem.paragraphs({ min: 2, max: 4 })}</p>`,
      priority: "medium",
      ...overrides,
    },
  });
}
