import { create } from "zustand";
import { groupBy } from "lodash-es";
import { STATE_GROUPS } from "@plane/constants";
import type { IIntakeState, IState } from "@plane/types";
import { sortStates } from "@plane/utils";
import { ProjectStateService } from "@/services/project/project-state.service";
import { getRouterProjectId, getRouterWorkspaceSlug } from "./router.store";

/**
 * State store managed by Zustand.
 * Server data is fetched via TanStack Query, but we maintain a local cache
 * for synchronous access by issue stores that need stateMap for filtering.
 */
interface StateStoreState {
  // Data cache - synchronized from TanStack Query
  stateMap: Record<string, IState>;
  intakeStateMap: Record<string, IIntakeState>;
  fetchedMap: Record<string, boolean>;
  fetchedIntakeMap: Record<string, boolean>;
}

interface StateStoreActions {
  // Sync actions - called when TanStack Query data changes
  syncStates: (states: IState[], key: string) => void;
  syncState: (state: IState) => void;
  syncIntakeState: (intakeState: IIntakeState, projectId: string) => void;
  removeState: (stateId: string) => void;
  // Getters
  getStateById: (stateId: string | null | undefined) => IState | undefined;
  getIntakeStateById: (intakeStateId: string | null | undefined) => IIntakeState | undefined;
  getProjectStates: (projectId: string | null | undefined) => IState[] | undefined;
  getProjectIntakeState: (projectId: string | null | undefined) => IIntakeState | undefined;
  getProjectStateIds: (projectId: string | null | undefined) => string[] | undefined;
  getProjectIntakeStateIds: (projectId: string | null | undefined) => string[] | undefined;
  getProjectDefaultStateId: (projectId: string | null | undefined) => string | undefined;
  getGroupedProjectStates: (projectId: string | null | undefined) => Record<string, IState[]> | undefined;
  getStatePercentageInGroup: (stateId: string | null | undefined, projectId: string | null | undefined) => number | undefined;
}

export type StateStore = StateStoreState & StateStoreActions;

const initialState: StateStoreState = {
  stateMap: {},
  intakeStateMap: {},
  fetchedMap: {},
  fetchedIntakeMap: {},
};

export const useStateStore = create<StateStore>()((set, get) => ({
  ...initialState,

  // Sync states from TanStack Query to local cache
  syncStates: (states, key) => {
    set((state) => {
      const newStateMap = { ...state.stateMap };
      states.forEach((s) => {
        newStateMap[s.id] = s;
      });
      return {
        stateMap: newStateMap,
        fetchedMap: { ...state.fetchedMap, [key]: true },
      };
    });
  },

  syncState: (state) => {
    set((current) => ({
      stateMap: { ...current.stateMap, [state.id]: state },
    }));
  },

  syncIntakeState: (intakeState, projectId) => {
    set((state) => ({
      intakeStateMap: { ...state.intakeStateMap, [intakeState.id]: intakeState },
      fetchedIntakeMap: { ...state.fetchedIntakeMap, [projectId]: true },
    }));
  },

  removeState: (stateId) => {
    set((state) => {
      const newStateMap = { ...state.stateMap };
      delete newStateMap[stateId];
      return { stateMap: newStateMap };
    });
  },

  getStateById: (stateId) => {
    if (!stateId) return undefined;
    return get().stateMap[stateId];
  },

  getIntakeStateById: (intakeStateId) => {
    if (!intakeStateId) return undefined;
    return get().intakeStateMap[intakeStateId];
  },

  getProjectStates: (projectId) => {
    if (!projectId) return undefined;
    const { stateMap, fetchedMap } = get();
    // Check if we have fetched this project's states
    const hasFetched = Object.keys(fetchedMap).some((key) => fetchedMap[key] && (key === projectId || fetchedMap[key]));
    if (!hasFetched) return undefined;
    return sortStates(Object.values(stateMap).filter((state) => state.project_id === projectId));
  },

  getProjectIntakeState: (projectId) => {
    if (!projectId) return undefined;
    const { intakeStateMap, fetchedIntakeMap } = get();
    if (!fetchedIntakeMap[projectId]) return undefined;
    return Object.values(intakeStateMap).find((state) => state.project_id === projectId);
  },

  getProjectStateIds: (projectId) => {
    const states = get().getProjectStates(projectId);
    return states?.map((state) => state.id);
  },

  getProjectIntakeStateIds: (projectId) => {
    const intakeState = get().getProjectIntakeState(projectId);
    return intakeState?.id ? [intakeState.id] : undefined;
  },

  getProjectDefaultStateId: (projectId) => {
    const states = get().getProjectStates(projectId);
    return states?.find((state) => state.default)?.id;
  },

  getGroupedProjectStates: (projectId) => {
    const states = get().getProjectStates(projectId);
    if (!states) return undefined;

    const groupedStates = groupBy(states, "group") as Record<string, IState[]>;

    // Ensure all STATE_GROUPS are present
    return Object.keys(STATE_GROUPS).reduce(
      (acc, group) => ({
        ...acc,
        [group]: groupedStates[group] || [],
      }),
      {} as Record<string, IState[]>
    );
  },

  getStatePercentageInGroup: (stateId, projectId) => {
    if (!stateId || !projectId) return undefined;
    const { stateMap } = get();
    const state = stateMap[stateId];
    if (!state) return undefined;

    const groupedStates = get().getGroupedProjectStates(projectId);
    if (!groupedStates || !groupedStates[state.group]) return undefined;

    const statesInGroup = groupedStates[state.group];
    const stateIndex = statesInGroup.findIndex((s) => s.id === stateId);

    if (stateIndex === -1) return undefined;
    return ((stateIndex + 1) / statesInGroup.length) * 100;
  },
}));

