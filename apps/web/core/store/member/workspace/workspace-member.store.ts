import { set, sortBy } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { EUserPermissions } from "@plane/constants";
import type { IWorkspaceBulkInviteFormData, IWorkspaceMember, IWorkspaceMemberInvitation } from "@plane/types";
// plane-web constants
// services
import { WorkspaceService } from "@/plane-web/services";
// types
import { getRouterWorkspaceSlug } from "@/store/client";
import type { IUserStore } from "@/store/user";
// store
import type { CoreRootStore } from "../../root.store";
import type { IMemberRootStore } from "../index.ts";
import type { IWorkspaceMemberFiltersStore } from "./workspace-member-filters.store";
import { WorkspaceMemberFiltersStore } from "./workspace-member-filters.store";

export interface IWorkspaceMembership {
  id: string;
  member: string;
  role: EUserPermissions;
  is_active?: boolean;
}

export interface IWorkspaceMemberStore {
  // observables
  workspaceMemberMap: Record<string, Record<string, IWorkspaceMembership>>;
  workspaceMemberInvitations: Record<string, IWorkspaceMemberInvitation[]>;
  // filters store
  filtersStore: IWorkspaceMemberFiltersStore;
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

// Zustand Store
interface WorkspaceMemberState {
  workspaceMemberMap: Record<string, Record<string, IWorkspaceMembership>>;
  workspaceMemberInvitations: Record<string, IWorkspaceMemberInvitation[]>;
}

interface WorkspaceMemberActions {
  setWorkspaceMember: (workspaceSlug: string, userId: string, membership: IWorkspaceMembership) => void;
  setWorkspaceMemberRole: (workspaceSlug: string, userId: string, role: EUserPermissions) => void;
  setWorkspaceMemberActive: (workspaceSlug: string, userId: string, isActive: boolean) => void;
  setWorkspaceMemberInvitations: (workspaceSlug: string, invitations: IWorkspaceMemberInvitation[]) => void;
  updateWorkspaceMemberInvitation: (
    workspaceSlug: string,
    invitationId: string,
    data: Partial<IWorkspaceMemberInvitation>
  ) => void;
  deleteWorkspaceMemberInvitation: (workspaceSlug: string, invitationId: string) => void;
  resetStore: () => void;
}

export type WorkspaceMemberStoreType = WorkspaceMemberState & WorkspaceMemberActions;

export const useWorkspaceMemberStore = create<WorkspaceMemberStoreType>()(
  immer((set) => ({
    workspaceMemberMap: {},
    workspaceMemberInvitations: {},

    setWorkspaceMember: (workspaceSlug, userId, membership) => {
      set((state) => {
        if (!state.workspaceMemberMap[workspaceSlug]) {
          state.workspaceMemberMap[workspaceSlug] = {};
        }
        state.workspaceMemberMap[workspaceSlug][userId] = membership;
      });
    },

    setWorkspaceMemberRole: (workspaceSlug, userId, role) => {
      set((state) => {
        if (state.workspaceMemberMap[workspaceSlug]?.[userId]) {
          state.workspaceMemberMap[workspaceSlug][userId].role = role as EUserPermissions;
        }
      });
    },

    setWorkspaceMemberActive: (workspaceSlug, userId, isActive) => {
      set((state) => {
        if (state.workspaceMemberMap[workspaceSlug]?.[userId]) {
          state.workspaceMemberMap[workspaceSlug][userId].is_active = isActive;
        }
      });
    },

    setWorkspaceMemberInvitations: (workspaceSlug, invitations) => {
      set((state) => {
        state.workspaceMemberInvitations[workspaceSlug] = invitations;
      });
    },

    updateWorkspaceMemberInvitation: (workspaceSlug, invitationId, data) => {
      set((state) => {
        const invitations = state.workspaceMemberInvitations[workspaceSlug];
        if (invitations) {
          const updatedInvitations = invitations.map((inv) =>
            inv.id === invitationId ? { ...inv, ...data } : inv
          );
          state.workspaceMemberInvitations[workspaceSlug] = updatedInvitations;
        }
      });
    },

    deleteWorkspaceMemberInvitation: (workspaceSlug, invitationId) => {
      set((state) => {
        const invitations = state.workspaceMemberInvitations[workspaceSlug];
        if (invitations) {
          state.workspaceMemberInvitations[workspaceSlug] = invitations.filter((inv) => inv.id !== invitationId);
        }
      });
    },

    resetStore: () => {
      set({
        workspaceMemberMap: {},
        workspaceMemberInvitations: {},
      });
    },
  }))
);

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useWorkspaceMemberStore hook directly in React components
 */
export class WorkspaceMemberStore implements IWorkspaceMemberStore {
  // filters store
  filtersStore: IWorkspaceMemberFiltersStore;
  // stores
  userStore: IUserStore;
  memberRoot: IMemberRootStore;
  // services
  workspaceService;

