import { sortBy } from "lodash-es";
import { create } from "zustand";
// types
import type { EUserPermissions } from "@plane/constants";
import type { IWorkspaceBulkInviteFormData, IWorkspaceMember, IWorkspaceMemberInvitation } from "@plane/types";
// services
import { WorkspaceService } from "@/plane-web/services";
// types
import type { CoreRootStore } from "@/store/root.store";
import type { IMemberFilters } from "@/store/member/utils";
import { sortWorkspaceMembers } from "@/store/member/utils";
import { getRouterWorkspaceSlug } from "@/store/client";

// Service instance at module level
const workspaceService = new WorkspaceService();

export interface IWorkspaceMembership {
  id: string;
  member: string;
  role: EUserPermissions;
  is_active?: boolean;
}

// Filters sub-store state
interface WorkspaceMemberFiltersState {
  filters: IMemberFilters;
}

// Filters sub-store actions
interface WorkspaceMemberFiltersActions {
  updateFilters: (filters: Partial<IMemberFilters>) => void;
  getFilteredMemberIds: (
    members: IWorkspaceMembership[],
    memberDetailsMap: Record<string, any>,
    getMemberKey: (member: IWorkspaceMembership) => string
  ) => string[];
}

// Combined filters store type
type WorkspaceMemberFiltersStore = WorkspaceMemberFiltersState & WorkspaceMemberFiltersActions;

// State interface
export interface WorkspaceMemberStoreState {
  workspaceMemberMap: Record<string, Record<string, IWorkspaceMembership>>;
  workspaceMemberInvitations: Record<string, IWorkspaceMemberInvitation[]>;
  filtersStore: WorkspaceMemberFiltersStore;
  rootStore: CoreRootStore | null;
}

// Actions interface
export interface WorkspaceMemberStoreActions {
  // Initialization
  setRootStore: (rootStore: CoreRootStore) => void;

  // Computed getters
  getWorkspaceMemberIds: (workspaceSlug: string) => string[];
  getFilteredWorkspaceMemberIds: (workspaceSlug: string) => string[];
  getSearchedWorkspaceMemberIds: (workspaceSlug: string, searchQuery: string) => string[] | null;
  getSearchedWorkspaceInvitationIds: (workspaceSlug: string, searchQuery: string) => string[] | null;
  getWorkspaceMemberDetails: (workspaceSlug: string, userId: string) => IWorkspaceMember | null;
  getWorkspaceInvitationDetails: (workspaceSlug: string, invitationId: string) => IWorkspaceMemberInvitation | null;
  isUserSuspended: (userId: string, workspaceSlug: string) => boolean;

  // Fetch actions
  fetchWorkspaceMembers: (workspaceSlug: string) => Promise<IWorkspaceMember[]>;
  fetchWorkspaceMemberInvitations: (workspaceSlug: string) => Promise<IWorkspaceMemberInvitation[]>;

  // CRUD actions
  updateMember: (workspaceSlug: string, userId: string, data: { role: EUserPermissions }) => Promise<void>;
  removeMemberFromWorkspace: (workspaceSlug: string, userId: string) => Promise<void>;

  // Invite actions
  inviteMembersToWorkspace: (workspaceSlug: string, data: IWorkspaceBulkInviteFormData) => Promise<void>;
  updateMemberInvitation: (
    workspaceSlug: string,
    invitationId: string,
    data: Partial<IWorkspaceMemberInvitation>
  ) => Promise<void>;
  deleteMemberInvitation: (workspaceSlug: string, invitationId: string) => Promise<void>;

  // Dev actions
  generateFakeMembers: (
    workspaceSlug: string,
    count: number
  ) => Promise<{ message: string; users: Array<{ id: string; email: string; display_name: string }> }>;
}

// Combined store type
export type WorkspaceMemberStore = WorkspaceMemberStoreState & WorkspaceMemberStoreActions;

// Initial state
const initialFiltersState: WorkspaceMemberFiltersState = {
  filters: {},
};

const initialState: WorkspaceMemberStoreState = {
  workspaceMemberMap: {},
  workspaceMemberInvitations: {},
  filtersStore: {
    ...initialFiltersState,
    updateFilters: () => {},
    getFilteredMemberIds: () => [],
  },
  rootStore: null,
};

/**
 * Workspace Member Store
 *
 * Manages workspace members, invitations, and filtering.
 * Migrated from MobX WorkspaceMemberStore to Zustand.
 *
 * Migration notes:
 * - Nested filtersStore is now integrated as part of the store state
 * - computedFn replaced with regular functions that access state via get()
 * - runInAction replaced with set() calls for immutable updates
 * - Service instance created at module level
 */
