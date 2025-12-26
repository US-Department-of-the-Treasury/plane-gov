import type { ISprint } from "@plane/types";

/**
 * Virtual sprint - a calculated sprint that doesn't exist in the database yet.
 * Virtual sprints are displayed in the Resources matrix and are materialized
 * (created in the database) when a team member is assigned to them.
 */
export type TVirtualSprint = {
  /** Sprint number, same as real sprint's sort_order/number */
  number: number;
  /** Display name (e.g., "Sprint 15") */
  name: string;
  /** Start date in YYYY-MM-DD format */
  start_date: string;
  /** End date in YYYY-MM-DD format */
  end_date: string;
  /** Flag to identify virtual sprints */
  isVirtual: true;
};

/**
 * Combined type for display purposes - can be either real or virtual sprint.
 */
export type TDisplaySprint = ISprint | TVirtualSprint;

/**
 * Type guard to check if a sprint is virtual.
 *
 * @example
 * const sprints = mergeSprintsForDisplay(realSprints, startDate);
 * sprints.forEach(sprint => {
 *   if (isVirtualSprint(sprint)) {
 *     // Handle virtual sprint (no UUID yet)
 *   } else {
 *     // Handle real sprint (has UUID)
 *   }
 * });
 */
export function isVirtualSprint(sprint: TDisplaySprint): sprint is TVirtualSprint {
  return "isVirtual" in sprint && sprint.isVirtual === true;
}

/**
 * Get the sprint number from a display sprint (works for both real and virtual).
 */
export function getSprintNumber(sprint: TDisplaySprint): number {
  if (isVirtualSprint(sprint)) {
    return sprint.number;
  }
  // Real sprints have a `number` field which is the actual sprint number (1, 2, 3, etc.)
  // Note: sort_order is used for drag-drop ordering and is typically number * 10000
  return sprint.number;
}

/**
 * Derive the workspace sprint start date from existing sprints.
 * Uses Sprint 1's start date, or calculates backwards from any available sprint.
 */
function deriveWorkspaceSprintStartDate(existingSprints: ISprint[]): Date | null {
  if (existingSprints.length === 0) return null;

  // Find Sprint 1 if it exists
  const sprint1 = existingSprints.find((s) => s.number === 1);
  if (sprint1?.start_date) {
    return new Date(sprint1.start_date);
  }

  // Otherwise, calculate backwards from the lowest numbered sprint
  const sorted = [...existingSprints].sort((a, b) => a.number - b.number);

  const lowestSprint = sorted[0];
  if (!lowestSprint?.start_date) return null;

  const lowestNumber = lowestSprint.number;
  const lowestStartDate = new Date(lowestSprint.start_date);

  // Calculate backwards: Sprint N starts at (N-1) * 14 days from Sprint 1
  const daysFromSprint1 = (lowestNumber - 1) * 14;
  const sprint1Date = new Date(lowestStartDate);
  sprint1Date.setDate(sprint1Date.getDate() - daysFromSprint1);

  return sprint1Date;
}

/**
 * Calculate virtual sprints based on existing real sprints.
 * Returns sprints that don't yet exist in the database.
 *
 * @param existingSprints - Array of real sprints from the database
 * @param futureSprintsCount - Number of virtual sprints to generate (default ~1 year)
 *
 * @example
 * const virtualSprints = calculateVirtualSprints(realSprints, 27);
 */
export function calculateVirtualSprints(
  existingSprints: ISprint[],
  futureSprintsCount: number = 27 // ~1 year of 2-week sprints
): TVirtualSprint[] {
  const startDate = deriveWorkspaceSprintStartDate(existingSprints);
  if (!startDate) return [];

  // Get existing sprint numbers
  const existingNumbers = new Set(existingSprints.map((s) => s.number));
  const maxExistingNumber = Math.max(0, ...existingNumbers);

  const virtualSprints: TVirtualSprint[] = [];

  for (let num = maxExistingNumber + 1; num <= maxExistingNumber + futureSprintsCount; num++) {
    // Calculate sprint start: (num - 1) * 14 days from workspace start
    const sprintStart = new Date(startDate);
    sprintStart.setDate(sprintStart.getDate() + (num - 1) * 14);

    // Sprint end is 13 days after start (14 day sprint, inclusive)
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintEnd.getDate() + 13);

    virtualSprints.push({
      number: num,
      name: `Sprint ${num}`,
      start_date: formatDateISO(sprintStart),
      end_date: formatDateISO(sprintEnd),
      isVirtual: true,
    });
  }

  return virtualSprints;
}

/**
 * Merge real sprints with virtual sprints for display.
 * Returns a combined array sorted by sprint number.
 *
 * @param realSprints - Array of real sprints from the database
 * @param futureSprintsCount - Number of virtual sprints to generate
 *
 * @example
 * const displaySprints = mergeSprintsForDisplay(realSprints, 27);
 *
 * displaySprints.forEach(sprint => {
 *   if (isVirtualSprint(sprint)) {
 *     // Render virtual sprint UI
 *   } else {
 *     // Render real sprint UI
 *   }
 * });
 */
export function mergeSprintsForDisplay(
  realSprints: ISprint[],
  futureSprintsCount: number = 27
): TDisplaySprint[] {
  const virtualSprints = calculateVirtualSprints(realSprints, futureSprintsCount);

  return [...realSprints, ...virtualSprints].sort((a, b) => {
    const aNum = getSprintNumber(a);
    const bNum = getSprintNumber(b);
    return aNum - bNum;
  });
}

/**
 * Get the ID for a display sprint.
 * For real sprints, returns the UUID.
 * For virtual sprints, returns a temporary ID based on sprint number.
 */
export function getDisplaySprintId(sprint: TDisplaySprint): string {
  if (isVirtualSprint(sprint)) {
    return `virtual-${sprint.number}`;
  }
  return sprint.id;
}

/**
 * Check if a display sprint ID represents a virtual sprint.
 */
export function isVirtualSprintId(id: string): boolean {
  return id.startsWith("virtual-");
}

/**
 * Extract sprint number from a virtual sprint ID.
 */
export function getNumberFromVirtualSprintId(id: string): number | null {
  if (!isVirtualSprintId(id)) return null;
  const num = parseInt(id.replace("virtual-", ""), 10);
  return isNaN(num) ? null : num;
}

// Helper function to format date as YYYY-MM-DD
function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
