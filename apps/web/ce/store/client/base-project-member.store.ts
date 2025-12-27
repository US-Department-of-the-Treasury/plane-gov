import { uniq } from "lodash-es";
import { create } from "zustand";
// plane imports
import { EUserPermissions } from "@plane/constants";
import type {
  EUserProjectRoles,
  IProjectBulkAddFormData,
  IProjectMemberNavigationPreferences,
  IUserLite,
  TProjectMembership,
} from "@plane/types";
// services
import { ProjectMemberService } from "@/services/project";
// store helpers
import { useUserStore } from "@/store/user";
import { useBaseUserPermissionStore } from "@/store/client/user-base-permissions.store";
// utils
import type { IMemberFilters } from "@/store/member/utils";
import { sortProjectMembers } from "@/store/member/utils";
// types
import type { RootStore } from "@/plane-web/store/root.store";

// Service instance at module level
const projectMemberService = new ProjectMemberService();

export interface IProjectMemberDetails extends Omit<TProjectMembership, "member"> {
  member: IUserLite;
}

// State interface
export interface BaseProjectMemberStoreState {
  projectMemberFetchStatusMap: {
    [projectId: string]: boolean;
  };
  projectMemberMap: {
    [projectId: string]: Record<string, TProjectMembership>;
  };
  projectMemberPreferencesMap: {
    [projectId: string]: IProjectMemberNavigationPreferences;
  };
  // Filters state (integrated from ProjectMemberFiltersStore)
  filtersMap: Record<string, IMemberFilters>;
}

// Actions interface
export interface BaseProjectMemberStoreActions {
  // Filter actions
  updateFilters: (projectId: string, filters: Partial<IMemberFilters>) => void;
  getFilters: (projectId: string) => IMemberFilters | undefined;
  getFilteredMemberIds: (
    members: TProjectMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: TProjectMembership) => string,
    projectId: string
  ) => string[];

  // Computed getters
  getProjectMemberFetchStatus: (projectId: string) => boolean;
  getProjectMemberships: (projectId: string) => TProjectMembership[];
  getProjectMembershipByUserId: (userId: string, projectId: string) => TProjectMembership | undefined;
  getRoleFromProjectMembership: (userId: string, projectId: string) => EUserProjectRoles | undefined;
  getProjectMemberDetails: (userId: string, projectId: string) => IProjectMemberDetails | null;
  getProjectMemberIds: (projectId: string, includeGuestUsers: boolean) => string[] | null;
  getFilteredProjectMemberDetails: (userId: string, projectId: string) => IProjectMemberDetails | null;
  getProjectMemberPreferences: (projectId: string) => IProjectMemberNavigationPreferences | null;

  // Fetch actions
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

  // Update actions
  updateProjectMemberPreferences: (
    workspaceSlug: string,
    projectId: string,
    memberId: string,
    preferences: IProjectMemberNavigationPreferences
  ) => Promise<void>;

  // Bulk operation actions
  bulkAddMembersToProject: (
    workspaceSlug: string,
    projectId: string,
    data: IProjectBulkAddFormData,
    getUserProjectRole: (userId: string, projectId: string) => EUserProjectRoles | undefined,
    projectRoot: { projectMap?: Record<string, { members?: string[] }> }
  ) => Promise<TProjectMembership[]>;

  // CRUD actions
  updateMemberRole: (
    workspaceSlug: string,
    projectId: string,
    userId: string,
    role: EUserProjectRoles,
    getProjectMemberRoleForUpdate: (projectId: string, userId: string, role: EUserProjectRoles) => EUserProjectRoles,
    memberDetailsGetter: (userId: string, projectId: string) => IProjectMemberDetails | null,
    rootStore: RootStore
  ) => Promise<TProjectMembership>;

  removeMemberFromProject: (
    workspaceSlug: string,
    projectId: string,
    userId: string,
    memberDetailsGetter: (userId: string, projectId: string) => IProjectMemberDetails | null,
    processMemberRemoval: (projectId: string, userId: string) => void
  ) => Promise<void>;

  // Helper for member removal
  handleMemberRemoval: (
    projectId: string,
    userId: string,
    projectRoot: { projectMap?: Record<string, { members?: string[] }> }
  ) => void;
}

