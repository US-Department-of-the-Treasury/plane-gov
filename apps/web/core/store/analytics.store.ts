import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { ANALYTICS_DURATION_FILTER_OPTIONS } from "@plane/constants";
import type { TAnalyticsTabsBase } from "@plane/types";

type DurationType = (typeof ANALYTICS_DURATION_FILTER_OPTIONS)[number]["value"];

export interface IBaseAnalyticsStore {
  //observables
  currentTab: TAnalyticsTabsBase;
  selectedProjects: string[];
  selectedDuration: DurationType;
  selectedSprint: string;
  selectedModule: string;
  isPeekView?: boolean;
  isEpic?: boolean;
  //computed
  selectedDurationLabel: DurationType | null;

  //actions
  updateSelectedProjects: (projects: string[]) => void;
  updateSelectedDuration: (duration: DurationType) => void;
  updateSelectedSprint: (sprint: string) => void;
  updateSelectedModule: (module: string) => void;
  updateIsPeekView: (isPeekView: boolean) => void;
  updateIsEpic: (isEpic: boolean) => void;
}

export abstract class BaseAnalyticsStore implements IBaseAnalyticsStore {
  //observables
  currentTab: TAnalyticsTabsBase = "overview";
  selectedProjects: string[] = [];
  selectedDuration: DurationType = "last_30_days";
  selectedSprint: string = "";
  selectedModule: string = "";
  isPeekView: boolean = false;
  isEpic: boolean = false;
  constructor() {
    makeObservable(this, {
      // observables
      currentTab: observable.ref,
      selectedDuration: observable.ref,
      selectedProjects: observable,
      selectedSprint: observable.ref,
      selectedModule: observable.ref,
      isPeekView: observable.ref,
      isEpic: observable.ref,
      // computed
      selectedDurationLabel: computed,
      // actions
      updateSelectedProjects: action,
      updateSelectedDuration: action,
      updateSelectedSprint: action,
      updateSelectedModule: action,
      updateIsPeekView: action,
      updateIsEpic: action,
    });
  }

  get selectedDurationLabel() {
    return ANALYTICS_DURATION_FILTER_OPTIONS.find((item) => item.value === this.selectedDuration)?.name ?? null;
  }

  updateSelectedProjects = (projects: string[]) => {
    try {
      runInAction(() => {
        this.selectedProjects = projects;
      });
    } catch (error) {
      console.error("Failed to update selected project");
      throw error;
    }
  };

  updateSelectedDuration = (duration: DurationType) => {
    try {
      runInAction(() => {
        this.selectedDuration = duration;
      });
    } catch (error) {
      console.error("Failed to update selected duration");
      throw error;
    }
  };

  updateSelectedSprint = (sprint: string) => {
    runInAction(() => {
      this.selectedSprint = sprint;
    });
  };

  updateSelectedModule = (module: string) => {
    runInAction(() => {
      this.selectedModule = module;
    });
  };

  updateIsPeekView = (isPeekView: boolean) => {
    runInAction(() => {
      this.isPeekView = isPeekView;
    });
  };

  updateIsEpic = (isEpic: boolean) => {
    runInAction(() => {
      this.isEpic = isEpic;
    });
  };
}
