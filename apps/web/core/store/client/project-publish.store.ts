import { create } from "zustand";
import type { TProjectPublishSettings } from "@plane/types";

/**
 * Project publish settings state managed by Zustand.
 */
interface ProjectPublishStoreState {
  // States
  generalLoader: boolean;
  fetchSettingsLoader: boolean;
  // Data cache
  publishSettingsMap: Record<string, TProjectPublishSettings>; // projectID => TProjectPublishSettings
}

interface ProjectPublishStoreActions {
  // Setters
  setGeneralLoader: (loading: boolean) => void;
  setFetchSettingsLoader: (loading: boolean) => void;
  setPublishSettings: (projectID: string, settings: TProjectPublishSettings) => void;
  removePublishSettings: (projectID: string) => void;
  // Getters
  getPublishSettingsByProjectID: (projectID: string) => TProjectPublishSettings | undefined;
}

export type ProjectPublishStore = ProjectPublishStoreState & ProjectPublishStoreActions;

const initialState: ProjectPublishStoreState = {
  generalLoader: false,
  fetchSettingsLoader: false,
  publishSettingsMap: {},
};

export const useProjectPublishStore = create<ProjectPublishStore>()((set, get) => ({
  ...initialState,

  // Setters
  setGeneralLoader: (loading) => {
    set({ generalLoader: loading });
  },

  setFetchSettingsLoader: (loading) => {
    set({ fetchSettingsLoader: loading });
  },

  setPublishSettings: (projectID, settings) => {
    set((state) => {
      const newMap = { ...state.publishSettingsMap };
      // Direct property access for proper Zustand reactivity
      newMap[projectID] = settings;
      return { publishSettingsMap: newMap };
    });
  },

  removePublishSettings: (projectID) => {
    set((state) => {
      const newMap = { ...state.publishSettingsMap };
      delete newMap[projectID];
      return { publishSettingsMap: newMap };
    });
  },

  // Getters
  getPublishSettingsByProjectID: (projectID) => {
    return get().publishSettingsMap?.[projectID] ?? undefined;
  },
}));
