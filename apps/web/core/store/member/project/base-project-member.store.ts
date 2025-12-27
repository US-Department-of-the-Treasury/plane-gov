import { uniq, unset, set, update, sortBy } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import { EUserPermissions } from "@plane/constants";
import type {
  EUserProjectRoles,
  IProjectBulkAddFormData,
  IProjectMemberNavigationPreferences,
  IUserLite,
  TProjectMembership,
} from "@plane/types";
// plane web imports
import type { RootStore } from "@/plane-web/store/root.store";
// services
import { ProjectMemberService } from "@/services/project";
// store
import type { IProjectStore } from "@/store/project/project.store";
import type { IRouterStore } from "@/store/client";
import { getRouterProjectId, getRouterWorkspaceSlug, useBaseUserPermissionStore } from "@/store/client";
import type { IUserStore } from "@/store/user";
import { useUserStore } from "@/store/user";
// local imports
import type { IMemberRootStore } from "../index";
import { sortProjectMembers } from "../utils";
import type { IProjectMemberFiltersStore } from "./project-member-filters.store";
import { ProjectMemberFiltersStore } from "./project-member-filters.store";

export interface IProjectMemberDetails extends Omit<TProjectMembership, "member"> {
  member: IUserLite;
}

export interface IBaseProjectMemberStore {
  // observables
  projectMemberFetchStatusMap: {
    [projectId: string]: boolean;
  };
  projectMemberMap: {
    [projectId: string]: Record<string, TProjectMembership>;
  };
  projectMemberPreferencesMap: {
    [projectId: string]: IProjectMemberNavigationPreferences;
  };
  // filters store
  filters: IProjectMemberFiltersStore;
  // computed
  projectMemberIds: string[] | null;
  // computed actions
  getProjectMemberFetchStatus: (projectId: string) => boolean;
  getProjectMemberDetails: (userId: string, projectId: string) => IProjectMemberDetails | null;
  getProjectMemberIds: (projectId: string, includeGuestUsers: boolean) => string[] | null;
  getFilteredProjectMemberDetails: (userId: string, projectId: string) => IProjectMemberDetails | null;
  getProjectMemberPreferences: (projectId: string) => IProjectMemberNavigationPreferences | null;
  // fetch actions
  fetchProjectMembers: (
    workspaceSlug: string,
    projectId: string,
    clearExistingMembers?: boolean
  ) => Promise<TProjectMembership[]>;
  fetchProjectMemberPreferences: (
    workspaceSlug: string,
    projectId: string,
    memberId: string
  ) => Promise<IProjectMemberNavigationPreferences>;
  // update actions
  updateProjectMemberPreferences: (
    workspaceSlug: string,
    projectId: string,
    memberId: string,
    preferences: IProjectMemberNavigationPreferences
  ) => Promise<void>;
  // bulk operation actions
  bulkAddMembersToProject: (
    workspaceSlug: string,
    projectId: string,
    data: IProjectBulkAddFormData
  ) => Promise<TProjectMembership[]>;
  // crud actions
  updateMemberRole: (
    workspaceSlug: string,
    projectId: string,
    userId: string,
    role: EUserProjectRoles
  ) => Promise<TProjectMembership>;
  removeMemberFromProject: (workspaceSlug: string, projectId: string, userId: string) => Promise<void>;
}

// Zustand Store
interface BaseProjectMemberState {
  projectMemberFetchStatusMap: Record<string, boolean>;
  projectMemberMap: Record<string, Record<string, TProjectMembership>>;
  projectMemberPreferencesMap: Record<string, IProjectMemberNavigationPreferences>;
}

interface BaseProjectMemberActions {
  setProjectMemberFetchStatus: (projectId: string, status: boolean) => void;
  setProjectMember: (projectId: string, userId: string, membership: TProjectMembership) => void;
  setProjectMembers: (projectId: string, members: Record<string, TProjectMembership>) => void;
  clearProjectMembers: (projectId: string) => void;
  removeProjectMember: (projectId: string, userId: string) => void;
  updateProjectMemberRole: (projectId: string, userId: string, role: EUserProjectRoles, originalRole?: EUserProjectRoles) => void;
  setProjectMemberPreferences: (projectId: string, preferences: IProjectMemberNavigationPreferences) => void;
  clearProjectMemberPreferences: (projectId: string) => void;
  resetStore: () => void;
}

