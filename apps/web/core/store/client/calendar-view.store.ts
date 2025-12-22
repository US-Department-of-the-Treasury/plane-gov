import { create } from "zustand";
import type { ICalendarPayload, ICalendarWeek } from "@plane/types";
import { EStartOfTheWeek } from "@plane/types";
import { generateCalendarData, getWeekNumberOfDate } from "@plane/utils";

interface CalendarViewState {
  calendarFilters: {
    activeMonthDate: Date;
    activeWeekDate: Date;
  };
  calendarPayload: ICalendarPayload | null;
  startOfWeek: EStartOfTheWeek;
  // Computed properties (for backward compatibility with MobX interface)
  allWeeksOfActiveMonth:
    | {
        [weekNumber: string]: ICalendarWeek;
      }
    | undefined;
  activeWeekNumber: number;
  allDaysOfActiveWeek: ICalendarWeek | undefined;
}

interface CalendarViewActions {
  // Computed getters
  getAllWeeksOfActiveMonth: () =>
    | {
        [weekNumber: string]: ICalendarWeek;
      }
    | undefined;
  getActiveWeekNumber: () => number;
  getAllDaysOfActiveWeek: () => ICalendarWeek | undefined;
  getStartAndEndDate: (layout: "week" | "month") => { startDate: string; endDate: string } | undefined;
  // Actions
  setStartOfWeek: (startOfWeek: EStartOfTheWeek) => void;
  updateCalendarFilters: (filters: Partial<{ activeMonthDate: Date; activeWeekDate: Date }>) => void;
  updateCalendarPayload: (date: Date) => void;
  initCalendar: () => void;
  regenerateCalendar: () => void;
}

export type CalendarViewStore = CalendarViewState & CalendarViewActions;

const initialState: CalendarViewState = {
  calendarFilters: {
    activeMonthDate: new Date(),
    activeWeekDate: new Date(),
  },
  calendarPayload: null,
  startOfWeek: EStartOfTheWeek.SUNDAY,
  allWeeksOfActiveMonth: undefined,
  activeWeekNumber: 0,
  allDaysOfActiveWeek: undefined,
};

// Helper function to compute derived properties
const computeDerivedProperties = (state: CalendarViewState): Partial<CalendarViewState> => {
  const computed: Partial<CalendarViewState> = {};

  // Compute allWeeksOfActiveMonth
  if (state.calendarPayload) {
    const { activeMonthDate } = state.calendarFilters;
    const year = activeMonthDate.getFullYear();
    const month = activeMonthDate.getMonth();
    const weeks = state.calendarPayload[`y-${year}`]?.[`m-${month}`];

    if (weeks) {
      const reorderedWeeks: { [weekNumber: string]: ICalendarWeek } = {};
      const weekNumbers = Object.keys(weeks).map((key) => parseInt(key.replace("w-", "")));
      weekNumbers.sort((a, b) => a - b);
      weekNumbers.forEach((weekNumber) => {
        const weekKey = `w-${weekNumber}`;
        reorderedWeeks[weekKey] = weeks[weekKey];
      });
      computed.allWeeksOfActiveMonth = reorderedWeeks;
    } else {
      computed.allWeeksOfActiveMonth = undefined;
    }
  } else {
    computed.allWeeksOfActiveMonth = undefined;
  }

  // Compute activeWeekNumber
  computed.activeWeekNumber = getWeekNumberOfDate(state.calendarFilters.activeWeekDate);

  // Compute allDaysOfActiveWeek
  if (state.calendarPayload) {
    const { activeWeekDate } = state.calendarFilters;
    const year = activeWeekDate.getFullYear();
    const month = activeWeekDate.getMonth();
    const dayOfMonth = activeWeekDate.getDate();

    const yearData = state.calendarPayload[`y-${year}`];
    if (yearData) {
      const monthData = yearData[`m-${month}`];
      if (monthData) {
        const firstDayOfMonthRaw = new Date(year, month, 1).getDay();
        const firstDayOfMonth = (firstDayOfMonthRaw - state.startOfWeek + 7) % 7;
        const weekIndex = Math.floor((dayOfMonth - 1 + firstDayOfMonth) / 7);
        const weekKey = `w-${weekIndex}`;
        if (weekKey in monthData) {
          computed.allDaysOfActiveWeek = monthData[weekKey];
        } else {
          computed.allDaysOfActiveWeek = undefined;
        }
      } else {
        computed.allDaysOfActiveWeek = undefined;
      }
    } else {
      computed.allDaysOfActiveWeek = undefined;
    }
  } else {
    computed.allDaysOfActiveWeek = undefined;
  }

  return computed;
};

