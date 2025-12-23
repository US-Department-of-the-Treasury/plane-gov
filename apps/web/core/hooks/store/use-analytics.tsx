"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { ANALYTICS_DURATION_FILTER_OPTIONS } from "@plane/constants";
import type { TAnalyticsTabsBase } from "@plane/types";

// Re-export TanStack Query hooks for data fetching
export {
  useAdvanceAnalytics,
  useAdvanceAnalyticsStats,
  useAdvanceAnalyticsCharts,
} from "@/store/queries";

// Types
type DurationType = (typeof ANALYTICS_DURATION_FILTER_OPTIONS)[number]["value"];

interface IAnalyticsContext {
  // Observables
  currentTab: TAnalyticsTabsBase;
  selectedProjects: string[];
  selectedDuration: DurationType;
  selectedSprint: string;
  selectedEpic: string;
  isPeekView: boolean;
  isEpic: boolean;
  // Computed
  selectedDurationLabel: string | null;
  // Actions
  updateSelectedProjects: (projects: string[]) => void;
  updateSelectedDuration: (duration: DurationType) => void;
  updateSelectedSprint: (sprint: string) => void;
  updateSelectedEpic: (epic: string) => void;
  updateIsPeekView: (isPeekView: boolean) => void;
  updateIsEpic: (isEpic: boolean) => void;
  updateCurrentTab: (tab: TAnalyticsTabsBase) => void;
}

// Create context
const AnalyticsContext = createContext<IAnalyticsContext | null>(null);

// Provider component
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  // State
  const [currentTab, setCurrentTab] = useState<TAnalyticsTabsBase>("overview");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<DurationType>("last_30_days");
  const [selectedSprint, setSelectedSprint] = useState<string>("");
  const [selectedEpic, setSelectedEpic] = useState<string>("");
  const [isPeekView, setIsPeekView] = useState<boolean>(false);
  const [isEpic, setIsEpic] = useState<boolean>(false);

  // Computed values
  const selectedDurationLabel = useMemo(
    () => ANALYTICS_DURATION_FILTER_OPTIONS.find((item) => item.value === selectedDuration)?.name ?? null,
    [selectedDuration]
  );

  // Actions
  const updateSelectedProjects = useCallback((projects: string[]) => {
    setSelectedProjects(projects);
  }, []);

  const updateSelectedDuration = useCallback((duration: DurationType) => {
    setSelectedDuration(duration);
  }, []);

  const updateSelectedSprint = useCallback((sprint: string) => {
    setSelectedSprint(sprint);
  }, []);

  const updateSelectedEpic = useCallback((epic: string) => {
    setSelectedEpic(epic);
  }, []);

  const updateIsPeekView = useCallback((value: boolean) => {
    setIsPeekView(value);
  }, []);

  const updateIsEpic = useCallback((value: boolean) => {
    setIsEpic(value);
  }, []);

  const updateCurrentTab = useCallback((tab: TAnalyticsTabsBase) => {
    setCurrentTab(tab);
  }, []);

  const value = useMemo(
    () => ({
      currentTab,
      selectedProjects,
      selectedDuration,
      selectedSprint,
      selectedEpic,
      isPeekView,
      isEpic,
      selectedDurationLabel,
      updateSelectedProjects,
      updateSelectedDuration,
      updateSelectedSprint,
      updateSelectedEpic,
      updateIsPeekView,
      updateIsEpic,
      updateCurrentTab,
    }),
    [
      currentTab,
      selectedProjects,
      selectedDuration,
      selectedSprint,
      selectedEpic,
      isPeekView,
      isEpic,
      selectedDurationLabel,
      updateSelectedProjects,
      updateSelectedDuration,
      updateSelectedSprint,
      updateSelectedEpic,
      updateIsPeekView,
      updateIsEpic,
      updateCurrentTab,
    ]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

// Hook to use analytics context
export function useAnalytics(): IAnalyticsContext {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}
