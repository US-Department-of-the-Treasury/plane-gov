import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// helpers
import type { ICalendarPayload, ICalendarWeek } from "@plane/types";
import { EStartOfTheWeek } from "@plane/types";
import { generateCalendarData, getWeekNumberOfDate } from "@plane/utils";
// types
import type { IIssueRootStore } from "./root.store";

export interface ICalendarStore {
  calendarFilters: {
    activeMonthDate: Date;
    activeWeekDate: Date;
  };
  calendarPayload: ICalendarPayload | null;

  // action
  updateCalendarFilters: (filters: Partial<{ activeMonthDate: Date; activeWeekDate: Date }>) => void;
  updateCalendarPayload: (date: Date) => void;
  regenerateCalendar: () => void;

  // computed
  allWeeksOfActiveMonth:
    | {
        [weekNumber: string]: ICalendarWeek;
      }
    | undefined;
  activeWeekNumber: number;
  allDaysOfActiveWeek: ICalendarWeek | undefined;
  getStartAndEndDate: (layout: "week" | "month") => { startDate: string; endDate: string } | undefined;
}

// Zustand Store
interface CalendarState {
  loader: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any | null;
  calendarFilters: {
    activeMonthDate: Date;
    activeWeekDate: Date;
  };
  calendarPayload: ICalendarPayload | null;
  rootStore: IIssueRootStore | null;
}

interface CalendarActions {
  setRootStore: (rootStore: IIssueRootStore) => void;
  updateCalendarFilters: (filters: Partial<{ activeMonthDate: Date; activeWeekDate: Date }>) => void;
  updateCalendarPayload: (date: Date) => void;
  regenerateCalendar: () => void;
  initCalendar: () => void;
}

type CalendarStoreType = CalendarState & CalendarActions;

