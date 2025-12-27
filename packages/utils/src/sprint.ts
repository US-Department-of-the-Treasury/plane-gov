import { startOfToday, format } from "date-fns";
import { isEmpty, orderBy, sortBy, uniqBy } from "lodash-es";
// plane imports
import type { ISprint, TSprintFilters, TProgressSnapshot } from "@plane/types";
// local imports
import { findTotalDaysInRange, generateDateArray, getDate } from "./datetime";
import { satisfiesDateFilter } from "./filter";

/**
 * Orders sprints based on their status
 * @param {ISprint[]} sprints - Array of sprints to be ordered
 * @param {boolean} sortByManual - Whether to sort by manual order
 * @returns {ISprint[]} Ordered array of sprints
 */
export const orderSprints = (sprints: ISprint[], sortByManual: boolean): ISprint[] => {
  if (sprints.length === 0) return [];

  const acceptedStatuses = ["current", "upcoming", "draft"];
  const STATUS_ORDER: {
    [key: string]: number;
  } = {
    current: 1,
    upcoming: 2,
    draft: 3,
  };

  let filteredSprints = sprints.filter((c) => acceptedStatuses.includes(c.status?.toLowerCase() ?? ""));
  if (sortByManual) filteredSprints = sortBy(filteredSprints, [(c) => c.sort_order]);
  else
    filteredSprints = sortBy(filteredSprints, [
      (c) => STATUS_ORDER[c.status?.toLowerCase() ?? ""],
      (c) => (c.status?.toLowerCase() === "upcoming" ? c.start_date : c.name.toLowerCase()),
    ]);

  return filteredSprints;
};

/**
 * Filters sprints based on provided filter criteria
 * @param {ISprint} sprint - The sprint to be filtered
 * @param {TSprintFilters} filter - Filter criteria to apply
 * @returns {boolean} Whether the sprint passes the filter
 */
export const shouldFilterSprint = (sprint: ISprint, filter: TSprintFilters): boolean => {
  let fallsInFilters = true;
  Object.keys(filter).forEach((key) => {
    const filterKey = key as keyof TSprintFilters;
    if (filterKey === "status" && filter.status && filter.status.length > 0)
      fallsInFilters = fallsInFilters && filter.status.includes(sprint.status?.toLowerCase() ?? "");
    if (filterKey === "start_date" && filter.start_date && filter.start_date.length > 0) {
      const startDate = getDate(sprint.start_date);
      filter.start_date.forEach((dateFilter) => {
        fallsInFilters = fallsInFilters && !!startDate && satisfiesDateFilter(startDate, dateFilter);
      });
    }
    if (filterKey === "end_date" && filter.end_date && filter.end_date.length > 0) {
      const endDate = getDate(sprint.end_date);
      filter.end_date.forEach((dateFilter) => {
        fallsInFilters = fallsInFilters && !!endDate && satisfiesDateFilter(endDate, dateFilter);
      });
    }
  });

  return fallsInFilters;
};

/**
 * Calculates the scope based on whether it's an issue or estimate points
 * @param {object} p - Progress data with total_issues and optional total_estimate_points
 * @param {boolean} isTypeIssue - Whether the type is an issue
 * @returns {number} Calculated scope
 */
const scope = (p: { total_issues?: number; total_estimate_points?: number }, isTypeIssue: boolean): number =>
  (isTypeIssue ? p.total_issues : p.total_estimate_points) ?? 0;

/**
 * Calculates the ideal progress value
 * @param {string} date - Current date
 * @param {number} scope - Total scope
 * @param {ISprint} sprint - Sprint data
 * @returns {number} Ideal progress value
 */
const ideal = (date: string, scope: number, sprint: ISprint) =>
  Math.floor(
    ((findTotalDaysInRange(date, sprint.end_date) || 0) /
      (findTotalDaysInRange(sprint.start_date, sprint.end_date) || 0)) *
      scope
  );

/**
 * Formats sprint data for version 1
 * @param {boolean} isTypeIssue - Whether the type is an issue
 * @param {ISprint} sprint - Sprint data
 * @param {boolean} isBurnDown - Whether it's a burn down chart
 * @param {Date|string} endDate - End date
 * @returns {TProgressChartData} Formatted progress data
 */
const formatV1Data = (isTypeIssue: boolean, sprint: ISprint, isBurnDown: boolean, endDate: Date | string) => {
  const today = format(startOfToday(), "yyyy-MM-dd");
  const data = isTypeIssue ? sprint.distribution : sprint.estimate_distribution;
  const extendedArray = generateDateArray(endDate, endDate).map((d) => d.date);

  if (isEmpty(data)) return [];
  const progress = [...Object.keys(data.completion_chart), ...extendedArray].map((p) => {
    const pending = data.completion_chart[p] || 0;
    const total = isTypeIssue ? sprint.total_issues : sprint.total_estimate_points;
    const completed = scope(sprint, isTypeIssue) - pending;

    return {
      date: p,
      scope: p < today ? scope(sprint, isTypeIssue) : null,
      completed,
      backlog: isTypeIssue ? sprint.backlog_issues : sprint.backlog_estimate_points,
      started: p === today ? sprint[isTypeIssue ? "started_issues" : "started_estimate_points"] : undefined,
      unstarted: p === today ? sprint[isTypeIssue ? "unstarted_issues" : "unstarted_estimate_points"] : undefined,
      cancelled: p === today ? sprint[isTypeIssue ? "cancelled_issues" : "cancelled_estimate_points"] : undefined,
      pending: Math.abs(pending || 0),
      ideal: p < today ? ideal(p, total || 0, sprint) : p <= sprint.end_date! ? ideal(today, total || 0, sprint) : null,
      actual: p <= today ? (isBurnDown ? Math.abs(pending) : completed) : undefined,
    };
  });

  return progress;
};

