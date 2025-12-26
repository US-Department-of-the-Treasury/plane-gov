import { uniq, sortBy } from "lodash-es";
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
import { getRouterProjectId } from "@/store/client";
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
    projectRoot: any
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
  handleMemberRemoval: (projectId: string, userId: string, projectRoot: any) => void;
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

  getProjectMemberDetails: (userId, projectId) => {
    const state = get();
    const projectMember = state.getProjectMembershipByUserId(userId, projectId);
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
      members = members.filter((m) => m.role !== EUserPermissions.GUEST);
    }

    // Note: Sorting by current user and display name requires userStore and memberRoot
    // which are passed through legacy class. Returning unsorted for now.
    const memberIds = members.map((m) => m.member);
    return memberIds;
  },

  getFilteredProjectMemberDetails: (userId, projectId) => {
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
        newProjectMemberMap[projectId][member.member] = {
          ...member,
          role: getUserProjectRole(member.member, projectId) ?? member.role,
          original_role: member.role,
        };
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
    rootStore
  ) => {
    const memberDetails = memberDetailsGetter(userId, projectId);
    if (!memberDetails || !memberDetails?.id) throw new Error("Member not found");

    const state = get();
    const isCurrentUser = rootStore.user.data?.id === userId;
    const membershipBeforeUpdate = { ...state.getProjectMembershipByUserId(userId, projectId) };
    const permissionBeforeUpdate = isCurrentUser
      ? rootStore.user.permission.getProjectRoleByWorkspaceSlugAndProjectId(workspaceSlug, projectId)
      : undefined;
    const updatedProjectRole = getProjectMemberRoleForUpdate(projectId, userId, role);

    try {
      // Optimistic update
      set((state) => {
        const newProjectMemberMap = { ...state.projectMemberMap };
        if (newProjectMemberMap[projectId]) {
          newProjectMemberMap[projectId] = { ...newProjectMemberMap[projectId] };
          if (newProjectMemberMap[projectId][userId]) {
            newProjectMemberMap[projectId][userId] = {
              ...newProjectMemberMap[projectId][userId],
              original_role: role,
              role: updatedProjectRole,
            };
          }
        }
        return { projectMemberMap: newProjectMemberMap };
      });

      if (isCurrentUser) {
        if (rootStore.user.permission.workspaceProjectsPermissions) {
          if (!rootStore.user.permission.workspaceProjectsPermissions[workspaceSlug]) {
            rootStore.user.permission.workspaceProjectsPermissions[workspaceSlug] = {};
          }
          rootStore.user.permission.workspaceProjectsPermissions[workspaceSlug][projectId] = updatedProjectRole;
        }

        if (rootStore.user.permission.projectUserInfo) {
          if (!rootStore.user.permission.projectUserInfo[workspaceSlug]) {
            rootStore.user.permission.projectUserInfo[workspaceSlug] = {};
          }
          if (!rootStore.user.permission.projectUserInfo[workspaceSlug][projectId]) {
            rootStore.user.permission.projectUserInfo[workspaceSlug][projectId] = {} as any;
          }
          rootStore.user.permission.projectUserInfo[workspaceSlug][projectId].role = updatedProjectRole;
        }
      }

      const response = await projectMemberService.updateProjectMember(
        workspaceSlug,
        projectId,
        memberDetails?.id,
        { role }
      );

      return response;
    } catch (error) {
      // Revert on error
      set((state) => {
        const newProjectMemberMap = { ...state.projectMemberMap };
        if (newProjectMemberMap[projectId] && newProjectMemberMap[projectId][userId]) {
          newProjectMemberMap[projectId] = { ...newProjectMemberMap[projectId] };
          newProjectMemberMap[projectId][userId] = {
            ...newProjectMemberMap[projectId][userId],
            original_role: membershipBeforeUpdate?.original_role,
            role: membershipBeforeUpdate?.role,
          };
        }
        return { projectMemberMap: newProjectMemberMap };
      });

      if (isCurrentUser) {
        if (rootStore.user.permission.workspaceProjectsPermissions?.[workspaceSlug]) {
          rootStore.user.permission.workspaceProjectsPermissions[workspaceSlug][projectId] =
            membershipBeforeUpdate?.original_role;
        }
        if (rootStore.user.permission.projectUserInfo?.[workspaceSlug]?.[projectId]) {
          rootStore.user.permission.projectUserInfo[workspaceSlug][projectId].role = permissionBeforeUpdate;
        }
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
  getProjectMemberRoleForUpdate: (
    projectId: string,
    userId: string,
    role: EUserProjectRoles
  ) => EUserProjectRoles;
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

/**
 * Legacy class wrapper for backward compatibility
 * This is an abstract class that must be extended to implement abstract methods
 */
export abstract class BaseProjectMemberStoreLegacy implements IBaseProjectMemberStore {
  protected rootStore: RootStore;
  protected routerStore: any;
  protected userStore: any;
  protected memberRoot: any;
  protected projectRoot: any;

  // Filters store wrapper
  filters: IProjectMemberFiltersStore;

  constructor(_memberRoot: any, _rootStore: RootStore) {
    this.rootStore = _rootStore;
    this.routerStore = _rootStore.router;
    this.userStore = _rootStore.user;
    this.memberRoot = _memberRoot;
    this.projectRoot = _rootStore.projectRoot.project;

    // Create filters wrapper that delegates to Zustand store
    this.filters = {
      get filtersMap() {
        return useBaseProjectMemberStore.getState().filtersMap;
      },
      getFilteredMemberIds: (members, memberDetailsMap, getMemberKey, projectId) => {
        return useBaseProjectMemberStore.getState().getFilteredMemberIds(members, memberDetailsMap, getMemberKey, projectId);
      },
      updateFilters: (projectId, filters) => {
        useBaseProjectMemberStore.getState().updateFilters(projectId, filters);
      },
      getFilters: (projectId) => {
        return useBaseProjectMemberStore.getState().getFilters(projectId);
      },
    };
  }

  // Getters that delegate to Zustand store
  get projectMemberFetchStatusMap() {
    return useBaseProjectMemberStore.getState().projectMemberFetchStatusMap;
  }

  get projectMemberMap() {
    return useBaseProjectMemberStore.getState().projectMemberMap;
  }

  get projectMemberPreferencesMap() {
    return useBaseProjectMemberStore.getState().projectMemberPreferencesMap;
  }

  get projectMemberIds(): string[] | null {
    const projectId = getRouterProjectId();
    if (!projectId) return null;

    const members = Object.values(this.projectMemberMap?.[projectId] ?? {});
    if (members.length === 0) return null;

    const currentFilters = this.filters.filtersMap[projectId];

    const sortedMembers = sortProjectMembers(
      members,
      this.memberRoot?.memberMap || {},
      (member) => member.member,
      currentFilters
    );

    return sortedMembers.map((member) => member.member);
  }

  // Computed function getters
  getProjectMemberFetchStatus = (projectId: string): boolean => {
    return useBaseProjectMemberStore.getState().getProjectMemberFetchStatus(projectId);
  };

  protected getProjectMemberships = (projectId: string): TProjectMembership[] => {
    return useBaseProjectMemberStore.getState().getProjectMemberships(projectId);
  };

  protected getProjectMembershipByUserId = (userId: string, projectId: string): TProjectMembership | undefined => {
    return useBaseProjectMemberStore.getState().getProjectMembershipByUserId(userId, projectId);
  };

  protected getRoleFromProjectMembership = (userId: string, projectId: string): EUserProjectRoles | undefined => {
    return useBaseProjectMemberStore.getState().getRoleFromProjectMembership(userId, projectId);
  };

  getProjectMemberDetails = (userId: string, projectId: string): IProjectMemberDetails | null => {
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

  getFilteredProjectMemberDetails = (userId: string, projectId: string): IProjectMemberDetails | null => {
    const projectMember = this.getProjectMembershipByUserId(userId, projectId);
    const userDetails = this.memberRoot?.memberMap?.[projectMember?.member];
    if (!projectMember || !userDetails) return null;

    const allMembers = this.getProjectMemberships(projectId);
    const filteredMemberIds = this.filters.getFilteredMemberIds(
      allMembers,
      this.memberRoot?.memberMap || {},
      (member) => member.member,
      projectId
    );

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

  getProjectMemberPreferences = (projectId: string): IProjectMemberNavigationPreferences | null => {
    return useBaseProjectMemberStore.getState().getProjectMemberPreferences(projectId);
  };

  // Fetch actions
  fetchProjectMembers = async (
    workspaceSlug: string,
    projectId: string,
    clearExistingMembers: boolean = false
  ): Promise<TProjectMembership[]> => {
    return useBaseProjectMemberStore.getState().fetchProjectMembers(workspaceSlug, projectId, clearExistingMembers);
  };

  fetchProjectMemberPreferences = async (
    workspaceSlug: string,
    projectId: string,
    memberId: string
  ): Promise<IProjectMemberNavigationPreferences> => {
    return useBaseProjectMemberStore.getState().fetchProjectMemberPreferences(workspaceSlug, projectId, memberId);
  };

  // Update actions
  updateProjectMemberPreferences = async (
    workspaceSlug: string,
    projectId: string,
    memberId: string,
    preferences: IProjectMemberNavigationPreferences
  ): Promise<void> => {
    return useBaseProjectMemberStore.getState().updateProjectMemberPreferences(
      workspaceSlug,
      projectId,
      memberId,
      preferences
    );
  };

  // Bulk operation actions
  bulkAddMembersToProject = async (
    workspaceSlug: string,
    projectId: string,
    data: IProjectBulkAddFormData
  ): Promise<TProjectMembership[]> => {
    return useBaseProjectMemberStore.getState().bulkAddMembersToProject(
      workspaceSlug,
      projectId,
      data,
      this.getUserProjectRole.bind(this),
      this.projectRoot
    );
  };

  // CRUD actions
  updateMemberRole = async (
    workspaceSlug: string,
    projectId: string,
    userId: string,
    role: EUserProjectRoles
  ): Promise<TProjectMembership> => {
    return useBaseProjectMemberStore.getState().updateMemberRole(
      workspaceSlug,
      projectId,
      userId,
      role,
      this.getProjectMemberRoleForUpdate.bind(this),
      this.getProjectMemberDetails.bind(this),
      this.rootStore
    );
  };

  removeMemberFromProject = async (workspaceSlug: string, projectId: string, userId: string): Promise<void> => {
    return useBaseProjectMemberStore.getState().removeMemberFromProject(
      workspaceSlug,
      projectId,
      userId,
      this.getProjectMemberDetails.bind(this),
      this.processMemberRemoval.bind(this)
    );
  };

  protected handleMemberRemoval = (projectId: string, userId: string): void => {
    useBaseProjectMemberStore.getState().handleMemberRemoval(projectId, userId, this.projectRoot);
  };

  // Abstract methods (must be implemented by subclasses)
  abstract getUserProjectRole: (userId: string, projectId: string) => EUserProjectRoles | undefined;
  abstract getProjectMemberRoleForUpdate: (
    projectId: string,
    userId: string,
    role: EUserProjectRoles
  ) => EUserProjectRoles;
  abstract processMemberRemoval: (projectId: string, userId: string) => void;
}