export type BaseProjectMemberStoreType = BaseProjectMemberState & BaseProjectMemberActions;

export const useBaseProjectMemberStore = create<BaseProjectMemberStoreType>()(
  immer((set) => ({
    projectMemberFetchStatusMap: {},
    projectMemberMap: {},
    projectMemberPreferencesMap: {},

    setProjectMemberFetchStatus: (projectId, status) => {
      set((state) => {
        state.projectMemberFetchStatusMap[projectId] = status;
      });
    },

    setProjectMember: (projectId, userId, membership) => {
      set((state) => {
        if (!state.projectMemberMap[projectId]) {
          state.projectMemberMap[projectId] = {};
        }
        state.projectMemberMap[projectId][userId] = membership;
      });
    },

    setProjectMembers: (projectId, members) => {
      set((state) => {
        state.projectMemberMap[projectId] = members;
      });
    },

    clearProjectMembers: (projectId) => {
      set((state) => {
        delete state.projectMemberMap[projectId];
      });
    },

    removeProjectMember: (projectId, userId) => {
      set((state) => {
        if (state.projectMemberMap[projectId]) {
          delete state.projectMemberMap[projectId][userId];
        }
      });
    },

    updateProjectMemberRole: (projectId, userId, role, originalRole) => {
      set((state) => {
        if (state.projectMemberMap[projectId]?.[userId]) {
          state.projectMemberMap[projectId][userId].role = role as any;
          if (originalRole !== undefined) {
            state.projectMemberMap[projectId][userId].original_role = originalRole as any;
          }
        }
      });
    },

    setProjectMemberPreferences: (projectId, preferences) => {
      set((state) => {
        state.projectMemberPreferencesMap[projectId] = preferences;
      });
    },

    clearProjectMemberPreferences: (projectId) => {
      set((state) => {
        delete state.projectMemberPreferencesMap[projectId];
      });
    },

    resetStore: () => {
      set({
        projectMemberFetchStatusMap: {},
        projectMemberMap: {},
        projectMemberPreferencesMap: {},
      });
    },
  }))
);

/**
 * Legacy abstract class wrapper for backward compatibility with MobX patterns.
 * Used by subclasses and root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useBaseProjectMemberStore hook directly in React components
 */
export abstract class BaseProjectMemberStore implements IBaseProjectMemberStore {
  // filters store
  filters: IProjectMemberFiltersStore;
  // stores
  userStore: IUserStore;
  memberRoot: IMemberRootStore;
  projectRoot: IProjectStore;
  rootStore: RootStore;
  // services
  projectMemberService;

  constructor(_memberRoot: IMemberRootStore, _rootStore: RootStore) {
    // root store
    this.rootStore = _rootStore;
    this.userStore = _rootStore.user;
    this.memberRoot = _memberRoot;
    this.projectRoot = _rootStore.projectRoot.project;
    this.filters = new ProjectMemberFiltersStore();
    // services
    this.projectMemberService = new ProjectMemberService();
  }

  // Zustand store access helpers
  protected get store() {
    return useBaseProjectMemberStore.getState();
  }

  get projectMemberFetchStatusMap() {
    return this.store.projectMemberFetchStatusMap;
  }

  get projectMemberMap() {
    return this.store.projectMemberMap;
  }

  get projectMemberPreferencesMap() {
    return this.store.projectMemberPreferencesMap;
  }