// Combined store type
export type BaseProjectMemberStore = BaseProjectMemberStoreState & BaseProjectMemberStoreActions;

// Initial state
const initialState: BaseProjectMemberStoreState = {
  projectMemberFetchStatusMap: {},
  projectMemberMap: {},
  projectMemberPreferencesMap: {},
  filtersMap: {},
};

/**
 * Base Project Member Store (Zustand)
 *
 * Manages project member data, filters, and preferences.
 * Migrated from MobX BaseProjectMemberStore to Zustand.
 *
 * Note: This is the base store. Subclasses should implement:
 * - getUserProjectRole
 * - getProjectMemberRoleForUpdate
 * - processMemberRemoval
 */
export const useBaseProjectMemberStore = create<BaseProjectMemberStore>()((set, get) => ({
  ...initialState,

  // Filter actions
  updateFilters: (projectId, filters) => {
    const state = get();
    const current = state.filtersMap[projectId] ?? {};
    set({
      filtersMap: {
        ...state.filtersMap,
        [projectId]: { ...current, ...filters },
      },
    });
  },

  getFilters: (projectId) => {
    return get().filtersMap[projectId];
  },

  getFilteredMemberIds: (members, memberDetailsMap, getMemberKey, projectId) => {
    if (!members || members.length === 0) return [];
    const state = get();
    const sortedMembers = sortProjectMembers(members, memberDetailsMap, getMemberKey, state.filtersMap[projectId]);
    return sortedMembers.map(getMemberKey);
  },

  // Computed getters
  getProjectMemberFetchStatus: (projectId) => {
    return get().projectMemberFetchStatusMap?.[projectId] ?? false;
  },

  getProjectMemberships: (projectId) => {
    return Object.values(get().projectMemberMap?.[projectId] ?? {});
  },

  getProjectMembershipByUserId: (userId, projectId) => {
    return get().projectMemberMap?.[projectId]?.[userId];
  },

  getRoleFromProjectMembership: (userId, projectId) => {
    const state = get();
    const projectMembership = state.getProjectMembershipByUserId(userId, projectId);
    if (!projectMembership) return undefined;
    const projectMembershipRole = projectMembership.original_role ?? projectMembership.role;
    return projectMembershipRole ? (projectMembershipRole as EUserProjectRoles) : undefined;
  },

  getProjectMemberDetails: (_userId, _projectId) => {
    // Note: memberMap comes from memberRoot which needs to be passed in by legacy class
    // This is a limitation of the Zustand migration - we can't access other stores directly
    return null; // Will be implemented in legacy class wrapper
  },

  getProjectMemberIds: (projectId, includeGuestUsers) => {
    const state = get();
    const projectMemberMap = state.projectMemberMap?.[projectId];
    if (!projectMemberMap) return null;

    let members = state.getProjectMemberships(projectId);
    if (includeGuestUsers === false) {
      members = members.filter((m) => m.role !== (EUserPermissions.GUEST as unknown as EUserProjectRoles));
    }

    // Note: Sorting by current user and display name requires userStore and memberRoot
    // which are passed through legacy class. Returning unsorted for now.
    const memberIds = members.map((m) => m.member);
    return memberIds;
  },

  getFilteredProjectMemberDetails: (_userId, _projectId) => {
    // Note: This requires memberRoot which is passed through legacy class
    return null; // Will be implemented in legacy class wrapper
  },

  getProjectMemberPreferences: (projectId) => {
    return get().projectMemberPreferencesMap[projectId] || null;
  },

  // Fetch actions
  fetchProjectMembers: async (workspaceSlug, projectId, clearExistingMembers = false) => {
    const response = await projectMemberService.fetchProjectMembers(workspaceSlug, projectId);

    set((state) => {
      const newProjectMemberMap = { ...state.projectMemberMap };

      if (clearExistingMembers) {
        delete newProjectMemberMap[projectId];
      }

      if (!newProjectMemberMap[projectId]) {
        newProjectMemberMap[projectId] = {};
      } else {
        newProjectMemberMap[projectId] = { ...newProjectMemberMap[projectId] };
      }

      response.forEach((member) => {
        newProjectMemberMap[projectId][member.member] = member;
      });

      return {
        projectMemberMap: newProjectMemberMap,
        projectMemberFetchStatusMap: {
          ...state.projectMemberFetchStatusMap,
          [projectId]: true,
        },
      };
    });

    return response;
  },

  fetchProjectMemberPreferences: async (workspaceSlug, projectId, memberId) => {
    const response = await projectMemberService.getProjectMemberPreferences(workspaceSlug, projectId, memberId);
    const preferences: IProjectMemberNavigationPreferences = {
      default_tab: response.preferences.navigation.default_tab,
      hide_in_more_menu: response.preferences.navigation.hide_in_more_menu || [],
    };

    set((state) => ({
      projectMemberPreferencesMap: {
        ...state.projectMemberPreferencesMap,
        [projectId]: preferences,
      },
    }));

    return preferences;
  },

  // Update actions
  updateProjectMemberPreferences: async (workspaceSlug, projectId, memberId, preferences) => {
    const state = get();
    const previousPreferences = state.projectMemberPreferencesMap[projectId];

    try {
      // Optimistically update the store
      set((state) => ({
        projectMemberPreferencesMap: {
          ...state.projectMemberPreferencesMap,
          [projectId]: preferences,
        },
      }));

      await projectMemberService.updateProjectMemberPreferences(workspaceSlug, projectId, memberId, {
        navigation: preferences,
      });
    } catch (error) {
      // Revert on error
      set((state) => {
        if (previousPreferences) {
          return {
            projectMemberPreferencesMap: {
              ...state.projectMemberPreferencesMap,
              [projectId]: previousPreferences,
            },
          };
        } else {
          const newPreferencesMap = { ...state.projectMemberPreferencesMap };
          delete newPreferencesMap[projectId];
          return { projectMemberPreferencesMap: newPreferencesMap };
        }
      });
      throw error;
    }
  },

  // Bulk operation actions
  bulkAddMembersToProject: async (workspaceSlug, projectId, data, getUserProjectRole, projectRoot) => {
    const response = await projectMemberService.bulkAddMembersToProject(workspaceSlug, projectId, data);

    set((state) => {
      const newProjectMemberMap = { ...state.projectMemberMap };
      if (!newProjectMemberMap[projectId]) {
        newProjectMemberMap[projectId] = {};
      } else {
        newProjectMemberMap[projectId] = { ...newProjectMemberMap[projectId] };
      }

      response.forEach((member) => {
        const updatedRole = getUserProjectRole(member.member, projectId) ?? member.role;
        newProjectMemberMap[projectId][member.member] = {
          member: member.member,
          role: updatedRole,
          original_role: member.role as EUserProjectRoles,
          id: member.id,
          created_at: member.created_at,
        } as TProjectMembership;
      });

      return { projectMemberMap: newProjectMemberMap };
    });

    // Update project root
    if (projectRoot.projectMap?.[projectId]) {
      const currentMembers = projectRoot.projectMap[projectId].members || [];
      const newMemberIds = data.members.map((m) => m.member_id);
      projectRoot.projectMap[projectId].members = uniq([...currentMembers, ...newMemberIds]);
    }

    return response;
  },

  // CRUD actions
  updateMemberRole: async (
    workspaceSlug,
    projectId,
    userId,
    role,
    getProjectMemberRoleForUpdate,
    memberDetailsGetter,
    _rootStore
  ) => {
    const memberDetails = memberDetailsGetter(userId, projectId);
    if (!memberDetails || !memberDetails?.id) throw new Error("Member not found");

    const state = get();
    // Direct Zustand store access - no rootStore indirection
    const currentUserId = useUserStore.getState().data?.id;
    const isCurrentUser = currentUserId === userId;
    const membershipBeforeUpdate = state.getProjectMembershipByUserId(userId, projectId);
    const permissionBeforeUpdate = isCurrentUser
      ? useBaseUserPermissionStore.getState().getProjectRole(workspaceSlug, projectId)
      : undefined;
    const updatedProjectRole = getProjectMemberRoleForUpdate(projectId, userId, role);

    try {
      // Optimistic update
      set((state) => {
        const newProjectMemberMap = { ...state.projectMemberMap };
        if (newProjectMemberMap[projectId]) {
          newProjectMemberMap[projectId] = { ...newProjectMemberMap[projectId] };
          if (newProjectMemberMap[projectId][userId]) {
            const current = newProjectMemberMap[projectId][userId];
            newProjectMemberMap[projectId][userId] = {
              member: current.member,
              role: updatedProjectRole,
              original_role: role,
              id: current.id,
              created_at: current.created_at,
            } as TProjectMembership;
          }
        }
        return { projectMemberMap: newProjectMemberMap };
      });

      // Direct Zustand store action - no rootStore indirection
      if (isCurrentUser) {
        useBaseUserPermissionStore.getState().setProjectPermission(workspaceSlug, projectId, updatedProjectRole);
      }

      const response = await projectMemberService.updateProjectMember(workspaceSlug, projectId, memberDetails?.id, {
        role,
      });

      return response;
    } catch (error) {
      // Revert on error
      if (membershipBeforeUpdate) {
        set((state) => {
          const newProjectMemberMap = { ...state.projectMemberMap };
          if (newProjectMemberMap[projectId] && newProjectMemberMap[projectId][userId]) {
            newProjectMemberMap[projectId] = { ...newProjectMemberMap[projectId] };
            newProjectMemberMap[projectId][userId] = membershipBeforeUpdate;
          }
          return { projectMemberMap: newProjectMemberMap };
        });
      }

      // Direct Zustand store action - no rootStore indirection
      if (isCurrentUser && permissionBeforeUpdate) {
        useBaseUserPermissionStore.getState().setProjectPermission(workspaceSlug, projectId, permissionBeforeUpdate);
      }

      throw error;
    }
  },

  removeMemberFromProject: async (workspaceSlug, projectId, userId, memberDetailsGetter, processMemberRemoval) => {
    const memberDetails = memberDetailsGetter(userId, projectId);
    if (!memberDetails || !memberDetails?.id) throw new Error("Member not found");

    await projectMemberService.deleteProjectMember(workspaceSlug, projectId, memberDetails?.id);

    processMemberRemoval(projectId, userId);
  },

  // Helper for member removal
  handleMemberRemoval: (projectId, userId, projectRoot) => {
    set((state) => {
      const newProjectMemberMap = { ...state.projectMemberMap };
      if (newProjectMemberMap[projectId]) {
        newProjectMemberMap[projectId] = { ...newProjectMemberMap[projectId] };
        delete newProjectMemberMap[projectId][userId];
      }
      return { projectMemberMap: newProjectMemberMap };
    });

    if (projectRoot.projectMap?.[projectId]) {
      projectRoot.projectMap[projectId].members = projectRoot.projectMap[projectId].members?.filter(
        (memberId: string) => memberId !== userId
      );
    }
  },
}));

// Legacy interface matching original MobX interface
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
  // abstract methods (must be implemented by subclasses)
  getUserProjectRole: (userId: string, projectId: string) => EUserProjectRoles | undefined;
  getProjectMemberRoleForUpdate: (projectId: string, userId: string, role: EUserProjectRoles) => EUserProjectRoles;
  processMemberRemoval: (projectId: string, userId: string) => void;
}

// Filters store interface for compatibility
export interface IProjectMemberFiltersStore {
  filtersMap: Record<string, IMemberFilters>;
  getFilteredMemberIds: (
    members: TProjectMembership[],
    memberDetailsMap: Record<string, IUserLite>,
    getMemberKey: (member: TProjectMembership) => string,
    projectId: string
  ) => string[];
  updateFilters: (projectId: string, filters: Partial<IMemberFilters>) => void;
  getFilters: (projectId: string) => IMemberFilters | undefined;
}