// Service instance for legacy wrapper
const stateService = new ProjectStateService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IStateStore {
  fetchedMap: Record<string, boolean>;
  fetchedIntakeMap: Record<string, boolean>;
  stateMap: Record<string, IState>;
  intakeStateMap: Record<string, IIntakeState>;
  workspaceStates: IState[] | undefined;
  projectStates: IState[] | undefined;
  groupedProjectStates: Record<string, IState[]> | undefined;
  getStateById: (stateId: string | null | undefined) => IState | undefined;
  getIntakeStateById: (intakeStateId: string | null | undefined) => IIntakeState | undefined;
  getProjectStates: (projectId: string | null | undefined) => IState[] | undefined;
  getProjectIntakeState: (projectId: string | null | undefined) => IIntakeState | undefined;
  getProjectStateIds: (projectId: string | null | undefined) => string[] | undefined;
  getProjectIntakeStateIds: (projectId: string | null | undefined) => string[] | undefined;
  getProjectDefaultStateId: (projectId: string | null | undefined) => string | undefined;
  fetchProjectStates: (workspaceSlug: string, projectId: string) => Promise<IState[]>;
  fetchProjectIntakeState: (workspaceSlug: string, projectId: string) => Promise<IIntakeState>;
  fetchWorkspaceStates: (workspaceSlug: string) => Promise<IState[]>;
  createState: (workspaceSlug: string, projectId: string, data: Partial<IState>) => Promise<IState>;
  updateState: (workspaceSlug: string, projectId: string, stateId: string, data: Partial<IState>) => Promise<IState | undefined>;
  deleteState: (workspaceSlug: string, projectId: string, stateId: string) => Promise<void>;
  markStateAsDefault: (workspaceSlug: string, projectId: string, stateId: string) => Promise<void>;
  moveStatePosition: (workspaceSlug: string, projectId: string, stateId: string, payload: Partial<IState>) => Promise<void>;
  getStatePercentageInGroup: (stateId: string | null | undefined) => number | undefined;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks (useProjectStates, useCreateState, etc.) directly in React components
 */
export class StateStoreLegacy implements IStateStore {
  constructor(_rootStore?: unknown) {
    // Router access now uses direct functions instead of rootStore
  }

  get fetchedMap() {
    return useStateStore.getState().fetchedMap;
  }

  get fetchedIntakeMap() {
    return useStateStore.getState().fetchedIntakeMap;
  }

  get stateMap() {
    return useStateStore.getState().stateMap;
  }

  get intakeStateMap() {
    return useStateStore.getState().intakeStateMap;
  }

  get workspaceStates() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return undefined;
    const { stateMap, fetchedMap } = useStateStore.getState();
    if (!fetchedMap[workspaceSlug]) return undefined;
    return sortStates(Object.values(stateMap));
  }

  get projectStates() {
    const projectId = getRouterProjectId();
    return useStateStore.getState().getProjectStates(projectId);
  }

  get groupedProjectStates() {
    const projectId = getRouterProjectId();
    return useStateStore.getState().getGroupedProjectStates(projectId);
  }

  getStateById = (stateId: string | null | undefined) => {
    return useStateStore.getState().getStateById(stateId);
  };

  getIntakeStateById = (intakeStateId: string | null | undefined) => {
    return useStateStore.getState().getIntakeStateById(intakeStateId);
  };

  getProjectStates = (projectId: string | null | undefined) => {
    return useStateStore.getState().getProjectStates(projectId);
  };

  getProjectIntakeState = (projectId: string | null | undefined) => {
    return useStateStore.getState().getProjectIntakeState(projectId);
  };

  getProjectStateIds = (projectId: string | null | undefined) => {
    return useStateStore.getState().getProjectStateIds(projectId);
  };

  getProjectIntakeStateIds = (projectId: string | null | undefined) => {
    return useStateStore.getState().getProjectIntakeStateIds(projectId);
  };

  getProjectDefaultStateId = (projectId: string | null | undefined) => {
    return useStateStore.getState().getProjectDefaultStateId(projectId);
  };

  fetchProjectStates = async (workspaceSlug: string, projectId: string) => {
    const response = await stateService.getStates(workspaceSlug, projectId);
    useStateStore.getState().syncStates(response, projectId);
    return response;
  };

  fetchProjectIntakeState = async (workspaceSlug: string, projectId: string) => {
    const response = await stateService.getIntakeState(workspaceSlug, projectId);
    useStateStore.getState().syncIntakeState(response, projectId);
    return response;
  };

  fetchWorkspaceStates = async (workspaceSlug: string) => {
    const response = await stateService.getWorkspaceStates(workspaceSlug);
    useStateStore.getState().syncStates(response, workspaceSlug);
    return response;
  };

  createState = async (workspaceSlug: string, projectId: string, data: Partial<IState>) => {
    const response = await stateService.createState(workspaceSlug, projectId, data);
    useStateStore.getState().syncState(response);
    return response;
  };

  updateState = async (workspaceSlug: string, projectId: string, stateId: string, data: Partial<IState>) => {
    const originalState = useStateStore.getState().stateMap[stateId];
    try {
      // Optimistic update
      useStateStore.getState().syncState({ ...originalState, ...data } as IState);
      const response = await stateService.patchState(workspaceSlug, projectId, stateId, data);
      return response;
    } catch (error) {
      // Rollback on error
      if (originalState) {
        useStateStore.getState().syncState(originalState);
      }
      throw error;
    }
  };

  deleteState = async (workspaceSlug: string, projectId: string, stateId: string) => {
    const { stateMap, removeState } = useStateStore.getState();
    if (!stateMap[stateId]) return;
    await stateService.deleteState(workspaceSlug, projectId, stateId);
    removeState(stateId);
  };

  markStateAsDefault = async (workspaceSlug: string, projectId: string, stateId: string) => {
    const { stateMap, syncState } = useStateStore.getState();
    const originalStates = { ...stateMap };
    const currentDefaultState = Object.values(stateMap).find(
      (state) => state.project_id === projectId && state.default
    );

    try {
      // Optimistic update
      if (currentDefaultState) {
        syncState({ ...currentDefaultState, default: false });
      }
      syncState({ ...stateMap[stateId], default: true });
      await stateService.markDefault(workspaceSlug, projectId, stateId);
    } catch (error) {
      // Rollback on error
      Object.values(originalStates).forEach((state) => syncState(state));
      throw error;
    }
  };

  moveStatePosition = async (workspaceSlug: string, projectId: string, stateId: string, payload: Partial<IState>) => {
    const { stateMap, syncState } = useStateStore.getState();
    const originalState = stateMap[stateId];

    try {
      // Optimistic update
      syncState({ ...originalState, ...payload } as IState);
      await stateService.patchState(workspaceSlug, projectId, stateId, payload);
    } catch (error) {
      // Rollback on error
      if (originalState) {
        syncState(originalState);
      }
    }
  };

  getStatePercentageInGroup = (stateId: string | null | undefined) => {
    const projectId = getRouterProjectId();
    return useStateStore.getState().getStatePercentageInGroup(stateId, projectId);
  };
}