  /**
   * @description get the list of all the user ids of all the members of the current project
   * Returns filtered and sorted member IDs based on current filters
   */
  get projectMemberIds() {
    const projectId = getRouterProjectId();
    if (!projectId) return null;

    const members = Object.values(this.projectMemberMap?.[projectId] ?? {});
    if (members.length === 0) return null;

    // Access the filters directly to ensure MobX tracking
    const currentFilters = this.filters.filtersMap[projectId];

    // Apply filters and sorting directly here to ensure MobX tracking
    const sortedMembers = sortProjectMembers(
      members,
      this.memberRoot?.memberMap || {},
      (member) => member.member,
      currentFilters
    );

    return sortedMembers.map((member) => member.member);
  }

  /**
   * @description get the fetch status of a project member
   * @param projectId
   */
  getProjectMemberFetchStatus = (projectId: string) => this.projectMemberFetchStatusMap?.[projectId];

  /**
   * @description get the project memberships
   * @param projectId
   */
  protected getProjectMemberships = (projectId: string) =>
    Object.values(this.projectMemberMap?.[projectId] ?? {});

  /**
   * @description get the project membership by user id
   * @param userId
   * @param projectId
   */
  protected getProjectMembershipByUserId = (userId: string, projectId: string) =>
    this.projectMemberMap?.[projectId]?.[userId];

  /**
   * @description get the role from the project membership
   * @param userId
   * @param projectId
   */
  protected getRoleFromProjectMembership = (userId: string, projectId: string): EUserProjectRoles | undefined => {
    const projectMembership = this.getProjectMembershipByUserId(userId, projectId);
    if (!projectMembership) return undefined;
    const projectMembershipRole = projectMembership.original_role ?? projectMembership.role;
    return projectMembershipRole ? (projectMembershipRole as EUserProjectRoles) : undefined;
  };

  /**
   * @description Returns the project membership role for a user
   * @description This method is specifically used when adding new members to a project. For existing members,
   * the role is fetched directly from the backend during member listing.
   * @param { string } userId - The ID of the user
   * @param { string } projectId - The ID of the project
   * @returns { EUserProjectRoles | undefined } The user's role in the project, or undefined if not found
   */
  abstract getUserProjectRole: (userId: string, projectId: string) => EUserProjectRoles | undefined;

  /**
   * @description get the details of a project member
   * @param userId
   * @param projectId
   */
  getProjectMemberDetails = (userId: string, projectId: string) => {
    const projectMember = this.getProjectMembershipByUserId(userId, projectId);
    const userDetails = this.memberRoot?.memberMap?.[projectMember?.member];
    if (!projectMember || !userDetails) return null;
    const memberDetails: IProjectMemberDetails = {
      id: projectMember.id,
      role: projectMember.role,
      original_role: projectMember.original_role,
      member: {
        ...userDetails,
        joining_date: projectMember.created_at ?? undefined,
      },
      created_at: projectMember.created_at,
    };
    return memberDetails;
  };

  /**
   * @description get the list of all the user ids of all the members of a project using projectId
   * @param projectId
   */
  getProjectMemberIds = (projectId: string, includeGuestUsers: boolean): string[] | null => {
    if (!this.projectMemberMap?.[projectId]) return null;
    let members = this.getProjectMemberships(projectId);
    if (includeGuestUsers === false) {
      members = members.filter((m) => m.role !== EUserPermissions.GUEST);
    }
    members = sortBy(members, [
      (m) => m.member !== this.userStore.data?.id,
      (m) => this.memberRoot?.memberMap?.[m.member]?.display_name?.toLowerCase(),
    ]);
    const memberIds = members.map((m) => m.member);
    return memberIds;
  };

  /**
   * @description get the filtered project member details for a specific user
   * @param userId
   * @param projectId
   */
  getFilteredProjectMemberDetails = (userId: string, projectId: string) => {
    const projectMember = this.getProjectMembershipByUserId(userId, projectId);
    const userDetails = this.memberRoot?.memberMap?.[projectMember?.member];
    if (!projectMember || !userDetails) return null;

    // Check if this member passes the current filters
    const allMembers = this.getProjectMemberships(projectId);
    const filteredMemberIds = this.filters.getFilteredMemberIds(
      allMembers,
      this.memberRoot?.memberMap || {},
      (member) => member.member,
      projectId
    );

    // Return null if this user doesn't pass the filters
    if (!filteredMemberIds.includes(userId)) return null;

    const memberDetails: IProjectMemberDetails = {
      id: projectMember.id,
      role: projectMember.role,
      original_role: projectMember.original_role,
      member: {
        ...userDetails,
        joining_date: projectMember.created_at ?? undefined,
      },
      created_at: projectMember.created_at,
    };
    return memberDetails;
  };

