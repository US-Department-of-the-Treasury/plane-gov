import { create } from "zustand";
import { isPast, isToday } from "date-fns";
import { sortBy } from "lodash-es";
import type { ISprint, TSprintPlotType, TSprintEstimateType } from "@plane/types";
import type { DistributionUpdates } from "@plane/utils";
import { orderSprints, shouldFilterSprint, getDate, updateDistribution } from "@plane/utils";
import { FavoriteService } from "@/services/favorite";
import { SprintService } from "@/services/sprint.service";
import { getRouterWorkspaceSlug } from "./router.store";
import { useSprintFilterStore } from "./sprint-filter.store";

/**
 * Sprint state managed by Zustand.
 */
interface SprintStoreState {
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  sprintMap: Record<string, ISprint>;
  plotType: Record<string, TSprintPlotType>;
  estimatedType: Record<string, TSprintEstimateType>;
}

interface SprintStoreActions {
  // Sync actions
  setLoader: (loader: boolean) => void;
  setFetched: (workspaceSlug: string, fetched: boolean) => void;
  syncSprint: (sprint: ISprint) => void;
  syncSprints: (sprints: ISprint[], workspaceSlug: string) => void;
  setPlotType: (sprintId: string, plotType: TSprintPlotType) => void;
  setEstimateType: (sprintId: string, estimateType: TSprintEstimateType) => void;
  updateSprintField: <K extends keyof ISprint>(sprintId: string, field: K, value: ISprint[K]) => void;
  // Getters
  getSprintById: (sprintId: string) => ISprint | null;
  getSprintNameById: (sprintId: string) => string | undefined;
  getSprintByNumber: (workspaceId: string, number: number) => ISprint | null;
  getWorkspaceSprintIds: (workspaceId: string) => string[] | null;
  getPlotTypeBySprintId: (sprintId: string) => TSprintPlotType;
  getEstimateTypeBySprintId: (sprintId: string) => TSprintEstimateType;
}

export type SprintStore = SprintStoreState & SprintStoreActions;

const initialState: SprintStoreState = {
  loader: false,
  fetchedMap: {},
  sprintMap: {},
  plotType: {},
  estimatedType: {},
};

export const useSprintStore = create<SprintStore>()((set, get) => ({
  ...initialState,

  setLoader: (loader) => set({ loader }),

  setFetched: (workspaceSlug, fetched) => {
    set((state) => ({ fetchedMap: { ...state.fetchedMap, [workspaceSlug]: fetched } }));
  },

  syncSprint: (sprint) => {
    set((state) => ({
      sprintMap: { ...state.sprintMap, [sprint.id]: { ...state.sprintMap[sprint.id], ...sprint } },
    }));
  },

  syncSprints: (sprints, workspaceSlug) => {
    set((state) => {
      const newSprintMap = { ...state.sprintMap };
      sprints.forEach((sprint) => {
        newSprintMap[sprint.id] = { ...newSprintMap[sprint.id], ...sprint };
      });
      return {
        sprintMap: newSprintMap,
        fetchedMap: { ...state.fetchedMap, [workspaceSlug]: true },
      };
    });
  },

  setPlotType: (sprintId, plotType) => {
    set((state) => ({ plotType: { ...state.plotType, [sprintId]: plotType } }));
  },

  setEstimateType: (sprintId, estimateType) => {
    set((state) => ({ estimatedType: { ...state.estimatedType, [sprintId]: estimateType } }));
  },

  updateSprintField: (sprintId, field, value) => {
    set((state) => {
      if (!state.sprintMap[sprintId]) return state;
      return {
        sprintMap: {
          ...state.sprintMap,
          [sprintId]: { ...state.sprintMap[sprintId], [field]: value },
        },
      };
    });
  },

  getSprintById: (sprintId) => get().sprintMap?.[sprintId] ?? null,

  getSprintNameById: (sprintId) => get().sprintMap?.[sprintId]?.name,

  getSprintByNumber: (workspaceId, number) => {
    const sprint = Object.values(get().sprintMap ?? {}).find(
      (s) => s.workspace_id === workspaceId && s.number === number
    );
    return sprint ?? null;
  },

  getWorkspaceSprintIds: (workspaceId) => {
    let sprints = Object.values(get().sprintMap ?? {}).filter((c) => c.workspace_id === workspaceId && !c?.archived_at);
    sprints = sortBy(sprints, [(c) => c.number]);
    return sprints.map((c) => c.id);
  },

  getPlotTypeBySprintId: (sprintId) => get().plotType[sprintId] || "burndown",

  getEstimateTypeBySprintId: (sprintId) => get().estimatedType[sprintId] || "issues",
}));

