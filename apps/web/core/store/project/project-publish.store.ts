import { unset as lodashUnset, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { TProjectPublishSettings } from "@plane/types";
// services
import { ProjectPublishService } from "@/services/project";
// store
import type { ProjectRootStore } from "@/store/project";

// Zustand Store
interface ProjectPublishState {
  generalLoader: boolean;
  fetchSettingsLoader: boolean;
  publishSettingsMap: Record<string, TProjectPublishSettings>; // projectID => TProjectPublishSettings
}

interface ProjectPublishActions {
  getPublishSettingsByProjectID: (projectID: string) => TProjectPublishSettings | undefined;
  fetchPublishSettings: (
    workspaceSlug: string,
    projectID: string,
    projectPublishService: ProjectPublishService
  ) => Promise<TProjectPublishSettings>;
  updatePublishSettings: (
    workspaceSlug: string,
    projectID: string,
    projectPublishId: string,
    data: Partial<TProjectPublishSettings>,
    projectPublishService: ProjectPublishService
  ) => Promise<TProjectPublishSettings>;
  publishProject: (
    workspaceSlug: string,
    projectID: string,
    data: Partial<TProjectPublishSettings>,
    projectPublishService: ProjectPublishService,
    projectRootStore: ProjectRootStore
  ) => Promise<TProjectPublishSettings>;
  unPublishProject: (
    workspaceSlug: string,
    projectID: string,
    projectPublishId: string,
    projectPublishService: ProjectPublishService,
    projectRootStore: ProjectRootStore
  ) => Promise<void>;
}

type ProjectPublishStoreType = ProjectPublishState & ProjectPublishActions;

export const useProjectPublishStore = create<ProjectPublishStoreType>()(
  immer((set, get) => ({
    // State
    generalLoader: false,
    fetchSettingsLoader: false,
    publishSettingsMap: {},

    // Actions
    /**
     * @description returns the publish settings of a particular project
     * @param {string} projectID
     * @returns {TProjectPublishSettings | undefined}
     */
    getPublishSettingsByProjectID: (projectID: string) => {
      return get().publishSettingsMap?.[projectID] ?? undefined;
    },

    /**
     * Fetches project publish settings
     * @param workspaceSlug
     * @param projectID
     * @returns
     */
    fetchPublishSettings: async (workspaceSlug: string, projectID: string, projectPublishService: ProjectPublishService) => {
      try {
        set((state) => {
          state.fetchSettingsLoader = true;
        });
        const response = await projectPublishService.fetchPublishSettings(workspaceSlug, projectID);

        set((state) => {
          lodashSet(state.publishSettingsMap, [projectID], response);
          state.fetchSettingsLoader = false;
        });
        return response;
      } catch (error) {
        set((state) => {
          state.fetchSettingsLoader = false;
        });
        throw error;
      }
    },

    /**
     * Publishes project and updates project publish status in the store
     * @param workspaceSlug
     * @param projectID
     * @param data
     * @returns
     */
    publishProject: async (
      workspaceSlug: string,
      projectID: string,
      data: Partial<TProjectPublishSettings>,
      projectPublishService: ProjectPublishService,
      projectRootStore: ProjectRootStore
    ) => {
      try {
        set((state) => {
          state.generalLoader = true;
        });
        const response = await projectPublishService.publishProject(workspaceSlug, projectID, data);
        set((state) => {
          lodashSet(state.publishSettingsMap, [projectID], response);
          state.generalLoader = false;
        });
        // Update project map in project root store
        lodashSet(projectRootStore.project.projectMap, [projectID, "anchor"], response.anchor);
        return response;
      } catch (error) {
        set((state) => {
          state.generalLoader = false;
        });
        throw error;
      }
    },

    /**
     * Updates project publish settings
     * @param workspaceSlug
     * @param projectID
     * @param projectPublishId
     * @param data
     * @returns
     */
    updatePublishSettings: async (
      workspaceSlug: string,
      projectID: string,
      projectPublishId: string,
      data: Partial<TProjectPublishSettings>,
      projectPublishService: ProjectPublishService
    ) => {
      try {
        set((state) => {
          state.generalLoader = true;
        });
        const response = await projectPublishService.updatePublishSettings(
          workspaceSlug,
          projectID,
          projectPublishId,
          data
        );
        set((state) => {
          lodashSet(state.publishSettingsMap, [projectID], response);
          state.generalLoader = false;
        });
        return response;
      } catch (error) {
        set((state) => {
          state.generalLoader = false;
        });
        throw error;
      }
    },

    /**
     * Unpublishes project and updates project publish status in the store
     * @param workspaceSlug
     * @param projectID
     * @param projectPublishId
     * @returns
     */
    unPublishProject: async (
      workspaceSlug: string,
      projectID: string,
      projectPublishId: string,
      projectPublishService: ProjectPublishService,
      projectRootStore: ProjectRootStore
    ) => {
      try {
        set((state) => {
          state.generalLoader = true;
        });
        const response = await projectPublishService.unpublishProject(workspaceSlug, projectID, projectPublishId);
        set((state) => {
          lodashUnset(state.publishSettingsMap, [projectID]);
          state.generalLoader = false;
        });
        // Update project map in project root store
        lodashSet(projectRootStore.project.projectMap, [projectID, "anchor"], null);
        return response;
      } catch (error) {
        set((state) => {
          state.generalLoader = false;
        });
        throw error;
      }
    },
  }))
);

// Legacy interface
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

// Legacy class wrapper for backward compatibility
export class ProjectPublishStore implements IProjectPublishStore {
  // root store
  projectRootStore: ProjectRootStore;
  // services
  projectPublishService;

  constructor(_projectRootStore: ProjectRootStore) {
    this.projectRootStore = _projectRootStore;
    this.projectPublishService = new ProjectPublishService();
  }

  private get store() {
    return useProjectPublishStore.getState();
  }

  get generalLoader() {
    return this.store.generalLoader;
  }

  get fetchSettingsLoader() {
    return this.store.fetchSettingsLoader;
  }

  get publishSettingsMap() {
    return this.store.publishSettingsMap;
  }

  /**
   * @description returns the publish settings of a particular project
   * @param {string} projectID
   * @returns {TProjectPublishSettings | undefined}
   */
  getPublishSettingsByProjectID = (projectID: string): TProjectPublishSettings | undefined => {
    return this.store.getPublishSettingsByProjectID(projectID);
  };

  /**
   * Fetches project publish settings
   * @param workspaceSlug
   * @param projectID
   * @returns
   */
  fetchPublishSettings = async (workspaceSlug: string, projectID: string) => {
    return this.store.fetchPublishSettings(workspaceSlug, projectID, this.projectPublishService);
  };

  /**
   * Publishes project and updates project publish status in the store
   * @param workspaceSlug
   * @param projectID
   * @param data
   * @returns
   */
  publishProject = async (workspaceSlug: string, projectID: string, data: Partial<TProjectPublishSettings>) => {
    return this.store.publishProject(workspaceSlug, projectID, data, this.projectPublishService, this.projectRootStore);
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
    return this.store.updatePublishSettings(workspaceSlug, projectID, projectPublishId, data, this.projectPublishService);
  };

  /**
   * Unpublishes project and updates project publish status in the store
   * @param workspaceSlug
   * @param projectID
   * @param projectPublishId
   * @returns
   */
  unPublishProject = async (workspaceSlug: string, projectID: string, projectPublishId: string) => {
    return this.store.unPublishProject(workspaceSlug, projectID, projectPublishId, this.projectPublishService, this.projectRootStore);
  };
}
