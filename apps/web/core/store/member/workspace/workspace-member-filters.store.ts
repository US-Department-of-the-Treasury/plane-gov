import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { EUserPermissions } from "@plane/constants";
import type { IUserLite } from "@plane/types";
// local imports
import type { IMemberFilters } from "../utils";
import { sortWorkspaceMembers } from "../utils";

// Workspace membership interface matching the store structure
interface IWorkspaceMembership {
  id: string;
  member: string;
  role: EUserPermissions;
  is_active?: boolean;
}

export interface IWorkspaceMemberFiltersStore {
  // observables
  filters: IMemberFilters;
  // computed actions
  getFilteredMemberIds: (
    members: IWorkspaceMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: IWorkspaceMembership) => string
  ) => string[];
  // actions
  updateFilters: (filters: Partial<IMemberFilters>) => void;
}

// Zustand Store
interface WorkspaceMemberFiltersState {
  filters: IMemberFilters;
}

interface WorkspaceMemberFiltersActions {
  updateFilters: (filters: Partial<IMemberFilters>) => void;
  getFilteredMemberIds: (
    members: IWorkspaceMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: IWorkspaceMembership) => string
  ) => string[];
}

type WorkspaceMemberFiltersStoreType = WorkspaceMemberFiltersState & WorkspaceMemberFiltersActions;

export const useWorkspaceMemberFiltersStore = create<WorkspaceMemberFiltersStoreType>()(
  immer((set, get) => ({
    // State
    filters: {},

    // Actions
    /**
     * @description update filters
     * @param filters - partial filters to update
     */
    updateFilters: (filters) => {
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      });
    },

    /**
     * @description get filtered and sorted member ids
     * @param members - array of workspace membership objects
     * @param memberDetailsMap - map of member details by user id
     * @param getMemberKey - function to get member key from membership object
     */
    getFilteredMemberIds: (members, memberDetailsMap, getMemberKey) => {
      if (!members || members.length === 0) return [];

      const { filters } = get();
      // Apply filters and sorting
      const sortedMembers = sortWorkspaceMembers(members, memberDetailsMap, getMemberKey, filters);

      return sortedMembers.map(getMemberKey);
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class WorkspaceMemberFiltersStore implements IWorkspaceMemberFiltersStore {
  private get store() {
    return useWorkspaceMemberFiltersStore.getState();
  }

  get filters() {
    return this.store.filters;
  }

  updateFilters = (filters: Partial<IMemberFilters>) => this.store.updateFilters(filters);

  getFilteredMemberIds = (
    members: IWorkspaceMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: IWorkspaceMembership) => string
  ) => this.store.getFilteredMemberIds(members, memberDetailsMap, getMemberKey);
}
