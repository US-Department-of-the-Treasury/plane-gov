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
