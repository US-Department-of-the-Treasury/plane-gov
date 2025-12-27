import { create } from "zustand";
import { sortBy } from "lodash-es";
import type { IEpic, TEpicPlotType } from "@plane/types";

/**
 * Epic state managed by Zustand.
 * Server data is fetched via TanStack Query, but we maintain a local cache
 * for synchronous access and imperative operations.
 */
interface EpicStoreState {
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  plotType: Record<string, TEpicPlotType>;
  epicMap: Record<string, IEpic>;
}

interface EpicStoreActions {
  // Sync actions
  setLoader: (loader: boolean) => void;
  setFetched: (projectId: string, fetched: boolean) => void;
  setPlotType: (epicId: string, plotType: TEpicPlotType) => void;
  syncEpic: (epic: IEpic) => void;
  syncEpics: (epics: IEpic[], projectId?: string) => void;
  removeEpic: (epicId: string) => void;
  updateEpicField: <K extends keyof IEpic>(epicId: string, field: K, value: IEpic[K]) => void;
  // Getters
  getEpicById: (epicId: string) => IEpic | null;
  getEpicNameById: (epicId: string) => string;
  getProjectEpicIds: (projectId: string | null) => string[] | null;
  getProjectArchivedEpicIds: (projectId: string | null) => string[] | null;
  getProjectEpicDetails: (projectId: string) => IEpic[] | null;
  getEpicsFetchStatusByProjectId: (projectId: string) => boolean;
}

export type EpicStore = EpicStoreState & EpicStoreActions;

const initialState: EpicStoreState = {
  loader: false,
  fetchedMap: {},
  plotType: {},
  epicMap: {},
};

export const useEpicStore = create<EpicStore>()((set, get) => ({
  ...initialState,

  setLoader: (loader) => {
    set({ loader });
  },

  setFetched: (projectId, fetched) => {
    set((state) => ({
      fetchedMap: { ...state.fetchedMap, [projectId]: fetched },
    }));
  },

  setPlotType: (epicId, plotType) => {
    set((state) => ({
      plotType: { ...state.plotType, [epicId]: plotType },
    }));
  },

  syncEpic: (epic) => {
    set((state) => ({
      epicMap: { ...state.epicMap, [epic.id]: { ...state.epicMap[epic.id], ...epic } },
    }));
  },

  syncEpics: (epics, projectId) => {
    set((state) => {
      const newEpicMap = { ...state.epicMap };
      const uniqueProjectIds = new Set<string>();
      epics.forEach((epic) => {
        newEpicMap[epic.id] = { ...newEpicMap[epic.id], ...epic };
        uniqueProjectIds.add(epic.project_id);
      });
      const newFetchedMap = { ...state.fetchedMap };
      if (projectId) {
        newFetchedMap[projectId] = true;
      } else {
        uniqueProjectIds.forEach((pid) => {
          newFetchedMap[pid] = true;
        });
      }
      return { epicMap: newEpicMap, fetchedMap: newFetchedMap };
    });
  },

  removeEpic: (epicId) => {
    set((state) => {
      const newEpicMap = { ...state.epicMap };
      delete newEpicMap[epicId];
      return { epicMap: newEpicMap };
    });
  },

  updateEpicField: (epicId, field, value) => {
    set((state) => {
      if (!state.epicMap[epicId]) return state;
      return {
        epicMap: {
          ...state.epicMap,
          [epicId]: { ...state.epicMap[epicId], [field]: value },
        },
      };
    });
  },

  getEpicById: (epicId) => {
    return get().epicMap?.[epicId] || null;
  },

  getEpicNameById: (epicId) => {
    return get().epicMap?.[epicId]?.name || "";
  },

  getProjectEpicIds: (projectId) => {
    if (!projectId) return null;
    const { epicMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return null;
    let projectEpics = Object.values(epicMap).filter((m) => m.project_id === projectId && !m?.archived_at);
    projectEpics = sortBy(projectEpics, [(m) => m.sort_order]);
    return projectEpics.map((m) => m.id) || null;
  },

  getProjectArchivedEpicIds: (projectId) => {
    if (!projectId) return null;
    const { epicMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return null;
    let archivedEpics = Object.values(epicMap).filter((m) => m.project_id === projectId && !!m?.archived_at);
    archivedEpics = sortBy(archivedEpics, [(m) => m.sort_order]);
    return archivedEpics.map((m) => m.id) || null;
  },

  getProjectEpicDetails: (projectId) => {
    const { epicMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return null;
    let projectEpics = Object.values(epicMap).filter((m) => m.project_id === projectId && !m.archived_at);
    projectEpics = sortBy(projectEpics, [(m) => m.sort_order]);
    return projectEpics;
  },

  getEpicsFetchStatusByProjectId: (projectId) => {
    return get().fetchedMap[projectId] ?? false;
  },
}));

/**
 * Helper function to get project epic details outside of React components.
 * Use this in utility functions where hooks cannot be used.
 */
export const getProjectEpicDetails = (projectId: string): IEpic[] | null => {
  const { epicMap, fetchedMap } = useEpicStore.getState();
  if (!fetchedMap[projectId]) return null;
  let projectEpics = Object.values(epicMap).filter((m) => m.project_id === projectId && !m.archived_at);
  projectEpics = sortBy(projectEpics, [(m) => m.sort_order]);
  return projectEpics;
};
