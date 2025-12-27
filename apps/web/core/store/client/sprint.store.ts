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
 * Fetch sprint details and sync to the store
 */
export const fetchSprintDetails = async (workspaceSlug: string, sprintId: string) => {
  const response = await sprintService.getSprintDetails(workspaceSlug, sprintId);
  useSprintStore.getState().syncSprint(response);
  return response;
};

/**
 * Update sprint distribution (for issue stats)
 */
export const updateSprintDistribution = (distributionUpdates: DistributionUpdates, sprintId: string) => {
  const { sprintMap, syncSprint } = useSprintStore.getState();
  const sprint = sprintMap[sprintId];
  if (!sprint) return;
  const updatedSprint = { ...sprint };
  updateDistribution(updatedSprint, distributionUpdates);
  syncSprint(updatedSprint);
};

/**
 * Get project sprint details (all non-archived sprints sorted by number)
 */
export const getProjectSprintDetails = (projectId: string): ISprint[] | undefined => {
  const workspaceSlug = getRouterWorkspaceSlug();
  const { sprintMap, fetchedMap } = useSprintStore.getState();
  if (!workspaceSlug || !fetchedMap[workspaceSlug]) return undefined;

  let sprints = Object.values(sprintMap ?? {}).filter((c) => c?.workspace_id && !c?.archived_at);
  sprints = sortBy(sprints, [(c) => c.number]);
  return sprints;
};
