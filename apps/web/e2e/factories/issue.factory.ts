/**
 * Issue Factory
 *
 * Generates realistic test data for issues.
 * Uses @faker-js/faker for data generation.
 */

import { faker } from "@faker-js/faker";

export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";
export type IssueState = "backlog" | "unstarted" | "started" | "completed" | "cancelled";

export interface IssueData {
  name: string;
  description?: string;
  description_html?: string;
  priority?: IssuePriority;
  state?: IssueState;
  assignees?: string[];
  labels?: string[];
  estimate_point?: number;
  start_date?: string;
  target_date?: string;
}

export interface IssueFactoryOptions {
  /** Override specific fields */
  overrides?: Partial<IssueData>;
  /** Generate minimal data (name only) */
  minimal?: boolean;
  /** Generate complete data with all fields */
  complete?: boolean;
}

/**
 * Generate a single issue
 */
export function createIssue(options: IssueFactoryOptions = {}): IssueData {
  const { overrides = {}, minimal = false, complete = false } = options;

  // Minimal issue - just name
  if (minimal) {
    return {
      name: overrides.name ?? faker.lorem.sentence({ min: 3, max: 8 }),
    };
  }

  const name = faker.helpers.arrayElement([
    `Fix ${faker.word.noun()} ${faker.word.noun()} issue`,
    `Add ${faker.word.noun()} feature`,
    `Update ${faker.word.noun()} ${faker.word.noun()}`,
    `Refactor ${faker.word.noun()} module`,
    `Implement ${faker.word.noun()} ${faker.word.noun()}`,
    `Bug: ${faker.lorem.sentence({ min: 3, max: 6 })}`,
    faker.lorem.sentence({ min: 4, max: 10 }),
  ]);

  const baseIssue: IssueData = {
    name,
    priority: faker.helpers.arrayElement<IssuePriority>(["urgent", "high", "medium", "low", "none"]),
    ...overrides,
  };

  // Complete issue - all fields
  if (complete) {
    const startDate = faker.date.soon({ days: 7 });
    const targetDate = faker.date.soon({ days: 30, refDate: startDate });

    return {
      ...baseIssue,
      description: faker.lorem.paragraphs({ min: 1, max: 3 }),
      description_html: `<p>${faker.lorem.paragraphs({ min: 1, max: 3 })}</p>`,
      state: faker.helpers.arrayElement<IssueState>(["backlog", "unstarted", "started", "completed", "cancelled"]),
      estimate_point: faker.helpers.arrayElement([1, 2, 3, 5, 8, 13, 21]),
      start_date: startDate.toISOString().split("T")[0],
      target_date: targetDate.toISOString().split("T")[0],
      ...overrides,
    };
  }

  return baseIssue;
}

/**
 * Generate multiple issues
 */
export function createIssues(count: number, options: IssueFactoryOptions = {}): IssueData[] {
  return Array.from({ length: count }, () => createIssue(options));
}

/**
 * Generate an issue with specific priority
 */
export function createUrgentIssue(overrides: Partial<IssueData> = {}): IssueData {
  return createIssue({ overrides: { priority: "urgent", ...overrides } });
}

export function createHighPriorityIssue(overrides: Partial<IssueData> = {}): IssueData {
  return createIssue({ overrides: { priority: "high", ...overrides } });
}

/**
 * Generate a bug report issue
 */
export function createBugIssue(overrides: Partial<IssueData> = {}): IssueData {
  return createIssue({
    overrides: {
      name: `Bug: ${faker.lorem.sentence({ min: 4, max: 8 })}`,
      description: `
## Steps to Reproduce
1. ${faker.lorem.sentence()}
2. ${faker.lorem.sentence()}
3. ${faker.lorem.sentence()}

## Expected Behavior
${faker.lorem.sentence()}

## Actual Behavior
${faker.lorem.sentence()}

## Environment
- Browser: ${faker.helpers.arrayElement(["Chrome", "Firefox", "Safari"])}
- OS: ${faker.helpers.arrayElement(["macOS", "Windows", "Linux"])}
      `.trim(),
      priority: faker.helpers.arrayElement<IssuePriority>(["urgent", "high", "medium"]),
      ...overrides,
    },
  });
}

/**
 * Generate a feature request issue
 */
export function createFeatureIssue(overrides: Partial<IssueData> = {}): IssueData {
  return createIssue({
    overrides: {
      name: `Feature: ${faker.lorem.sentence({ min: 3, max: 6 })}`,
      description: `
## Summary
${faker.lorem.paragraph()}

## User Story
As a ${faker.person.jobType()}, I want to ${faker.lorem.sentence()}, so that ${faker.lorem.sentence()}.

## Acceptance Criteria
- [ ] ${faker.lorem.sentence()}
- [ ] ${faker.lorem.sentence()}
- [ ] ${faker.lorem.sentence()}
      `.trim(),
      priority: faker.helpers.arrayElement<IssuePriority>(["medium", "low"]),
      ...overrides,
    },
  });
}
