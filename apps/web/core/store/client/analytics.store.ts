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

// Legacy interface for backward compatibility with MobX store
export interface IAnalyticsStore {
  currentTab: TAnalyticsTabsBase;
  selectedProjects: string[];
  selectedDuration: DurationType;
  selectedSprint: string;
  selectedEpic: string;
  isPeekView?: boolean;
  isEpic?: boolean;
  selectedDurationLabel: DurationType | null;
  updateSelectedProjects: (projects: string[]) => void;
  updateSelectedDuration: (duration: DurationType) => void;
  updateSelectedSprint: (sprint: string) => void;
  updateSelectedEpic: (epic: string) => void;
  updateIsPeekView: (isPeekView: boolean) => void;
  updateIsEpic: (isEpic: boolean) => void;
}

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

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useAnalyticsStore hook directly in React components
 */
export class AnalyticsStoreLegacy implements IAnalyticsStore {
  get currentTab() {
    return useAnalyticsStore.getState().currentTab;
  }
  get selectedProjects() {
    return useAnalyticsStore.getState().selectedProjects;
  }
  get selectedDuration() {
    return useAnalyticsStore.getState().selectedDuration;
  }
  get selectedSprint() {
    return useAnalyticsStore.getState().selectedSprint;
  }
  get selectedEpic() {
    return useAnalyticsStore.getState().selectedEpic;
  }
  get isPeekView() {
    return useAnalyticsStore.getState().isPeekView;
  }
  get isEpic() {
    return useAnalyticsStore.getState().isEpic;
  }
  get selectedDurationLabel() {
    return useAnalyticsStore.getState().getSelectedDurationLabel();
  }

  updateSelectedProjects = (projects: string[]) =>
    useAnalyticsStore.getState().updateSelectedProjects(projects);

  updateSelectedDuration = (duration: DurationType) =>
    useAnalyticsStore.getState().updateSelectedDuration(duration);

  updateSelectedSprint = (sprint: string) =>
    useAnalyticsStore.getState().updateSelectedSprint(sprint);

  updateSelectedEpic = (epic: string) =>
    useAnalyticsStore.getState().updateSelectedEpic(epic);

  updateIsPeekView = (isPeekView: boolean) =>
    useAnalyticsStore.getState().updateIsPeekView(isPeekView);

  updateIsEpic = (isEpic: boolean) =>
    useAnalyticsStore.getState().updateIsEpic(isEpic);
}
