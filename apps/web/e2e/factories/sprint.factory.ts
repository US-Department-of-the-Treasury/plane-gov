/**
 * Sprint Factory
 *
 * Generates realistic test data for sprints (cycles in Plane).
 */

import { faker } from "@faker-js/faker";

export interface SprintData {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

export interface SprintFactoryOptions {
  /** Override specific fields */
  overrides?: Partial<SprintData>;
  /** Generate with date range */
  withDates?: boolean;
  /** Sprint duration in days (default: 14) */
  durationDays?: number;
  /** Days from now to start (default: 0) */
  startOffset?: number;
}

/**
 * Generate a single sprint
 */
export function createSprint(options: SprintFactoryOptions = {}): SprintData {
  const { overrides = {}, withDates = true, durationDays = 14, startOffset = 0 } = options;

  const sprintNumber = faker.number.int({ min: 1, max: 50 });
  const name =
    overrides.name ??
    faker.helpers.arrayElement([
      `Sprint ${sprintNumber}`,
      `Sprint ${sprintNumber}: ${faker.word.noun()} Release`,
      `${faker.date.month()} Sprint`,
      `Week ${faker.number.int({ min: 1, max: 52 })} Sprint`,
      `Q${faker.number.int({ min: 1, max: 4 })} Sprint ${sprintNumber}`,
    ]);

  const sprint: SprintData = {
    name,
    ...overrides,
  };

  if (withDates && !overrides.start_date && !overrides.end_date) {
    const startDate = faker.date.soon({ days: startOffset + 7 });
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    sprint.start_date = startDate.toISOString().split("T")[0];
    sprint.end_date = endDate.toISOString().split("T")[0];
  }

  return sprint;
}

/**
 * Generate multiple sprints
 */
export function createSprints(count: number, options: SprintFactoryOptions = {}): SprintData[] {
  const sprints: SprintData[] = [];
  const durationDays = options.durationDays ?? 14;
  let startOffset = options.startOffset ?? 0;

  for (let i = 0; i < count; i++) {
    sprints.push(
      createSprint({
        ...options,
        startOffset,
        overrides: {
          name: `Sprint ${i + 1}`,
          ...options.overrides,
        },
      })
    );
    // Next sprint starts after this one ends (plus a day gap)
    startOffset += durationDays + 1;
  }

  return sprints;
}

/**
 * Generate a sprint that starts today
 */
export function createCurrentSprint(overrides: Partial<SprintData> = {}): SprintData {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 14);

  return createSprint({
    overrides: {
      name: "Current Sprint",
      start_date: today.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      ...overrides,
    },
  });
}

/**
 * Generate a completed sprint (dates in the past)
 */
export function createCompletedSprint(overrides: Partial<SprintData> = {}): SprintData {
  const endDate = faker.date.recent({ days: 7 });
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 14);

  return createSprint({
    overrides: {
      name: `Completed Sprint - ${faker.date.month()}`,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      ...overrides,
    },
  });
}

/**
 * Generate a future sprint
 */
export function createFutureSprint(overrides: Partial<SprintData> = {}): SprintData {
  return createSprint({
    startOffset: 14,
    overrides: {
      name: "Future Sprint",
      ...overrides,
    },
  });
}
