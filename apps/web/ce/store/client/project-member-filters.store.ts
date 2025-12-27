import { create } from "zustand";
// types
import type { IUserLite, TProjectMembership } from "@plane/types";
// local imports
import type { IMemberFilters } from "@/store/member/utils";
import { sortProjectMembers } from "@/store/member/utils";

// State interface
export interface ProjectMemberFiltersStoreState {
  filtersMap: Record<string, IMemberFilters>;
}

// Actions interface
export interface ProjectMemberFiltersStoreActions {
  updateFilters: (projectId: string, filters: Partial<IMemberFilters>) => void;
  getFilters: (projectId: string) => IMemberFilters | undefined;
  getFilteredMemberIds: (
    members: TProjectMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: TProjectMembership) => string,
    projectId: string
  ) => string[];
}

// Combined store type
export type ProjectMemberFiltersStore = ProjectMemberFiltersStoreState & ProjectMemberFiltersStoreActions;

// Initial state
const initialState: ProjectMemberFiltersStoreState = {
  filtersMap: {},
};

/**
 * Project Member Filters Store
 *
 * Manages filters for project members (order_by, roles).
 * Migrated from MobX ProjectMemberFiltersStore to Zustand.
 *
 * Migration notes:
 * - Replaced MobX observables with Zustand state
 * - Replaced MobX actions with Zustand actions
 * - Replaced computedFn with regular function that uses get()
 * - Uses immutable state updates with spread operators
 */
export const useProjectMemberFiltersStore = create<ProjectMemberFiltersStore>()((set, get) => ({
  ...initialState,

  /**
   * @description get filtered and sorted member ids
   * @param members - array of project membership objects
   * @param memberDetailsMap - map of member details by user id
   * @param getMemberKey - function to get member key from membership object
   * @param projectId - project id to get filters for
   */
  getFilteredMemberIds: (members, memberDetailsMap, getMemberKey, projectId) => {
    if (!members || members.length === 0) return [];

    const state = get();
    // Apply filters and sorting
    const sortedMembers = sortProjectMembers(members, memberDetailsMap, getMemberKey, state.filtersMap[projectId]);

    return sortedMembers.map(getMemberKey);
  },

  /**
   * @description get filters for a project
   * @param projectId - project id
   */
  getFilters: (projectId) => {
    return get().filtersMap[projectId];
  },

  /**
   * @description update filters
   * @param projectId - project id
   * @param filters - partial filters to update
   */
  updateFilters: (projectId, filters) => {
    set((state) => {
      const current = state.filtersMap[projectId] ?? {};
      return {
        filtersMap: {
          ...state.filtersMap,
          [projectId]: { ...current, ...filters },
        },
      };
    });
  },
}));

// Legacy interface matching original MobX interface
export interface IProjectMemberFiltersStore {
  // observables
  filtersMap: Record<string, IMemberFilters>;
  // computed actions
  getFilteredMemberIds: (
    members: TProjectMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: TProjectMembership) => string,
    projectId: string
  ) => string[];
  // actions
  updateFilters: (projectId: string, filters: Partial<IMemberFilters>) => void;
  getFilters: (projectId: string) => IMemberFilters | undefined;
}