/**
 * Formats sprint data for version 2
 * @param {boolean} isTypeIssue - Whether the type is an issue
 * @param {ISprint} sprint - Sprint data
 * @param {boolean} isBurnDown - Whether it's a burn down chart
 * @param {Date|string} endDate - End date
 * @returns {TProgressChartData} Formatted progress data
 */
const formatV2Data = (isTypeIssue: boolean, sprint: ISprint, isBurnDown: boolean, endDate: Date | string) => {
  if (!sprint.progress) return [];
  let today: Date | string = startOfToday();

  const extendedArray = endDate > today ? generateDateArray(today, endDate) : [];
  if (isEmpty(sprint.progress)) return extendedArray;
  today = format(startOfToday(), "yyyy-MM-dd");
  const todaysData = sprint?.progress[sprint?.progress.length - 1];
  const scopeToday = scope(todaysData, isTypeIssue);
  const todaysDate = todaysData?.date ?? todaysData?.progress_date ?? today;
  const idealToday = ideal(todaysDate, scopeToday, sprint);

  // Type guard to check if item is a full progress item (has total_issues)
  const isProgressItem = (p: { date?: string; total_issues?: number }): p is typeof todaysData =>
    "total_issues" in p && p.total_issues !== undefined;

  let progress = [...orderBy(sprint?.progress, "date"), ...extendedArray].map((p) => {
    // For extended dates (future), use 0 for calculations
    const pending = isProgressItem(p)
      ? isTypeIssue
        ? p.total_issues - p.completed_issues - p.cancelled_issues
        : (p.total_estimate_points ?? 0) - (p.completed_estimate_points ?? 0) - p.cancelled_estimate_points
      : 0;
    const completed = isProgressItem(p) ? (isTypeIssue ? p.completed_issues : p.completed_estimate_points) : 0;
    const dataDate = isProgressItem(p) && p.progress_date ? format(new Date(p.progress_date), "yyyy-MM-dd") : p.date;

    // For scope calculation, use data from progress item or fall back to today's scope
    const itemScope = isProgressItem(p) ? scope(p, isTypeIssue) : scopeToday;

    return {
      date: dataDate,
      scope: dataDate && dataDate < today ? itemScope : dataDate && dataDate <= sprint.end_date! ? scopeToday : null,
      completed,
      backlog: isProgressItem(p) ? (isTypeIssue ? p.backlog_issues : p.backlog_estimate_points) : 0,
      started: isProgressItem(p) ? (isTypeIssue ? p.started_issues : p.started_estimate_points) : 0,
      unstarted: isProgressItem(p) ? (isTypeIssue ? p.unstarted_issues : p.unstarted_estimate_points) : 0,
      cancelled: isProgressItem(p) ? (isTypeIssue ? p.cancelled_issues : p.cancelled_estimate_points) : 0,
      pending: Math.abs(pending),
      ideal:
        dataDate && dataDate < today
          ? ideal(dataDate, itemScope, sprint)
          : dataDate && dataDate < sprint.end_date!
            ? idealToday
            : null,
      actual: dataDate && dataDate <= today ? (isBurnDown ? Math.abs(pending) : completed) : undefined,
    };
  });
  progress = uniqBy(progress, "date");

  return progress;
};

export const formatActiveSprint = (args: {
  sprint: ISprint;
  isBurnDown?: boolean | undefined;
  isTypeIssue?: boolean | undefined;
}) => {
  const { sprint, isBurnDown, isTypeIssue } = args;
  const endDate: Date | string = new Date(sprint.end_date!);

  return sprint.version === 1
    ? formatV1Data(isTypeIssue!, sprint, isBurnDown!, endDate)
    : formatV2Data(isTypeIssue!, sprint, isBurnDown!, endDate);
};

/**
 * Calculates sprint progress percentage excluding cancelled issues from total count
 * Formula: completed / (total - cancelled) * 100
 * This gives accurate progress based on: pendingIssues = totalIssues - completedIssues - cancelledIssues
 * @param sprint - Sprint data object
 * @param estimateType - Whether to calculate based on "issues" or "points"
 * @param includeInProgress - Whether to include started/in-progress items in completion calculation
 * @returns Progress percentage (0-100)
 */
export const calculateSprintProgress = (
  sprint: ISprint | undefined,
  estimateType: "issues" | "points" = "issues",
  includeInProgress: boolean = false
): number => {
  if (!sprint) return 0;

  const progressSnapshot: TProgressSnapshot | undefined = sprint.progress_snapshot;
  const sprintDetails = progressSnapshot && !isEmpty(progressSnapshot) ? progressSnapshot : sprint;

  let completed: number;
  let cancelled: number;
  let total: number;

  if (estimateType === "points") {
    completed = sprintDetails.completed_estimate_points || 0;
    cancelled = sprintDetails.cancelled_estimate_points || 0;
    total = sprintDetails.total_estimate_points || 0;

    if (includeInProgress) {
      completed += sprintDetails.started_estimate_points || 0;
    }
  } else {
    completed = sprintDetails.completed_issues || 0;
    cancelled = sprintDetails.cancelled_issues || 0;
    total = sprintDetails.total_issues || 0;

    if (includeInProgress) {
      completed += sprintDetails.started_issues || 0;
    }
  }

  // Exclude cancelled issues from total (pendingIssues = total - completed - cancelled)
  const adjustedTotal = total - cancelled;

  // Handle edge cases
  if (adjustedTotal === 0) return 0;
  if (completed < 0 || adjustedTotal < 0) return 0;
  if (completed > adjustedTotal) return 100;

  // Calculate percentage and round
  const percentage = (completed / adjustedTotal) * 100;
  return Math.round(percentage);
};
