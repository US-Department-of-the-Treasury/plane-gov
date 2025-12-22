/**
 * Epic Factory
 *
 * Generates realistic test data for epics (modules in Plane).
 */

import { faker } from "@faker-js/faker";

export interface EpicData {
  name: string;
  description?: string;
  description_html?: string;
  start_date?: string;
  target_date?: string;
  status?: "backlog" | "planned" | "in-progress" | "paused" | "completed" | "cancelled";
}

export interface EpicFactoryOptions {
  /** Override specific fields */
  overrides?: Partial<EpicData>;
  /** Generate with date range */
  withDates?: boolean;
  /** Epic duration in days (default: 90) */
  durationDays?: number;
}

/**
 * Generate a single epic
 */
export function createEpic(options: EpicFactoryOptions = {}): EpicData {
  const { overrides = {}, withDates = false, durationDays = 90 } = options;

  const name =
    overrides.name ??
    faker.helpers.arrayElement([
      `${faker.word.adjective()} ${faker.word.noun()} Feature`,
      `Q${faker.number.int({ min: 1, max: 4 })} ${faker.word.noun()} Initiative`,
      `${faker.company.buzzNoun()} ${faker.company.buzzVerb()} Project`,
      `User ${faker.word.noun()} Improvements`,
      `${faker.word.noun()} Platform Enhancement`,
      `${faker.word.noun()} Integration`,
    ]);

  const epic: EpicData = {
    name,
    description: faker.lorem.paragraphs({ min: 1, max: 2 }),
    status: faker.helpers.arrayElement<EpicData["status"]>([
      "backlog",
      "planned",
      "in-progress",
      "paused",
      "completed",
      "cancelled",
    ]),
    ...overrides,
  };

  if (withDates && !overrides.start_date && !overrides.target_date) {
    const startDate = faker.date.soon({ days: 14 });
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + durationDays);

    epic.start_date = startDate.toISOString().split("T")[0];
    epic.target_date = targetDate.toISOString().split("T")[0];
  }

  return epic;
}

/**
 * Generate multiple epics
 */
export function createEpics(count: number, options: EpicFactoryOptions = {}): EpicData[] {
  return Array.from({ length: count }, () => createEpic(options));
}

/**
 * Generate an epic for a specific quarter
 */
export function createQuarterlyEpic(quarter: 1 | 2 | 3 | 4, year?: number): EpicData {
  const currentYear = year ?? new Date().getFullYear();
  const quarterStartMonth = (quarter - 1) * 3;

  const startDate = new Date(currentYear, quarterStartMonth, 1);
  const targetDate = new Date(currentYear, quarterStartMonth + 3, 0); // Last day of quarter

  return createEpic({
    overrides: {
      name: `Q${quarter} ${currentYear} ${faker.word.noun()} Initiative`,
      start_date: startDate.toISOString().split("T")[0],
      target_date: targetDate.toISOString().split("T")[0],
      status: "planned",
    },
  });
}

/**
 * Generate an in-progress epic
 */
export function createActiveEpic(overrides: Partial<EpicData> = {}): EpicData {
  const startDate = faker.date.recent({ days: 30 });
  const targetDate = faker.date.soon({ days: 60 });

  return createEpic({
    overrides: {
      status: "in-progress",
      start_date: startDate.toISOString().split("T")[0],
      target_date: targetDate.toISOString().split("T")[0],
      ...overrides,
    },
  });
}

/**
 * Generate a completed epic
 */
export function createCompletedEpic(overrides: Partial<EpicData> = {}): EpicData {
  const targetDate = faker.date.recent({ days: 7 });
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 60);

  return createEpic({
    overrides: {
      status: "completed",
      start_date: startDate.toISOString().split("T")[0],
      target_date: targetDate.toISOString().split("T")[0],
      ...overrides,
    },
  });
}