export const useCalendarViewStore = create<CalendarViewStore>()((set, get) => ({
  ...initialState,

  // Computed getters
  getAllWeeksOfActiveMonth: () => {
    const state = get();
    if (!state.calendarPayload) return undefined;

    const { activeMonthDate } = state.calendarFilters;
    const year = activeMonthDate.getFullYear();
    const month = activeMonthDate.getMonth();

    // Get the weeks for the current month
    const weeks = state.calendarPayload[`y-${year}`]?.[`m-${month}`];

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
  },

  getActiveWeekNumber: () => {
    const state = get();
    return getWeekNumberOfDate(state.calendarFilters.activeWeekDate);
  },

  getAllDaysOfActiveWeek: () => {
    const state = get();
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
    const firstDayOfMonthRaw = new Date(year, month, 1).getDay();
    const firstDayOfMonth = (firstDayOfMonthRaw - state.startOfWeek + 7) % 7;

    // Calculate which sequential week this date falls into
    const weekIndex = Math.floor((dayOfMonth - 1 + firstDayOfMonth) / 7);

    const weekKey = `w-${weekIndex}`;
    if (!(weekKey in monthData)) {
      return undefined;
    }
    return monthData[weekKey];
  },

  getStartAndEndDate: (layout: "week" | "month") => {
    const state = get();
    switch (layout) {
      case "week": {
        const allDaysOfActiveWeek = state.getAllDaysOfActiveWeek();
        if (!allDaysOfActiveWeek) return undefined;
        const dates = Object.keys(allDaysOfActiveWeek);
        return { startDate: dates[0], endDate: dates[dates.length - 1] };
      }
      case "month": {
        const allWeeksOfActiveMonth = state.getAllWeeksOfActiveMonth();
        if (!allWeeksOfActiveMonth) return undefined;
        const weeks = Object.keys(allWeeksOfActiveMonth);
        const firstWeekDates = Object.keys(allWeeksOfActiveMonth[weeks[0]]);
        const lastWeekDates = Object.keys(allWeeksOfActiveMonth[weeks[weeks.length - 1]]);

        return { startDate: firstWeekDates[0], endDate: lastWeekDates[lastWeekDates.length - 1] };
      }
    }
  },

  // Actions
  setStartOfWeek: (startOfWeek) => {
    set((state) => {
      const newState = { ...state, startOfWeek };
      return { ...newState, ...computeDerivedProperties(newState) };
    });
    // Regenerate calendar when startOfWeek changes
    get().regenerateCalendar();
  },

  updateCalendarFilters: (filters) => {
    const filterDate = filters.activeMonthDate || filters.activeWeekDate || new Date();
    get().updateCalendarPayload(filterDate);

    set((state) => {
      const newState = {
        ...state,
        calendarFilters: {
          ...state.calendarFilters,
          ...filters,
        },
      };
      return { ...newState, ...computeDerivedProperties(newState) };
    });
  },

  updateCalendarPayload: (date) => {
    set((state) => {
      if (!state.calendarPayload) return state;

      const nextDate = new Date(date);
      const newState = {
        ...state,
        calendarPayload: generateCalendarData(state.calendarPayload, nextDate, state.startOfWeek),
      };
      return { ...newState, ...computeDerivedProperties(newState) };
    });
  },

  initCalendar: () => {
    set((state) => {
      const newCalendarPayload = generateCalendarData(null, new Date(), state.startOfWeek);
      const newState = { ...state, calendarPayload: newCalendarPayload };
      return { ...newState, ...computeDerivedProperties(newState) };
    });
  },

  regenerateCalendar: () => {
    set((state) => {
      const { activeMonthDate } = state.calendarFilters;
      // Force complete regeneration by passing null to clear all cached data
      const newCalendarPayload = generateCalendarData(null, activeMonthDate, state.startOfWeek);
      const newState = { ...state, calendarPayload: newCalendarPayload };
      return { ...newState, ...computeDerivedProperties(newState) };
    });
  },
}));
