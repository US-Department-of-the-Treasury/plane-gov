import { unset, orderBy, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { IEstimate as IEstimateType, IEstimateFormData, TEstimateSystemKeys } from "@plane/types";
// plane web services
import estimateService from "@/plane-web/services/project/estimate.service";
// plane web store
import type { IEstimate } from "@/plane-web/store/estimates/estimate";
import { Estimate } from "@/plane-web/store/estimates/estimate";
// store
import type { CoreRootStore } from "../root.store";
import { getRouterWorkspaceSlug, getRouterProjectId } from "@/store/client/router.store";

type TEstimateLoader = "init-loader" | "mutation-loader" | undefined;
type TErrorCodes = {
  status: string;
  message?: string;
};

export interface IProjectEstimateStore {
  // observables
  loader: TEstimateLoader;
  estimates: Record<string, IEstimate>;
  error: TErrorCodes | undefined;
  // computed
  currentActiveEstimateId: string | undefined;
  currentActiveEstimate: IEstimate | undefined;
  archivedEstimateIds: string[] | undefined;
  currentProjectEstimateType: TEstimateSystemKeys | undefined;
  areEstimateEnabledByProjectId: (projectId: string) => boolean;
  estimateIdsByProjectId: (projectId: string) => string[] | undefined;
  currentActiveEstimateIdByProjectId: (projectId: string) => string | undefined;
  estimateById: (estimateId: string) => IEstimate | undefined;
  // actions
  getWorkspaceEstimates: (workspaceSlug: string, loader?: TEstimateLoader) => Promise<IEstimateType[] | undefined>;
  getProjectEstimates: (
    workspaceSlug: string,
    projectId: string,
    loader?: TEstimateLoader
  ) => Promise<IEstimateType[] | undefined>;
  getEstimateById: (estimateId: string) => IEstimate | undefined;
  createEstimate: (
    workspaceSlug: string,
    projectId: string,
    data: IEstimateFormData
  ) => Promise<IEstimateType | undefined>;
  deleteEstimate: (workspaceSlug: string, projectId: string, estimateId: string) => Promise<void>;
}

// Zustand Store
interface ProjectEstimateState {
  loader: TEstimateLoader;
  estimates: Record<string, IEstimate>;
  error: TErrorCodes | undefined;
}

interface ProjectEstimateActions {
  getWorkspaceEstimates: (workspaceSlug: string, loader?: TEstimateLoader, store?: CoreRootStore) => Promise<IEstimateType[] | undefined>;
  getProjectEstimates: (
    workspaceSlug: string,
    projectId: string,
    loader?: TEstimateLoader,
    store?: CoreRootStore
  ) => Promise<IEstimateType[] | undefined>;
  getEstimateById: (estimateId: string) => IEstimate | undefined;
  createEstimate: (
    workspaceSlug: string,
    projectId: string,
    data: IEstimateFormData,
    store: CoreRootStore
  ) => Promise<IEstimateType | undefined>;
  deleteEstimate: (workspaceSlug: string, projectId: string, estimateId: string) => Promise<void>;
}

type ProjectEstimateStoreType = ProjectEstimateState & ProjectEstimateActions;

export const useProjectEstimateStore = create<ProjectEstimateStoreType>()(
  immer((set, get) => ({
    // State
    loader: undefined,
    estimates: {},
    error: undefined,

    // Actions
    getWorkspaceEstimates: async (
      workspaceSlug: string,
      loader: TEstimateLoader = "mutation-loader",
      store?: CoreRootStore
    ): Promise<IEstimateType[] | undefined> => {
      try {
        set((draft) => {
          draft.error = undefined;
          if (Object.keys(draft.estimates || {}).length <= 0) {
            draft.loader = loader || "init-loader";
          }
        });

        const estimates = await estimateService.fetchWorkspaceEstimates(workspaceSlug);
        if (estimates && estimates.length > 0 && store) {
          set((draft) => {
            estimates.forEach((estimate) => {
              const estimateId = estimate.id;
              if (estimateId) {
                draft.estimates[estimateId] = new Estimate(store, {
                  ...estimate,
                  type: estimate.type?.toLowerCase() as TEstimateSystemKeys
                });
              }
            });
          });
        }

        return estimates;
      } catch (error) {
        set((draft) => {
          draft.loader = undefined;
          draft.error = {
            status: "error",
            message: "Error fetching estimates",
          };
        });
        throw error;
      }
    },

    getProjectEstimates: async (
      workspaceSlug: string,
      projectId: string,
      loader: TEstimateLoader = "mutation-loader",
      store?: CoreRootStore
    ): Promise<IEstimateType[] | undefined> => {
      try {
        const state = get();
        set((draft) => {
          draft.error = undefined;
          // Check if estimates for this project exist
          const hasProjectEstimates = Object.values(state.estimates || {}).some((e) => e.project === projectId);
          if (!hasProjectEstimates) {
            draft.loader = loader || "init-loader";
          }
        });

        const estimates = await estimateService.fetchProjectEstimates(workspaceSlug, projectId);
        if (estimates && estimates.length > 0 && store) {
          set((draft) => {
            estimates.forEach((estimate) => {
              const estimateId = estimate.id;
              if (estimateId) {
                draft.estimates[estimateId] = new Estimate(store, {
                  ...estimate,
                  type: estimate.type?.toLowerCase() as TEstimateSystemKeys
                });
              }
            });
          });
        }

        return estimates;
      } catch (error) {
        set((draft) => {
          draft.loader = undefined;
          draft.error = {
            status: "error",
            message: "Error fetching estimates",
          };
        });
        throw error;
      }
    },

    getEstimateById: (estimateId: string): IEstimate | undefined => {
      return get().estimates[estimateId];
    },

    createEstimate: async (
      workspaceSlug: string,
      projectId: string,
      payload: IEstimateFormData,
      store: CoreRootStore
    ): Promise<IEstimateType | undefined> => {
      try {
        set((draft) => {
          draft.error = undefined;
        });

        const estimate = await estimateService.createEstimate(workspaceSlug, projectId, payload);
        const estimateId = estimate?.id;
        if (estimate && estimateId) {
          set((draft) => {
            draft.estimates[estimateId] = new Estimate(store, {
              ...estimate,
              type: estimate.type?.toLowerCase() as TEstimateSystemKeys
            });
          });
        }

        return estimate;
      } catch (error) {
        set((draft) => {
          draft.error = {
            status: "error",
            message: "Error creating estimate",
          };
        });
        throw error;
      }
    },

    deleteEstimate: async (workspaceSlug: string, projectId: string, estimateId: string) => {
      try {
        await estimateService.deleteEstimate(workspaceSlug, projectId, estimateId);
        if (estimateId) {
          set((draft) => {
            delete draft.estimates[estimateId];
          });
        }
      } catch (error) {
        set((draft) => {
          draft.error = {
            status: "error",
            message: "Error deleting estimate",
          };
        });
        throw error;
      }
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class ProjectEstimateStore implements IProjectEstimateStore {
  constructor(private store: CoreRootStore) {}

  private get state() {
    return useProjectEstimateStore.getState();
  }

  get loader() {
    return this.state.loader;
  }

  get estimates() {
    return this.state.estimates;
  }

  get error() {
    return this.state.error;
  }

  // computed

  get currentProjectEstimateType(): TEstimateSystemKeys | undefined {
    return this.currentActiveEstimateId ? this.estimates[this.currentActiveEstimateId]?.type : undefined;
  }

  /**
   * @description get current active estimate id for a project
   * @returns { string | undefined }
   */
  get currentActiveEstimateId(): string | undefined {
    const projectId = getRouterProjectId();
    if (!projectId) return undefined;
    const currentActiveEstimateId = Object.values(this.estimates || {}).find(
      (p) => p.project === projectId && p.last_used
    );
    return currentActiveEstimateId?.id ?? undefined;
  }

  // computed
  /**
   * @description get current active estimate for a project
   * @returns { string | undefined }
   */
  get currentActiveEstimate(): IEstimate | undefined {
    const projectId = getRouterProjectId();
    if (!projectId) return undefined;
    const currentActiveEstimate = Object.values(this.estimates || {}).find(
      (p) => p.project === projectId && p.last_used
    );
    return currentActiveEstimate ?? undefined;
  }

  /**
   * @description get all archived estimate ids for a project
   * @returns { string[] | undefined }
   */
  get archivedEstimateIds(): string[] | undefined {
    const projectId = getRouterProjectId();
    if (!projectId) return undefined;
    const archivedEstimates = orderBy(
      Object.values(this.estimates || {}).filter((p) => p.project === projectId && !p.last_used),
      ["created_at"],
      "desc"
    );
    const archivedEstimateIds = archivedEstimates.map((p) => p.id) as string[];
    return archivedEstimateIds ?? undefined;
  }

  /**
   * @description get estimates are enabled in the project or not
   * @returns { boolean }
   */
  areEstimateEnabledByProjectId = (projectId: string) => {
    if (!projectId) return false;
    const projectDetails = this.store.projectRoot.project.getProjectById(projectId);
    if (!projectDetails) return false;
    return Boolean(projectDetails.estimate) || false;
  };

  /**
   * @description get all estimate ids for a project
   * @returns { string[] | undefined }
   */
  estimateIdsByProjectId = (projectId: string) => {
    if (!projectId) return undefined;
    const projectEstimatesIds = Object.values(this.estimates || {})
      .filter((p) => p.project === projectId)
      .map((p) => p.id) as string[];
    return projectEstimatesIds ?? undefined;
  };

  /**
   * @description get current active estimate id for a project
   * @returns { string | undefined }
   */
  currentActiveEstimateIdByProjectId = (projectId: string): string | undefined => {
    if (!projectId) return undefined;
    const currentActiveEstimateId = Object.values(this.estimates || {}).find(
      (p) => p.project === projectId && p.last_used
    );
    return currentActiveEstimateId?.id ?? undefined;
  };

  /**
   * @description get estimate by id
   * @returns { IEstimate | undefined }
   */
  estimateById = (estimateId: string) => {
    if (!estimateId) return undefined;
    return this.estimates[estimateId] ?? undefined;
  };

  // actions
  /**
   * @description fetch all estimates for a workspace
   * @param { string } workspaceSlug
   * @returns { IEstimateType[] | undefined }
   */
  getWorkspaceEstimates = (
    workspaceSlug: string,
    loader: TEstimateLoader = "mutation-loader"
  ): Promise<IEstimateType[] | undefined> =>
    this.state.getWorkspaceEstimates(workspaceSlug, loader, this.store);

  /**
   * @description fetch all estimates for a project
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { IEstimateType[] | undefined }
   */
  getProjectEstimates = (
    workspaceSlug: string,
    projectId: string,
    loader: TEstimateLoader = "mutation-loader"
  ): Promise<IEstimateType[] | undefined> =>
    this.state.getProjectEstimates(workspaceSlug, projectId, loader, this.store);

  /**
   * @param { string } estimateId
   * @returns IEstimateType | undefined
   */
  getEstimateById = (estimateId: string): IEstimate | undefined => this.state.getEstimateById(estimateId);

  /**
   * @description create an estimate for a project
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @param { Partial<IEstimateFormData> } payload
   * @returns
   */
  createEstimate = (
    workspaceSlug: string,
    projectId: string,
    payload: IEstimateFormData
  ): Promise<IEstimateType | undefined> =>
    this.state.createEstimate(workspaceSlug, projectId, payload, this.store);

  /**
   * @description delete the estimate for a project
   * @param workspaceSlug
   * @param projectId
   * @param estimateId
   */
  deleteEstimate = (workspaceSlug: string, projectId: string, estimateId: string) =>
    this.state.deleteEstimate(workspaceSlug, projectId, estimateId);
}