// Service instances
const sprintService = new SprintService();
const favoriteService = new FavoriteService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface ISprintStore {
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  sprintMap: Record<string, ISprint>;
  plotType: Record<string, TSprintPlotType>;
  estimatedType: Record<string, TSprintEstimateType>;
  currentWorkspaceSprintIds: string[] | null;
  currentWorkspaceCompletedSprintIds: string[] | null;
  currentWorkspaceActiveSprintId: string | null;
  currentWorkspaceActiveSprint: ISprint | null;
  getSprintById: (sprintId: string) => ISprint | null;
  getSprintNameById: (sprintId: string) => string | undefined;
  getSprintByNumber: (workspaceId: string, number: number) => ISprint | null;
  getWorkspaceSprintIds: (workspaceId: string) => string[] | null;
  getFilteredSprintIds: (workspaceId: string, sortByManual: boolean) => string[] | null;
  getProjectSprintDetails: (projectId: string) => ISprint[] | undefined;
  getPlotTypeBySprintId: (sprintId: string) => TSprintPlotType;
  getEstimateTypeBySprintId: (sprintId: string) => TSprintEstimateType;
  updateSprintDistribution: (distributionUpdates: DistributionUpdates, sprintId: string) => void;
  setPlotType: (sprintId: string, plotType: TSprintPlotType) => void;
  setEstimateType: (sprintId: string, estimateType: TSprintEstimateType) => void;
  fetchWorkspaceSprints: (workspaceSlug: string) => Promise<ISprint[]>;
  fetchSprintDetails: (workspaceSlug: string, sprintId: string) => Promise<ISprint>;
  updateSprintDetails: (workspaceSlug: string, sprintId: string, data: Partial<ISprint>) => Promise<ISprint>;
  addSprintToFavorites: (workspaceSlug: string, sprintId: string) => Promise<any>;
  removeSprintFromFavorites: (workspaceSlug: string, sprintId: string) => Promise<void>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * @deprecated Use useSprintStore hook directly in React components
 */
export class SprintStoreLegacy implements ISprintStore {
  constructor(_rootStore?: unknown) {
    // rootStore no longer needed - using direct Zustand store access
  }

  get loader() {
    return useSprintStore.getState().loader;
  }

  get fetchedMap() {
    return useSprintStore.getState().fetchedMap;
  }

  get sprintMap() {
    return useSprintStore.getState().sprintMap;
  }

  get plotType() {
    return useSprintStore.getState().plotType;
  }

  get estimatedType() {
    return useSprintStore.getState().estimatedType;
  }

  get currentWorkspaceSprintIds(): string[] | null {
    const workspaceSlug = getRouterWorkspaceSlug();
    const { sprintMap, fetchedMap } = useSprintStore.getState();
    if (!workspaceSlug || !fetchedMap[workspaceSlug]) return null;

    let allSprints = Object.values(sprintMap ?? {}).filter((c) => c?.workspace_id && !c?.archived_at);
    allSprints = sortBy(allSprints, [(c) => c.number]);
    return allSprints.map((c) => c.id);
  }

  get currentWorkspaceCompletedSprintIds(): string[] | null {
    const workspaceSlug = getRouterWorkspaceSlug();
    const { sprintMap, fetchedMap } = useSprintStore.getState();
    if (!workspaceSlug || !fetchedMap[workspaceSlug]) return null;

    let completedSprints = Object.values(sprintMap ?? {}).filter((c) => {
      const endDate = getDate(c.end_date);
      const hasEndDatePassed = endDate && isPast(endDate);
      const isEndDateToday = endDate && isToday(endDate);
      return (hasEndDatePassed && !isEndDateToday) || c.status?.toLowerCase() === "completed";
    });
    completedSprints = sortBy(completedSprints, [(c) => c.number]);
    return completedSprints.map((c) => c.id);
  }

  get currentWorkspaceActiveSprintId(): string | null {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    const { sprintMap } = useSprintStore.getState();
    const activeSprint = Object.values(sprintMap ?? {}).find((sprint) => sprint?.status?.toLowerCase() === "current");
    return activeSprint?.id || null;
  }

  get currentWorkspaceActiveSprint(): ISprint | null {
    const activeId = this.currentWorkspaceActiveSprintId;
    if (!activeId) return null;
    return useSprintStore.getState().sprintMap?.[activeId] ?? null;
  }

  getSprintById = (sprintId: string) => useSprintStore.getState().getSprintById(sprintId);

  getSprintNameById = (sprintId: string) => useSprintStore.getState().getSprintNameById(sprintId);

  getSprintByNumber = (workspaceId: string, number: number) =>
    useSprintStore.getState().getSprintByNumber(workspaceId, number);

  getWorkspaceSprintIds = (workspaceId: string) => useSprintStore.getState().getWorkspaceSprintIds(workspaceId);

  getFilteredSprintIds = (workspaceId: string, sortByManual: boolean): string[] | null => {
    const { sprintMap } = useSprintStore.getState();
    const sprintFilterState = useSprintFilterStore.getState();
    const filters = sprintFilterState.getFiltersByProjectId(workspaceId);
    const searchQuery = sprintFilterState.searchQuery;

    let sprints = Object.values(sprintMap ?? {}).filter(
      (c) =>
        c.workspace_id === workspaceId &&
        !c.archived_at &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterSprint(c, filters ?? {})
    );
    sprints = orderSprints(sprints, sortByManual);
    return sprints.map((c) => c.id);
  };

  getProjectSprintDetails = (projectId: string): ISprint[] | undefined => {
    const workspaceSlug = getRouterWorkspaceSlug();
    const { sprintMap, fetchedMap } = useSprintStore.getState();
    if (!workspaceSlug || !fetchedMap[workspaceSlug]) return undefined;

    let sprints = Object.values(sprintMap ?? {}).filter((c) => c?.workspace_id && !c?.archived_at);
    sprints = sortBy(sprints, [(c) => c.number]);
    return sprints;
  };

  getPlotTypeBySprintId = (sprintId: string) => useSprintStore.getState().getPlotTypeBySprintId(sprintId);

  getEstimateTypeBySprintId = (sprintId: string) => useSprintStore.getState().getEstimateTypeBySprintId(sprintId);

  updateSprintDistribution = (distributionUpdates: DistributionUpdates, sprintId: string) => {
    const { sprintMap, syncSprint } = useSprintStore.getState();
    const sprint = sprintMap[sprintId];
    if (!sprint) return;
    const updatedSprint = { ...sprint };
    updateDistribution(updatedSprint, distributionUpdates);
    syncSprint(updatedSprint);
  };

  setPlotType = (sprintId: string, plotType: TSprintPlotType) => {
    useSprintStore.getState().setPlotType(sprintId, plotType);
  };

  setEstimateType = (sprintId: string, estimateType: TSprintEstimateType) => {
    useSprintStore.getState().setEstimateType(sprintId, estimateType);
  };

  fetchWorkspaceSprints = async (workspaceSlug: string): Promise<ISprint[]> => {
    const { setLoader, syncSprints } = useSprintStore.getState();
    try {
      setLoader(true);
      const response = await sprintService.getWorkspaceSprints(workspaceSlug);
      syncSprints(response, workspaceSlug);
      setLoader(false);
      return response;
    } catch (error) {
      setLoader(false);
      throw error;
    }
  };

  fetchSprintDetails = async (workspaceSlug: string, sprintId: string): Promise<ISprint> => {
    const response = await sprintService.getSprintDetails(workspaceSlug, sprintId);
    useSprintStore.getState().syncSprint(response);
    return response;
  };

  updateSprintDetails = async (workspaceSlug: string, sprintId: string, data: Partial<ISprint>): Promise<ISprint> => {
    const { syncSprint, sprintMap } = useSprintStore.getState();
    const originalSprint = sprintMap[sprintId];

    try {
      if (originalSprint) {
        syncSprint({ ...originalSprint, ...data } as ISprint);
      }
      const response = await sprintService.patchSprint(workspaceSlug, sprintId, data);
      await this.fetchSprintDetails(workspaceSlug, sprintId);
      return response;
    } catch (error) {
      await this.fetchWorkspaceSprints(workspaceSlug);
      throw error;
    }
  };

  addSprintToFavorites = async (workspaceSlug: string, sprintId: string): Promise<any> => {
    const { getSprintById, updateSprintField } = useSprintStore.getState();
    const currentSprint = getSprintById(sprintId);
    try {
      if (currentSprint) updateSprintField(sprintId, "is_favorite", true);
      const response = await favoriteService.addFavorite(workspaceSlug.toString(), {
        entity_type: "sprint",
        entity_identifier: sprintId,
        entity_data: { name: currentSprint?.name || "" },
      });
      return response;
    } catch (error) {
      if (currentSprint) updateSprintField(sprintId, "is_favorite", false);
      throw error;
    }
  };

  removeSprintFromFavorites = async (workspaceSlug: string, sprintId: string): Promise<void> => {
    const { getSprintById, updateSprintField } = useSprintStore.getState();
    const currentSprint = getSprintById(sprintId);
    try {
      if (currentSprint) updateSprintField(sprintId, "is_favorite", false);
      await favoriteService.removeFavoriteEntity(workspaceSlug, sprintId);
    } catch (error) {
      if (currentSprint) updateSprintField(sprintId, "is_favorite", true);
      throw error;
    }
  };
}