export const useWorkspaceMemberStore = create<WorkspaceMemberStore>()((set, get) => ({
  ...initialState,

  // Initialize filters store with proper functions
  filtersStore: {
    filters: {},

    updateFilters: (filters: Partial<IMemberFilters>) => {
      const state = get();
      set({
        filtersStore: {
          ...state.filtersStore,
          filters: { ...state.filtersStore.filters, ...filters },
        },
      });
    },

    getFilteredMemberIds: (
      members: IWorkspaceMembership[],
      memberDetailsMap: Record<string, any>,
      getMemberKey: (member: IWorkspaceMembership) => string
    ): string[] => {
      const state = get();
      if (!members || members.length === 0) return [];

      // Apply filters and sorting
      const sortedMembers = sortWorkspaceMembers(
        members,
        memberDetailsMap,
        getMemberKey,
        state.filtersStore.filters
      );

      return sortedMembers.map(getMemberKey);
    },
  },

  // Initialization
  setRootStore: (rootStore) => {
    set({ rootStore });
  },

  // Computed getters
  getWorkspaceMemberIds: (workspaceSlug: string) => {
    const state = get();
    const members = Object.values(state.workspaceMemberMap?.[workspaceSlug] ?? {});

    const sortedMembers = sortBy(members, [
      (m) => m.member !== state.rootStore?.user?.data?.id,
      (m) => state.rootStore?.member?.memberMap?.[m.member]?.display_name?.toLowerCase(),
    ]);

    // Filter out bots
    const memberIds = sortedMembers
      .filter((m) => !state.rootStore?.member?.memberMap?.[m.member]?.is_bot)
      .map((m) => m.member);

    return memberIds;
  },

  getFilteredWorkspaceMemberIds: (workspaceSlug: string) => {
    const state = get();
    let members = Object.values(state.workspaceMemberMap?.[workspaceSlug] ?? {});

    // Filter out bots and inactive members
    members = members.filter((m) => !state.rootStore?.member?.memberMap?.[m.member]?.is_bot);

    // Use filters store to get filtered member ids
    const memberIds = state.filtersStore.getFilteredMemberIds(
      members,
      state.rootStore?.member?.memberMap || {},
      (member) => member.member
    );

    return memberIds;
  },

  getSearchedWorkspaceMemberIds: (workspaceSlug: string, searchQuery: string) => {
    const state = get();
    const filteredMemberIds = state.getFilteredWorkspaceMemberIds(workspaceSlug);
    if (!filteredMemberIds) return null;

    const searchedWorkspaceMemberIds = filteredMemberIds.filter((userId) => {
      const memberDetails = state.getWorkspaceMemberDetails(workspaceSlug, userId);
      if (!memberDetails) return false;

      const memberSearchQuery = `${memberDetails.member.first_name} ${memberDetails.member.last_name} ${
        memberDetails.member?.display_name
      } ${memberDetails.member.email ?? ""}`;

      return memberSearchQuery.toLowerCase()?.includes(searchQuery.toLowerCase());
    });

    return searchedWorkspaceMemberIds;
  },

  getSearchedWorkspaceInvitationIds: (workspaceSlug: string, searchQuery: string) => {
    const state = get();
    const workspaceMemberInvitationIds = state.workspaceMemberInvitations?.[workspaceSlug]?.map((inv) => inv.id);
    if (!workspaceMemberInvitationIds) return null;

    const searchedWorkspaceMemberInvitationIds = workspaceMemberInvitationIds.filter((invitationId) => {
      const invitationDetails = state.getWorkspaceInvitationDetails(workspaceSlug, invitationId);
      if (!invitationDetails) return false;

      const invitationSearchQuery = `${invitationDetails.email}`;
      return invitationSearchQuery.toLowerCase()?.includes(searchQuery.toLowerCase());
    });

    return searchedWorkspaceMemberInvitationIds;
  },

  getWorkspaceMemberDetails: (workspaceSlug: string, userId: string) => {
    const state = get();
    const workspaceMember = state.workspaceMemberMap?.[workspaceSlug]?.[userId];
    if (!workspaceMember) return null;

    const memberDetails: IWorkspaceMember = {
      id: workspaceMember.id,
      role: workspaceMember.role,
      member: state.rootStore?.member?.memberMap?.[workspaceMember.member],
      is_active: workspaceMember.is_active,
    };

    return memberDetails;
  },

  getWorkspaceInvitationDetails: (workspaceSlug: string, invitationId: string) => {
    const state = get();
    const invitationsList = state.workspaceMemberInvitations?.[workspaceSlug];
    if (!invitationsList) return null;

    const invitation = invitationsList.find((inv) => inv.id === invitationId);
    return invitation ?? null;
  },

  isUserSuspended: (userId: string, workspaceSlug: string) => {
    const state = get();
    if (!workspaceSlug) return false;

    const workspaceMember = state.workspaceMemberMap?.[workspaceSlug]?.[userId];
    return workspaceMember?.is_active === false;
  },

  // Fetch actions
  fetchWorkspaceMembers: async (workspaceSlug: string) => {
    const state = get();
    const response = await workspaceService.fetchWorkspaceMembers(workspaceSlug);

    const updatedMemberMap = { ...state.workspaceMemberMap };
    if (!updatedMemberMap[workspaceSlug]) {
      updatedMemberMap[workspaceSlug] = {};
    } else {
      updatedMemberMap[workspaceSlug] = { ...updatedMemberMap[workspaceSlug] };
    }

    const updatedRootMemberMap = { ...state.rootStore?.member?.memberMap };

    response.forEach((member) => {
      updatedRootMemberMap[member.member.id] = { ...member.member, joining_date: member.created_at };
      updatedMemberMap[workspaceSlug][member.member.id] = {
        id: member.id,
        member: member.member.id,
        role: member.role,
        is_active: member.is_active,
      };
    });

    set({ workspaceMemberMap: updatedMemberMap });

    // Update root store member map if available
    if (state.rootStore?.member) {
      state.rootStore.member.memberMap = updatedRootMemberMap;
    }

    return response;
  },

  fetchWorkspaceMemberInvitations: async (workspaceSlug: string) => {
    const state = get();
    const response = await workspaceService.workspaceInvitations(workspaceSlug);

    set({
      workspaceMemberInvitations: {
        ...state.workspaceMemberInvitations,
        [workspaceSlug]: response,
      },
    });

    return response;
  },

  // CRUD actions
  updateMember: async (workspaceSlug: string, userId: string, data: { role: EUserPermissions }) => {
    const state = get();
    const memberDetails = state.getWorkspaceMemberDetails(workspaceSlug, userId);
    if (!memberDetails) throw new Error("Member not found");

    // Original data to revert back in case of error
    const originalProjectMemberData = { ...state.workspaceMemberMap?.[workspaceSlug]?.[userId] };

    try {
      // Optimistic update
      const updatedMemberMap = {
        ...state.workspaceMemberMap,
        [workspaceSlug]: {
          ...state.workspaceMemberMap[workspaceSlug],
          [userId]: {
            ...state.workspaceMemberMap[workspaceSlug][userId],
            role: data.role,
          },
        },
      };

      set({ workspaceMemberMap: updatedMemberMap });

      await workspaceService.updateWorkspaceMember(workspaceSlug, memberDetails.id, data);
    } catch (error) {
      // Revert back to original members in case of error
      const revertedMemberMap = {
        ...state.workspaceMemberMap,
        [workspaceSlug]: {
          ...state.workspaceMemberMap[workspaceSlug],
          [userId]: originalProjectMemberData,
        },
      };

      set({ workspaceMemberMap: revertedMemberMap });
      throw error;
    }
  },

  removeMemberFromWorkspace: async (workspaceSlug: string, userId: string) => {
    const state = get();
    const memberDetails = state.getWorkspaceMemberDetails(workspaceSlug, userId);
    if (!memberDetails) throw new Error("Member not found");

    await workspaceService.deleteWorkspaceMember(workspaceSlug, memberDetails?.id);

    const updatedMemberMap = {
      ...state.workspaceMemberMap,
      [workspaceSlug]: {
        ...state.workspaceMemberMap[workspaceSlug],
        [userId]: {
          ...state.workspaceMemberMap[workspaceSlug][userId],
          is_active: false,
        },
      },
    };

    set({ workspaceMemberMap: updatedMemberMap });
  },

  // Invite actions
  inviteMembersToWorkspace: async (workspaceSlug: string, data: IWorkspaceBulkInviteFormData) => {
    const response = await workspaceService.inviteWorkspace(workspaceSlug, data);
    await get().fetchWorkspaceMemberInvitations(workspaceSlug);
    return response;
  },

  updateMemberInvitation: async (
    workspaceSlug: string,
    invitationId: string,
    data: Partial<IWorkspaceMemberInvitation>
  ) => {
    const state = get();
    const originalMemberInvitations = [...(state.workspaceMemberInvitations?.[workspaceSlug] || [])];

    try {
      const memberInvitations = originalMemberInvitations?.map((invitation) => ({
        ...invitation,
        ...(invitation.id === invitationId && data),
      }));

      // Optimistic update
      set({
        workspaceMemberInvitations: {
          ...state.workspaceMemberInvitations,
          [workspaceSlug]: memberInvitations,
        },
      });

      await workspaceService.updateWorkspaceInvitation(workspaceSlug, invitationId, data);
    } catch (error) {
      // Revert back to original members in case of error
      set({
        workspaceMemberInvitations: {
          ...state.workspaceMemberInvitations,
          [workspaceSlug]: originalMemberInvitations,
        },
      });
      throw error;
    }
  },

  deleteMemberInvitation: async (workspaceSlug: string, invitationId: string) => {
    const state = get();

    await workspaceService.deleteWorkspaceInvitations(workspaceSlug.toString(), invitationId);

    const updatedInvitations = state.workspaceMemberInvitations[workspaceSlug].filter(
      (inv) => inv.id !== invitationId
    );

    set({
      workspaceMemberInvitations: {
        ...state.workspaceMemberInvitations,
        [workspaceSlug]: updatedInvitations,
      },
    });
  },

  // Dev actions
  generateFakeMembers: async (workspaceSlug: string, count: number) => {
    const response = await workspaceService.generateFakeMembers(workspaceSlug, count);
    // Refresh the members list after generating fake users
    await get().fetchWorkspaceMembers(workspaceSlug);
    return response;
  },
}));