export const useCalendarStore = create<CalendarStoreType>()(
  immer((set, get) => ({
    // State
    loader: false,
    error: null,
    calendarFilters: {
      activeMonthDate: new Date(),
      activeWeekDate: new Date(),
    },
    calendarPayload: null,
    rootStore: null,

    // Actions
    setRootStore: (rootStore) => {
      set((state) => {
        state.rootStore = rootStore;
      });
    },

    updateCalendarFilters: (filters) => {
      const date = filters.activeMonthDate || filters.activeWeekDate || new Date();
      get().updateCalendarPayload(date);

      set((state) => {
        state.calendarFilters = {
          ...state.calendarFilters,
          ...filters,
        };
      });
    },

    updateCalendarPayload: (date) => {
      const state = get();
      if (!state.calendarPayload) return;

      const nextDate = new Date(date);
      const startOfWeek = state.rootStore?.rootStore?.user?.userProfile?.data?.start_of_the_week ?? EStartOfTheWeek.SUNDAY;

      set((draftState) => {
        draftState.calendarPayload = generateCalendarData(state.calendarPayload, nextDate, startOfWeek);
      });
    },

    initCalendar: () => {
      const state = get();
      const startOfWeek = state.rootStore?.rootStore?.user?.userProfile?.data?.start_of_the_week ?? EStartOfTheWeek.SUNDAY;
      const newCalendarPayload = generateCalendarData(null, new Date(), startOfWeek);

      set((draftState) => {
        draftState.calendarPayload = newCalendarPayload;
      });
    },

    regenerateCalendar: () => {
      const state = get();
      const startOfWeek = state.rootStore?.rootStore?.user?.userProfile?.data?.start_of_the_week ?? EStartOfTheWeek.SUNDAY;
      const { activeMonthDate } = state.calendarFilters;

      // Force complete regeneration by passing null to clear all cached data
      const newCalendarPayload = generateCalendarData(null, activeMonthDate, startOfWeek);

      set((draftState) => {
        draftState.calendarPayload = newCalendarPayload;
      });
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class CalendarStore implements ICalendarStore {
  private rootStoreRef: IIssueRootStore;
  private unsubscribe?: () => void;

  constructor(_rootStore: IIssueRootStore) {
    this.rootStoreRef = _rootStore;
    const store = useCalendarStore.getState();
    store.setRootStore(_rootStore);
    store.initCalendar();

    // Watch for changes in startOfWeek preference and regenerate calendar
    let previousStartOfWeek = _rootStore.rootStore.user.userProfile.data?.start_of_the_week;
    this.unsubscribe = useCalendarStore.subscribe(() => {
      const currentStartOfWeek = this.rootStoreRef.rootStore.user.userProfile.data?.start_of_the_week;
      if (currentStartOfWeek !== previousStartOfWeek) {
        previousStartOfWeek = currentStartOfWeek;
        this.regenerateCalendar();
      }
    });
  }

  private get store() {
    return useCalendarStore.getState();
  }

  get loader() {
    return this.store.loader;
  }

  get error() {
    return this.store.error;
  }

  get calendarFilters() {
    return this.store.calendarFilters;
  }

  get calendarPayload() {
    return this.store.calendarPayload;
  }

  get rootStore() {
    return this.rootStoreRef;
  }

  get allWeeksOfActiveMonth() {
    const state = this.store;
    if (!state.calendarPayload) return undefined;

    const { activeMonthDate } = state.calendarFilters;

    const year = activeMonthDate.getFullYear();
    const month = activeMonthDate.getMonth();

    // Get the weeks for the current month
    const weeks = state.calendarPayload[`y-${year}`][`m-${month}`];

    // If no weeks exist, return undefined
    if (!weeks) return undefined;

    // Create a new object to store the reordered weeks
    const reorderedWeeks: { [weekNumber: string]: ICalendarWeek } = {};

    // Get all week numbers and sort them
    const weekNumbers = Object.keys(weeks).map((key) => parseInt(key.replace("w-", "")));
    weekNumbers.sort((a, b) => a - b);

    // Reorder weeks based on start_of_week
    weekNumbers.forEach((weekNumber) => {
      const weekKey = `w-${weekNumber}`;
      reorderedWeeks[weekKey] = weeks[weekKey];
    });

    return reorderedWeeks;
  }

  get activeWeekNumber() {
    return getWeekNumberOfDate(this.store.calendarFilters.activeWeekDate);
  }

  get allDaysOfActiveWeek() {
    const state = this.store;
    if (!state.calendarPayload) return undefined;

    const { activeWeekDate } = state.calendarFilters;
    const year = activeWeekDate.getFullYear();
    const month = activeWeekDate.getMonth();
    const dayOfMonth = activeWeekDate.getDate();

    // Check if calendar data exists for this year and month
    const yearData = state.calendarPayload[`y-${year}`];
    if (!yearData) return undefined;

    const monthData = yearData[`m-${month}`];
    if (!monthData) return undefined;

    // Calculate firstDayOfMonth offset (same logic as calendar generation)
    const startOfWeek = this.rootStoreRef?.rootStore?.user?.userProfile?.data?.start_of_the_week ?? EStartOfTheWeek.SUNDAY;
    const firstDayOfMonthRaw = new Date(year, month, 1).getDay();
    const firstDayOfMonth = (firstDayOfMonthRaw - startOfWeek + 7) % 7;

    // Calculate which sequential week this date falls into
    const weekIndex = Math.floor((dayOfMonth - 1 + firstDayOfMonth) / 7);

    const weekKey = `w-${weekIndex}`;
    if (!(weekKey in monthData)) {
      return undefined;
    }
    return monthData[weekKey];
  }

  getStartAndEndDate = (layout: "week" | "month") => {
    switch (layout) {
      case "week": {
        if (!this.allDaysOfActiveWeek) return;
        const dates = Object.keys(this.allDaysOfActiveWeek);
        return { startDate: dates[0], endDate: dates[dates.length - 1] };
      }
      case "month": {
        if (!this.allWeeksOfActiveMonth) return;
        const weeks = Object.keys(this.allWeeksOfActiveMonth);
        const firstWeekDates = Object.keys(this.allWeeksOfActiveMonth[weeks[0]]);
        const lastWeekDates = Object.keys(this.allWeeksOfActiveMonth[weeks[weeks.length - 1]]);

        return { startDate: firstWeekDates[0], endDate: lastWeekDates[lastWeekDates.length - 1] };
      }
    }
  };

  updateCalendarFilters = (filters: Partial<{ activeMonthDate: Date; activeWeekDate: Date }>) =>
    this.store.updateCalendarFilters(filters);

  updateCalendarPayload = (date: Date) => this.store.updateCalendarPayload(date);

  regenerateCalendar = () => this.store.regenerateCalendar();

  initCalendar = () => this.store.initCalendar();
}