  constructor(_memberRoot: IMemberRootStore, _rootStore: CoreRootStore) {
    // initialize filters store
    this.filtersStore = new WorkspaceMemberFiltersStore();
    // root store
    this.userStore = _rootStore.user;
    this.memberRoot = _memberRoot;
    // services
    this.workspaceService = new WorkspaceService();
  }

  // Zustand store access helpers
  private get store() {
    return useWorkspaceMemberStore.getState();
  }

  get workspaceMemberMap() {
    return this.store.workspaceMemberMap;
  }

  get workspaceMemberInvitations() {
    return this.store.workspaceMemberInvitations;
  }

  /**
   * @description get the list of all the user ids of all the members of the current workspace
   */
  get workspaceMemberIds() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;

    return this.getWorkspaceMemberIds(workspaceSlug);
  }

  get memberMap() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    return this.workspaceMemberMap?.[workspaceSlug] ?? {};
  }

  get workspaceMemberInvitationIds() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    return this.workspaceMemberInvitations?.[workspaceSlug]?.map((inv) => inv.id);
  }

  getWorkspaceMemberIds = (workspaceSlug: string) => {
    let members = Object.values(this.workspaceMemberMap?.[workspaceSlug] ?? {});
    members = sortBy(members, [
      (m) => m.member !== this.userStore?.data?.id,
      (m) => this.memberRoot?.memberMap?.[m.member]?.display_name?.toLowerCase(),
    ]);
    //filter out bots
    const memberIds = members.filter((m) => !this.memberRoot?.memberMap?.[m.member]?.is_bot).map((m) => m.member);
    return memberIds;
  };

  /**
   * @description get the filtered and sorted list of all the user ids of all the members of the workspace
   * @param workspaceSlug
   */
  getFilteredWorkspaceMemberIds = (workspaceSlug: string) => {
    let members = Object.values(this.workspaceMemberMap?.[workspaceSlug] ?? {});
    //filter out bots and inactive members
    members = members.filter((m) => !this.memberRoot?.memberMap?.[m.member]?.is_bot);

    // Use filters store to get filtered member ids
    const memberIds = this.filtersStore.getFilteredMemberIds(
      members,
      this.memberRoot?.memberMap || {},
      (member) => member.member
    );

    return memberIds;
  };

  /**
   * @description get the list of all the user ids that match the search query of all the members of the current workspace
   * @param searchQuery
   */
  getSearchedWorkspaceMemberIds = (searchQuery: string) => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    const filteredMemberIds = this.getFilteredWorkspaceMemberIds(workspaceSlug);
    if (!filteredMemberIds) return null;
    const searchedWorkspaceMemberIds = filteredMemberIds.filter((userId) => {
      const memberDetails = this.getWorkspaceMemberDetails(userId);
      if (!memberDetails) return false;
      const memberSearchQuery = `${memberDetails.member.first_name} ${memberDetails.member.last_name} ${
        memberDetails.member?.display_name
      } ${memberDetails.member.email ?? ""}`;
      return memberSearchQuery.toLowerCase()?.includes(searchQuery.toLowerCase());
    });
    return searchedWorkspaceMemberIds;
  };

  /**
   * @description get the list of all the invitation ids that match the search query of all the member invitations of the current workspace
   * @param searchQuery
   */
  getSearchedWorkspaceInvitationIds = (searchQuery: string) => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    const workspaceMemberInvitationIds = this.workspaceMemberInvitationIds;
    if (!workspaceMemberInvitationIds) return null;
    const searchedWorkspaceMemberInvitationIds = workspaceMemberInvitationIds.filter((invitationId) => {
      const invitationDetails = this.getWorkspaceInvitationDetails(invitationId);
      if (!invitationDetails) return false;
      const invitationSearchQuery = `${invitationDetails.email}`;
      return invitationSearchQuery.toLowerCase()?.includes(searchQuery.toLowerCase());
    });
    return searchedWorkspaceMemberInvitationIds;
  };

  /**
   * @description get the details of a workspace member
   * @param userId
   */
  getWorkspaceMemberDetails = (userId: string) => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    const workspaceMember = this.workspaceMemberMap?.[workspaceSlug]?.[userId];
    if (!workspaceMember) return null;

    const memberDetails: IWorkspaceMember = {
      id: workspaceMember.id,
      role: workspaceMember.role,
      member: this.memberRoot?.memberMap?.[workspaceMember.member],
      is_active: workspaceMember.is_active,
    };
    return memberDetails;
  };

  /**
   * @description get the details of a workspace member invitation
   * @param workspaceSlug
   * @param memberId
   */
  getWorkspaceInvitationDetails = (invitationId: string) => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    const invitationsList = this.workspaceMemberInvitations?.[workspaceSlug];
    if (!invitationsList) return null;

    const invitation = invitationsList.find((inv) => inv.id === invitationId);
    return invitation ?? null;
  };

  /**
   * @description fetch all the members of a workspace
   * @param workspaceSlug
   */
  fetchWorkspaceMembers = async (workspaceSlug: string) =>
    await this.workspaceService.fetchWorkspaceMembers(workspaceSlug).then((response) => {
      response.forEach((member) => {
        set(this.memberRoot?.memberMap, member.member.id, { ...member.member, joining_date: member.created_at });
        this.store.setWorkspaceMember(workspaceSlug, member.member.id, {
          id: member.id,
          member: member.member.id,
          role: member.role as EUserPermissions,
          is_active: member.is_active,
        });
      });
      return response;
    });

  /**
   * @description update the role of a workspace member
   * @param workspaceSlug
   * @param userId
   * @param data
   */
  updateMember = async (workspaceSlug: string, userId: string, data: { role: EUserPermissions }) => {
    const memberDetails = this.getWorkspaceMemberDetails(userId);
    if (!memberDetails) throw new Error("Member not found");
    // original data to revert back in case of error
    const originalProjectMemberData = { ...this.workspaceMemberMap?.[workspaceSlug]?.[userId] };
    try {
      this.store.setWorkspaceMemberRole(workspaceSlug, userId, data.role);
      await this.workspaceService.updateWorkspaceMember(workspaceSlug, memberDetails.id, data);
    } catch (error) {
      // revert back to original members in case of error
      this.store.setWorkspaceMember(workspaceSlug, userId, originalProjectMemberData);
      throw error;
    }
  };

  /**
   * @description remove a member from workspace
   * @param workspaceSlug
   * @param userId
   */
  removeMemberFromWorkspace = async (workspaceSlug: string, userId: string) => {
    const memberDetails = this.getWorkspaceMemberDetails(userId);
    if (!memberDetails) throw new Error("Member not found");
    await this.workspaceService.deleteWorkspaceMember(workspaceSlug, memberDetails?.id).then(() => {
      this.store.setWorkspaceMemberActive(workspaceSlug, userId, false);
    });
  };

  /**
   * @description fetch all the member invitations of a workspace
   * @param workspaceSlug
   */
  fetchWorkspaceMemberInvitations = async (workspaceSlug: string) =>
    await this.workspaceService.workspaceInvitations(workspaceSlug).then((response) => {
      this.store.setWorkspaceMemberInvitations(workspaceSlug, response);
      return response;
    });

  /**
   * @description bulk invite members to a workspace
   * @param workspaceSlug
   * @param data
   */
  inviteMembersToWorkspace = async (workspaceSlug: string, data: IWorkspaceBulkInviteFormData) => {
    const response = await this.workspaceService.inviteWorkspace(workspaceSlug, data);
    await this.fetchWorkspaceMemberInvitations(workspaceSlug);
    return response;
  };

  /**
   * @description update the role of a member invitation
   * @param workspaceSlug
   * @param invitationId
   * @param data
   */
  updateMemberInvitation = async (
    workspaceSlug: string,
    invitationId: string,
    data: Partial<IWorkspaceMemberInvitation>
  ) => {
    const originalMemberInvitations = [...this.workspaceMemberInvitations?.[workspaceSlug]]; // in case of error, we will revert back to original members
    try {
      // optimistic update
      this.store.updateWorkspaceMemberInvitation(workspaceSlug, invitationId, data);
      await this.workspaceService.updateWorkspaceInvitation(workspaceSlug, invitationId, data);
    } catch (error) {
      // revert back to original members in case of error
      this.store.setWorkspaceMemberInvitations(workspaceSlug, originalMemberInvitations);
      throw error;
    }
  };

  /**
   * @description delete a member invitation
   * @param workspaceSlug
   * @param memberId
   */
  deleteMemberInvitation = async (workspaceSlug: string, invitationId: string) =>
    await this.workspaceService.deleteWorkspaceInvitations(workspaceSlug.toString(), invitationId).then(() => {
      this.store.deleteWorkspaceMemberInvitation(workspaceSlug, invitationId);
    });

  isUserSuspended = (userId: string, workspaceSlug: string) => {
    if (!workspaceSlug) return false;
    const workspaceMember = this.workspaceMemberMap?.[workspaceSlug]?.[userId];
    return workspaceMember?.is_active === false;
  };

  /**
   * @description generate fake members for development/testing (only works in DEBUG mode)
   * @param workspaceSlug
   * @param count - number of fake members to generate (1-50)
   */
  generateFakeMembers = async (workspaceSlug: string, count: number) => {
    const response = await this.workspaceService.generateFakeMembers(workspaceSlug, count);
    // Refresh the members list after generating fake users
    await this.fetchWorkspaceMembers(workspaceSlug);
    return response;
  };
}