// Legacy interface matching original MobX interface
export interface IWorkspaceMemberStore {
  // observables
  workspaceMemberMap: Record<string, Record<string, IWorkspaceMembership>>;
  workspaceMemberInvitations: Record<string, IWorkspaceMemberInvitation[]>;
  // filters store
  filtersStore: {
    filters: IMemberFilters;
    updateFilters: (filters: Partial<IMemberFilters>) => void;
    getFilteredMemberIds: (
      members: IWorkspaceMembership[],
      memberDetailsMap: Record<string, any>,
      getMemberKey: (member: IWorkspaceMembership) => string
    ) => string[];
  };
  // computed
  workspaceMemberIds: string[] | null;
  workspaceMemberInvitationIds: string[] | null;
  memberMap: Record<string, IWorkspaceMembership> | null;
  // computed actions
  getWorkspaceMemberIds: (workspaceSlug: string) => string[];
  getFilteredWorkspaceMemberIds: (workspaceSlug: string) => string[];
  getSearchedWorkspaceMemberIds: (searchQuery: string) => string[] | null;
  getSearchedWorkspaceInvitationIds: (searchQuery: string) => string[] | null;
  getWorkspaceMemberDetails: (workspaceMemberId: string) => IWorkspaceMember | null;
  getWorkspaceInvitationDetails: (invitationId: string) => IWorkspaceMemberInvitation | null;
  // fetch actions
  fetchWorkspaceMembers: (workspaceSlug: string) => Promise<IWorkspaceMember[]>;
  fetchWorkspaceMemberInvitations: (workspaceSlug: string) => Promise<IWorkspaceMemberInvitation[]>;
  // crud actions
  updateMember: (workspaceSlug: string, userId: string, data: { role: EUserPermissions }) => Promise<void>;
  removeMemberFromWorkspace: (workspaceSlug: string, userId: string) => Promise<void>;
  // invite actions
  inviteMembersToWorkspace: (workspaceSlug: string, data: IWorkspaceBulkInviteFormData) => Promise<void>;
  updateMemberInvitation: (
    workspaceSlug: string,
    invitationId: string,
    data: Partial<IWorkspaceMemberInvitation>
  ) => Promise<void>;
  deleteMemberInvitation: (workspaceSlug: string, invitationId: string) => Promise<void>;
  isUserSuspended: (userId: string, workspaceSlug: string) => boolean;
  // dev actions
  generateFakeMembers: (
    workspaceSlug: string,
    count: number
  ) => Promise<{ message: string; users: Array<{ id: string; email: string; display_name: string }> }>;
}