  /**
   * @description fetch the list of all the members of a project
   * @param workspaceSlug
   * @param projectId
   */
  fetchProjectMembers = async (workspaceSlug: string, projectId: string, clearExistingMembers: boolean = false) =>
    await this.projectMemberService.fetchProjectMembers(workspaceSlug, projectId).then((response) => {
      if (clearExistingMembers) {
        this.store.clearProjectMembers(projectId);
      }
      response.forEach((member) => {
        this.store.setProjectMember(projectId, member.member, member);
      });
      this.store.setProjectMemberFetchStatus(projectId, true);
      return response;
    });

  /**
   * @description bulk add members to a project
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @returns Promise<TProjectMembership[]>
   */
  bulkAddMembersToProject = async (workspaceSlug: string, projectId: string, data: IProjectBulkAddFormData) =>
    await this.projectMemberService.bulkAddMembersToProject(workspaceSlug, projectId, data).then((response) => {
      response.forEach((member) => {
        this.store.setProjectMember(projectId, member.member, {
          ...member,
          role: (this.getUserProjectRole(member.member, projectId) ?? member.role) as any,
          original_role: member.role as any,
        });
      });
      update(this.projectRoot.projectMap, [projectId, "members"], (memberIds) =>
        uniq([...memberIds, ...data.members.map((m) => m.member_id)])
      );
      this.projectRoot.projectMap[projectId].members = this.projectRoot.projectMap?.[projectId]?.members?.concat(
        data.members.map((m) => m.member_id)
      );

      return response;
    });

  /**
   * @description update the role of a member in a project
   * @param projectId
   * @param userId
   * @param role
   */
  abstract getProjectMemberRoleForUpdate: (
    projectId: string,
    userId: string,
    role: EUserProjectRoles
  ) => EUserProjectRoles;

  /**
   * @description update the role of a member in a project
   * @param workspaceSlug
   * @param projectId
   * @param userId
   * @param data
   */
  updateMemberRole = async (workspaceSlug: string, projectId: string, userId: string, role: EUserProjectRoles) => {
    const memberDetails = this.getProjectMemberDetails(userId, projectId);
    if (!memberDetails || !memberDetails?.id) throw new Error("Member not found");
    // original data to revert back in case of error
    // Direct Zustand store access - no rootStore indirection
    const currentUserId = useUserStore.getState().data?.id;
    const isCurrentUser = currentUserId === userId;
    const membershipBeforeUpdate = { ...this.getProjectMembershipByUserId(userId, projectId) };
    // Direct Zustand store access - no rootStore indirection
    const permissionBeforeUpdate = isCurrentUser
      ? useBaseUserPermissionStore.getState().getProjectRole(workspaceSlug, projectId)
      : undefined;
    const updatedProjectRole = this.getProjectMemberRoleForUpdate(projectId, userId, role);
    try {
      this.store.updateProjectMemberRole(projectId, userId, updatedProjectRole, role);
      if (isCurrentUser) {
        // Direct Zustand store action - no rootStore indirection
        useBaseUserPermissionStore.getState().setProjectPermission(workspaceSlug, projectId, updatedProjectRole);
      }
      // Direct Zustand store action - no rootStore indirection
      useBaseUserPermissionStore.getState().setProjectUserInfoRole(workspaceSlug, projectId, updatedProjectRole);
      const response = await this.projectMemberService.updateProjectMember(
        workspaceSlug,
        projectId,
        memberDetails?.id,
        {
          role,
        }
      );
      return response;
    } catch (error) {
      // revert back to original members in case of error
      this.store.updateProjectMemberRole(
        projectId,
        userId,
        membershipBeforeUpdate?.role as EUserProjectRoles,
        membershipBeforeUpdate?.original_role as EUserProjectRoles
      );
      if (isCurrentUser && membershipBeforeUpdate?.original_role !== undefined) {
        // Direct Zustand store action - no rootStore indirection
        useBaseUserPermissionStore
          .getState()
          .setProjectPermission(workspaceSlug, projectId, membershipBeforeUpdate.original_role as EUserProjectRoles);
      }
      if (permissionBeforeUpdate !== undefined) {
        // Direct Zustand store action - no rootStore indirection
        useBaseUserPermissionStore.getState().setProjectUserInfoRole(workspaceSlug, projectId, permissionBeforeUpdate);
      }
      throw error;
    }
  };

