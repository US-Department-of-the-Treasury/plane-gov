import { create } from "zustand";
// types
import type { EUserPermissions } from "@plane/constants";
import type { IUserLite } from "@plane/types";
// local imports
import type { IMemberFilters } from "@/store/member/utils";
import { sortWorkspaceMembers } from "@/store/member/utils";

// Workspace membership interface matching the store structure
interface IWorkspaceMembership {
  id: string;
  member: string;
  role: EUserPermissions;
  is_active?: boolean;
}

// State interface
export interface WorkspaceMemberFiltersStoreState {
  filters: IMemberFilters;
}

// Actions interface
export interface WorkspaceMemberFiltersStoreActions {
  updateFilters: (filters: Partial<IMemberFilters>) => void;
  getFilteredMemberIds: (
    members: IWorkspaceMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: IWorkspaceMembership) => string
  ) => string[];
}

// Combined store type
export type WorkspaceMemberFiltersStore = WorkspaceMemberFiltersStoreState & WorkspaceMemberFiltersStoreActions;

// Initial state
const initialState: WorkspaceMemberFiltersStoreState = {
  filters: {},
};

/**
 * Workspace Member Filters Store
 *
 * Manages filtering and sorting for workspace members.
 * Migrated from MobX WorkspaceMemberFiltersStore to Zustand.
 *
 * Migration notes:
 * - Replaced MobX observables with Zustand state
 * - Replaced computedFn with regular function
 * - Replaced action with functions that use set()
 */
export const useWorkspaceMemberFiltersStore = create<WorkspaceMemberFiltersStore>((set, get) => ({
  ...initialState,

  /**
   * @description update filters
   * @param filters - partial filters to update
   */
  updateFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  /**
   * @description get filtered and sorted member ids
   * @param members - array of workspace membership objects
   * @param memberDetailsMap - map of member details by user id
   * @param getMemberKey - function to get member key from membership object
   */
  getFilteredMemberIds: (members, memberDetailsMap, getMemberKey) => {
    if (!members || members.length === 0) return [];

    const state = get();

    // Apply filters and sorting
    const sortedMembers = sortWorkspaceMembers(members, memberDetailsMap, getMemberKey, state.filters);

    return sortedMembers.map(getMemberKey);
  },
}));

// Legacy interface matching original MobX interface
export interface IWorkspaceMemberFilters {
  filters: IMemberFilters;
  getFilteredMemberIds: (
    members: IWorkspaceMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: IWorkspaceMembership) => string
  ) => string[];
  updateFilters: (filters: Partial<IMemberFilters>) => void;
}