// Legacy class wrapper for backward compatibility
export class WorkspaceMemberStoreLegacy implements IWorkspaceMemberStore {
  private rootStore: CoreRootStore;

  constructor(_memberRoot: any, _rootStore: CoreRootStore) {
    this.rootStore = _rootStore;

    // Initialize the Zustand store with the root store
    useWorkspaceMemberStore.getState().setRootStore(_rootStore);
  }

  // Getters that delegate to Zustand store
  get workspaceMemberMap(): Record<string, Record<string, IWorkspaceMembership>> {
    return useWorkspaceMemberStore.getState().workspaceMemberMap;
  }

  get workspaceMemberInvitations(): Record<string, IWorkspaceMemberInvitation[]> {
    return useWorkspaceMemberStore.getState().workspaceMemberInvitations;
  }

  get filtersStore() {
    return useWorkspaceMemberStore.getState().filtersStore;
  }

  get workspaceMemberIds(): string[] | null {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return this.getWorkspaceMemberIds(workspaceSlug);
  }

  get memberMap(): Record<string, IWorkspaceMembership> | null {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return this.workspaceMemberMap?.[workspaceSlug] ?? {};
  }

  get workspaceMemberInvitationIds(): string[] | null {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return this.workspaceMemberInvitations?.[workspaceSlug]?.map((inv) => inv.id);
  }

