import { sortBy } from "lodash-es";
// plane imports
import type { IEpic, TEpicDisplayFilters, TEpicFilters, TEpicOrderByOptions } from "@plane/types";
// local imports
import { getDate } from "./datetime";
import { satisfiesDateFilter } from "./filter";

const collator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

/**
 * @description performs natural sorting of strings (handles numbers within strings correctly)
 * @param {string} a - first string to compare
 * @param {string} b - second string to compare
 * @returns {number} - comparison result (-1, 0, or 1)
 */
const naturalSort = (a: string, b: string): number => collator.compare(a, b);
/**
 * @description orders epics based on their status
 * @param {IEpic[]} epics
 * @param {TEpicOrderByOptions | undefined} orderByKey
 * @returns {IEpic[]}
 */
export const orderEpics = (epics: IEpic[], orderByKey: TEpicOrderByOptions | undefined): IEpic[] => {
  let orderedEpics: IEpic[] = [];
  if (epics.length === 0 || !orderByKey) return [];

  if (orderByKey === "name") orderedEpics = [...epics].sort((a, b) => naturalSort(a.name, b.name));
  if (orderByKey === "-name") orderedEpics = [...epics].sort((a, b) => naturalSort(b.name, a.name));
  if (["progress", "-progress"].includes(orderByKey))
    orderedEpics = sortBy(epics, [
      (m) => {
        let progress = (m.completed_issues + m.cancelled_issues) / m.total_issues;
        if (isNaN(progress)) progress = 0;
        return orderByKey === "progress" ? progress : -progress;
      },
    ]);
  if (["issues_length", "-issues_length"].includes(orderByKey))
    orderedEpics = sortBy(epics, [(m) => (orderByKey === "issues_length" ? m.total_issues : !m.total_issues)]);
  if (orderByKey === "target_date") orderedEpics = sortBy(epics, [(m) => m.target_date]);
  if (orderByKey === "-target_date") orderedEpics = sortBy(epics, [(m) => !m.target_date]);
  if (orderByKey === "created_at") orderedEpics = sortBy(epics, [(m) => m.created_at]);
  if (orderByKey === "-created_at") orderedEpics = sortBy(epics, [(m) => !m.created_at]);

  if (orderByKey === "sort_order") orderedEpics = sortBy(epics, [(m) => m.sort_order]);
  return orderedEpics;
};

/**
 * @description filters epics based on the filters
 * @param {IEpic} epic
 * @param {TEpicDisplayFilters} displayFilters
 * @param {TEpicFilters} filters
 * @returns {boolean}
 */
export const shouldFilterEpic = (
  epic: IEpic,
  displayFilters: TEpicDisplayFilters,
  filters: TEpicFilters
): boolean => {
  let fallsInFilters = true;
  Object.keys(filters).forEach((key) => {
    const filterKey = key as keyof TEpicFilters;
    if (filterKey === "status" && filters.status && filters.status.length > 0)
      fallsInFilters = fallsInFilters && filters.status.includes(epic.status?.toLowerCase() ?? "");
    if (filterKey === "lead" && filters.lead && filters.lead.length > 0)
      fallsInFilters = fallsInFilters && filters.lead.includes(`${epic.lead_id}`);
    if (filterKey === "members" && filters.members && filters.members.length > 0) {
      const memberIds = epic.member_ids;
      fallsInFilters = fallsInFilters && filters.members.some((memberId) => memberIds.includes(memberId));
    }
    if (filterKey === "start_date" && filters.start_date && filters.start_date.length > 0) {
      const startDate = getDate(epic.start_date);
      filters.start_date.forEach((dateFilter) => {
        fallsInFilters = fallsInFilters && !!startDate && satisfiesDateFilter(startDate, dateFilter);
      });
    }
    if (filterKey === "target_date" && filters.target_date && filters.target_date.length > 0) {
      const endDate = getDate(epic.target_date);
      filters.target_date.forEach((dateFilter) => {
        fallsInFilters = fallsInFilters && !!endDate && satisfiesDateFilter(endDate, dateFilter);
      });
    }
  });
  if (displayFilters.favorites && !epic.is_favorite) fallsInFilters = false;

  return fallsInFilters;
};