  /**
   * @description Handles the removal of a member from a project
   * @param projectId - The ID of the project to remove the member from
   * @param userId - The ID of the user to remove from the project
   */
  protected handleMemberRemoval = (projectId: string, userId: string) => {
    this.store.removeProjectMember(projectId, userId);
    set(
      this.projectRoot.projectMap,
      [projectId, "members"],
      this.projectRoot.projectMap?.[projectId]?.members?.filter((memberId) => memberId !== userId)
    );
  };

  /**
   * @description Processes the removal of a member from a project
   * This abstract method handles the cleanup of member data from the project member map
   * @param projectId - The ID of the project to remove the member from
   * @param userId - The ID of the user to remove from the project
   */
  abstract processMemberRemoval: (projectId: string, userId: string) => void;

  /**
   * @description remove a member from a project
   * @param workspaceSlug
   * @param projectId
   * @param userId
   */
  removeMemberFromProject = async (workspaceSlug: string, projectId: string, userId: string) => {
    const memberDetails = this.getProjectMemberDetails(userId, projectId);
    if (!memberDetails || !memberDetails?.id) throw new Error("Member not found");
    await this.projectMemberService.deleteProjectMember(workspaceSlug, projectId, memberDetails?.id).then(() => {
      this.processMemberRemoval(projectId, userId);
    });
  };

  /**
   * @description get project member preferences
   * @param projectId
   */
  getProjectMemberPreferences = (projectId: string): IProjectMemberNavigationPreferences | null =>
    this.projectMemberPreferencesMap[projectId] || null;

  /**
   * @description fetch project member preferences
   * @param workspaceSlug
   * @param projectId
   * @param memberId
   */
  fetchProjectMemberPreferences = async (
    workspaceSlug: string,
    projectId: string,
    memberId: string
  ): Promise<IProjectMemberNavigationPreferences> => {
    const response = await this.projectMemberService.getProjectMemberPreferences(workspaceSlug, projectId, memberId);
    const preferences: IProjectMemberNavigationPreferences = {
      default_tab: response.preferences.navigation.default_tab,
      hide_in_more_menu: response.preferences.navigation.hide_in_more_menu || [],
    };
    this.store.setProjectMemberPreferences(projectId, preferences);
    return preferences;
  };

  /**
   * @description update project member preferences
   * @param workspaceSlug
   * @param projectId
   * @param memberId
   * @param preferences
   */
  updateProjectMemberPreferences = async (
    workspaceSlug: string,
    projectId: string,
    memberId: string,
    preferences: IProjectMemberNavigationPreferences
  ): Promise<void> => {
    const previousPreferences = this.projectMemberPreferencesMap[projectId];
    try {
      // Optimistically update the store
      this.store.setProjectMemberPreferences(projectId, preferences);
      await this.projectMemberService.updateProjectMemberPreferences(workspaceSlug, projectId, memberId, {
        navigation: preferences,
      });
    } catch (error) {
      // Revert on error
      if (previousPreferences) {
        this.store.setProjectMemberPreferences(projectId, previousPreferences);
      } else {
        this.store.clearProjectMemberPreferences(projectId);
      }
      throw error;
    }
  };
}
