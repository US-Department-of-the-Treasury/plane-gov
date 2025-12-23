import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { IUserLite, TProjectMembership } from "@plane/types";
// local imports
import type { IMemberFilters } from "../utils";
import { sortProjectMembers } from "../utils";

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

// Zustand Store
interface ProjectMemberFiltersState {
  filtersMap: Record<string, IMemberFilters>;
}

interface ProjectMemberFiltersActions {
  updateFilters: (projectId: string, filters: Partial<IMemberFilters>) => void;
  getFilters: (projectId: string) => IMemberFilters | undefined;
  getFilteredMemberIds: (
    members: TProjectMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: TProjectMembership) => string,
    projectId: string
  ) => string[];
}

type ProjectMemberFiltersStoreType = ProjectMemberFiltersState & ProjectMemberFiltersActions;

export const useProjectMemberFiltersStore = create<ProjectMemberFiltersStoreType>()(
  immer((set, get) => ({
    // State
    filtersMap: {},

    // Actions
    /**
     * @description get filters for a specific project
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
        state.filtersMap[projectId] = { ...current, ...filters };
      });
    },

    /**
     * @description get filtered and sorted member ids
     * @param members - array of project membership objects
     * @param memberDetailsMap - map of member details by user id
     * @param getMemberKey - function to get member key from membership object
     * @param projectId - project id to get filters for
     */
    getFilteredMemberIds: (members, memberDetailsMap, getMemberKey, projectId) => {
      if (!members || members.length === 0) return [];

      const { filtersMap } = get();
      // Apply filters and sorting
      const sortedMembers = sortProjectMembers(members, memberDetailsMap, getMemberKey, filtersMap[projectId]);

      return sortedMembers.map(getMemberKey);
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class ProjectMemberFiltersStore implements IProjectMemberFiltersStore {
  private get store() {
    return useProjectMemberFiltersStore.getState();
  }

  get filtersMap() {
    return this.store.filtersMap;
  }

  getFilters = (projectId: string) => this.store.getFilters(projectId);

  updateFilters = (projectId: string, filters: Partial<IMemberFilters>) =>
    this.store.updateFilters(projectId, filters);

  getFilteredMemberIds = (
    members: TProjectMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: TProjectMembership) => string,
    projectId: string
  ) => this.store.getFilteredMemberIds(members, memberDetailsMap, getMemberKey, projectId);
}
