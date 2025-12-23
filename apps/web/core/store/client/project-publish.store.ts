import { create } from "zustand";
import { set as lodashSet, unset as lodashUnset } from "lodash-es";
import type { TProjectPublishSettings } from "@plane/types";
import { ProjectPublishService } from "@/services/project";

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
      lodashSet(newMap, [projectID], settings);
      return { publishSettingsMap: newMap };
    });
  },

  removePublishSettings: (projectID) => {
    set((state) => {
      const newMap = { ...state.publishSettingsMap };
      lodashUnset(newMap, [projectID]);
      return { publishSettingsMap: newMap };
    });
  },

  // Getters
  getPublishSettingsByProjectID: (projectID) => {
    return get().publishSettingsMap?.[projectID] ?? undefined;
  },
}));

// Service instance for legacy wrapper
const projectPublishService = new ProjectPublishService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IProjectPublishStore {
  // states
  generalLoader: boolean;
  fetchSettingsLoader: boolean;
  // observables
  publishSettingsMap: Record<string, TProjectPublishSettings>; // projectID => TProjectPublishSettings
  // helpers
  getPublishSettingsByProjectID: (projectID: string) => TProjectPublishSettings | undefined;
  // actions
  fetchPublishSettings: (workspaceSlug: string, projectID: string) => Promise<TProjectPublishSettings>;
  updatePublishSettings: (
    workspaceSlug: string,
    projectID: string,
    projectPublishId: string,
    data: Partial<TProjectPublishSettings>
  ) => Promise<TProjectPublishSettings>;
  publishProject: (
    workspaceSlug: string,
    projectID: string,
    data: Partial<TProjectPublishSettings>
  ) => Promise<TProjectPublishSettings>;
  unPublishProject: (workspaceSlug: string, projectID: string, projectPublishId: string) => Promise<void>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks directly in React components
 */
export class ProjectPublishStoreLegacy implements IProjectPublishStore {
  // Store reference for accessing project store
  private rootStore: {
    project: {
      projectMap: Record<string, any>;
    };
  };

  constructor(rootStore: { project: { projectMap: Record<string, any> } }) {
    this.rootStore = rootStore;
  }

  get generalLoader() {
    return useProjectPublishStore.getState().generalLoader;
  }

  get fetchSettingsLoader() {
    return useProjectPublishStore.getState().fetchSettingsLoader;
  }

  get publishSettingsMap() {
    return useProjectPublishStore.getState().publishSettingsMap;
  }

  /**
   * @description returns the publish settings of a particular project
   * @param {string} projectID
   * @returns {TProjectPublishSettings | undefined}
   */
  getPublishSettingsByProjectID = (projectID: string): TProjectPublishSettings | undefined => {
    return useProjectPublishStore.getState().getPublishSettingsByProjectID(projectID);
  };

  /**
   * Fetches project publish settings
   * @param workspaceSlug
   * @param projectID
   * @returns
   */
  fetchPublishSettings = async (workspaceSlug: string, projectID: string) => {
    const { setFetchSettingsLoader, setPublishSettings } = useProjectPublishStore.getState();
    try {
      setFetchSettingsLoader(true);
      const response = await projectPublishService.fetchPublishSettings(workspaceSlug, projectID);
      setPublishSettings(projectID, response);
      setFetchSettingsLoader(false);
      return response;
    } catch (error) {
      setFetchSettingsLoader(false);
      throw error;
    }
  };

  /**
   * Publishes project and updates project publish status in the store
   * @param workspaceSlug
   * @param projectID
   * @param data
   * @returns
   */
  publishProject = async (workspaceSlug: string, projectID: string, data: Partial<TProjectPublishSettings>) => {
    const { setGeneralLoader, setPublishSettings } = useProjectPublishStore.getState();
    try {
      setGeneralLoader(true);
      const response = await projectPublishService.publishProject(workspaceSlug, projectID, data);
      setPublishSettings(projectID, response);
      // Update project anchor in root store
      lodashSet(this.rootStore.project.projectMap, [projectID, "anchor"], response.anchor);
      setGeneralLoader(false);
      return response;
    } catch (error) {
      setGeneralLoader(false);
      throw error;
    }
  };

  /**
   * Updates project publish settings
   * @param workspaceSlug
   * @param projectID
   * @param projectPublishId
   * @param data
   * @returns
   */
  updatePublishSettings = async (
    workspaceSlug: string,
    projectID: string,
    projectPublishId: string,
    data: Partial<TProjectPublishSettings>
  ) => {
    const { setGeneralLoader, setPublishSettings } = useProjectPublishStore.getState();
    try {
      setGeneralLoader(true);
      const response = await projectPublishService.updatePublishSettings(
        workspaceSlug,
        projectID,
        projectPublishId,
        data
      );
      setPublishSettings(projectID, response);
      setGeneralLoader(false);
      return response;
    } catch (error) {
      setGeneralLoader(false);
      throw error;
    }
  };

  /**
   * Unpublishes project and updates project publish status in the store
   * @param workspaceSlug
   * @param projectID
   * @param projectPublishId
   * @returns
   */
  unPublishProject = async (workspaceSlug: string, projectID: string, projectPublishId: string) => {
    const { setGeneralLoader, removePublishSettings } = useProjectPublishStore.getState();
    try {
      setGeneralLoader(true);
      await projectPublishService.unpublishProject(workspaceSlug, projectID, projectPublishId);
      removePublishSettings(projectID);
      // Update project anchor in root store
      lodashSet(this.rootStore.project.projectMap, [projectID, "anchor"], null);
      setGeneralLoader(false);
    } catch (error) {
      setGeneralLoader(false);
      throw error;
    }
  };
}