  // Computed actions that delegate to Zustand store
  getWorkspaceMemberIds = (workspaceSlug: string): string[] => {
    return useWorkspaceMemberStore.getState().getWorkspaceMemberIds(workspaceSlug);
  };

  getFilteredWorkspaceMemberIds = (workspaceSlug: string): string[] => {
    return useWorkspaceMemberStore.getState().getFilteredWorkspaceMemberIds(workspaceSlug);
  };

  getSearchedWorkspaceMemberIds = (searchQuery: string): string[] | null => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return useWorkspaceMemberStore.getState().getSearchedWorkspaceMemberIds(workspaceSlug, searchQuery);
  };

  getSearchedWorkspaceInvitationIds = (searchQuery: string): string[] | null => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return useWorkspaceMemberStore.getState().getSearchedWorkspaceInvitationIds(workspaceSlug, searchQuery);
  };

  getWorkspaceMemberDetails = (userId: string): IWorkspaceMember | null => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return useWorkspaceMemberStore.getState().getWorkspaceMemberDetails(workspaceSlug, userId);
  };

  getWorkspaceInvitationDetails = (invitationId: string): IWorkspaceMemberInvitation | null => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return useWorkspaceMemberStore.getState().getWorkspaceInvitationDetails(workspaceSlug, invitationId);
  };

  isUserSuspended = (userId: string, workspaceSlug: string): boolean => {
    return useWorkspaceMemberStore.getState().isUserSuspended(userId, workspaceSlug);
  };

  // Action methods that delegate to Zustand store
  fetchWorkspaceMembers = async (workspaceSlug: string): Promise<IWorkspaceMember[]> => {
    return useWorkspaceMemberStore.getState().fetchWorkspaceMembers(workspaceSlug);
  };

  fetchWorkspaceMemberInvitations = async (workspaceSlug: string): Promise<IWorkspaceMemberInvitation[]> => {
    return useWorkspaceMemberStore.getState().fetchWorkspaceMemberInvitations(workspaceSlug);
  };

  updateMember = async (
    workspaceSlug: string,
    userId: string,
    data: { role: EUserPermissions }
  ): Promise<void> => {
    return useWorkspaceMemberStore.getState().updateMember(workspaceSlug, userId, data);
  };

  removeMemberFromWorkspace = async (workspaceSlug: string, userId: string): Promise<void> => {
    return useWorkspaceMemberStore.getState().removeMemberFromWorkspace(workspaceSlug, userId);
  };

  inviteMembersToWorkspace = async (
    workspaceSlug: string,
    data: IWorkspaceBulkInviteFormData
  ): Promise<void> => {
    return useWorkspaceMemberStore.getState().inviteMembersToWorkspace(workspaceSlug, data);
  };

  updateMemberInvitation = async (
    workspaceSlug: string,
    invitationId: string,
    data: Partial<IWorkspaceMemberInvitation>
  ): Promise<void> => {
    return useWorkspaceMemberStore.getState().updateMemberInvitation(workspaceSlug, invitationId, data);
  };

  deleteMemberInvitation = async (workspaceSlug: string, invitationId: string): Promise<void> => {
    return useWorkspaceMemberStore.getState().deleteMemberInvitation(workspaceSlug, invitationId);
  };

  generateFakeMembers = async (
    workspaceSlug: string,
    count: number
  ): Promise<{ message: string; users: Array<{ id: string; email: string; display_name: string }> }> => {
    return useWorkspaceMemberStore.getState().generateFakeMembers(workspaceSlug, count);
  };
}
