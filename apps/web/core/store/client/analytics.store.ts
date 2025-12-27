import { create } from "zustand";
import { ANALYTICS_DURATION_FILTER_OPTIONS } from "@plane/constants";
import type { TAnalyticsTabsBase } from "@plane/types";

type DurationType = (typeof ANALYTICS_DURATION_FILTER_OPTIONS)[number]["value"];

interface AnalyticsState {
  currentTab: TAnalyticsTabsBase;
  selectedProjects: string[];
  selectedDuration: DurationType;
  selectedSprint: string;
  selectedEpic: string;
  isPeekView: boolean;
  isEpic: boolean;
}

interface AnalyticsActions {
  // Computed
  getSelectedDurationLabel: () => DurationType | null;
  // Actions
  updateSelectedProjects: (projects: string[]) => void;
  updateSelectedDuration: (duration: DurationType) => void;
  updateSelectedSprint: (sprint: string) => void;
  updateSelectedEpic: (epic: string) => void;
  updateIsPeekView: (isPeekView: boolean) => void;
  updateIsEpic: (isEpic: boolean) => void;
}

export type AnalyticsStore = AnalyticsState & AnalyticsActions;

const initialState: AnalyticsState = {
  currentTab: "overview",
  selectedProjects: [],
  selectedDuration: "last_30_days",
  selectedSprint: "",
  selectedEpic: "",
  isPeekView: false,
  isEpic: false,
};

export const useAnalyticsStore = create<AnalyticsStore>()((set, get) => ({
  ...initialState,

  // Computed
  getSelectedDurationLabel: () => {
    const duration = get().selectedDuration;
    return ANALYTICS_DURATION_FILTER_OPTIONS.find((item) => item.value === duration)?.name ?? null;
  },

  // Actions
  updateSelectedProjects: (projects) => {
    set({ selectedProjects: projects });
  },

  updateSelectedDuration: (duration) => {
    set({ selectedDuration: duration });
  },

  updateSelectedSprint: (sprint) => {
    set({ selectedSprint: sprint });
  },

  updateSelectedEpic: (epic) => {
    set({ selectedEpic: epic });
  },

  updateIsPeekView: (isPeekView) => {
    set({ isPeekView });
  },

  updateIsEpic: (isEpic) => {
    set({ isEpic });
  },
}));
