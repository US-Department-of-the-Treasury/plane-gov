import { unset, set } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { TUserPermissions, TUserPermissionsLevel } from "@plane/constants";
import {
  EUserPermissions,
  EUserPermissionsLevel,
  WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS,
} from "@plane/constants";
import type { EUserProjectRoles, IUserProjectsRole, IWorkspaceMemberMe, TProjectMembership } from "@plane/types";
import { EUserWorkspaceRoles } from "@plane/types";
// plane web imports
import { WorkspaceService } from "@/plane-web/services";
// services
import projectMemberService from "@/services/project/project-member.service";
import userService from "@/services/user.service";

// derived services
const workspaceService = new WorkspaceService();

type ETempUserRole = TUserPermissions | EUserWorkspaceRoles | EUserProjectRoles;

export interface IBaseUserPermissionStore {
  loader: boolean;
  // observables
  workspaceUserInfo: Record<string, IWorkspaceMemberMe>;
  projectUserInfo: Record<string, Record<string, TProjectMembership>>;
  workspaceProjectsPermissions: Record<string, IUserProjectsRole>;
  // computed helpers
  workspaceInfoBySlug: (workspaceSlug: string) => IWorkspaceMemberMe | undefined;
  getWorkspaceRoleByWorkspaceSlug: (workspaceSlug: string) => TUserPermissions | EUserWorkspaceRoles | undefined;
  getProjectRolesByWorkspaceSlug: (workspaceSlug: string) => IUserProjectsRole;
  getProjectRoleByWorkspaceSlugAndProjectId: (
    workspaceSlug: string,
    projectId?: string
  ) => EUserPermissions | undefined;
  fetchWorkspaceLevelProjectEntities: (workspaceSlug: string, projectId: string) => void;
  allowPermissions: (
    allowPermissions: ETempUserRole[],
    level: TUserPermissionsLevel,
    workspaceSlug?: string,
    projectId?: string,
    onPermissionAllowed?: () => boolean
  ) => boolean;
  // actions
  fetchUserWorkspaceInfo: (workspaceSlug: string) => Promise<IWorkspaceMemberMe>;
  leaveWorkspace: (workspaceSlug: string) => Promise<void>;
  fetchUserProjectInfo: (workspaceSlug: string, projectId: string) => Promise<TProjectMembership>;
  fetchUserProjectPermissions: (workspaceSlug: string) => Promise<IUserProjectsRole>;
  joinProject: (workspaceSlug: string, projectId: string) => Promise<void>;
  leaveProject: (workspaceSlug: string, projectId: string) => Promise<void>;
  hasPageAccess: (workspaceSlug: string, key: string) => boolean;
}

// State interface
interface BaseUserPermissionState {
  loader: boolean;
  workspaceUserInfo: Record<string, IWorkspaceMemberMe>;
  projectUserInfo: Record<string, Record<string, TProjectMembership>>;
  workspaceProjectsPermissions: Record<string, IUserProjectsRole>;
}

// Actions interface
interface BaseUserPermissionActions {
  // Computed helpers
  workspaceInfoBySlug: (workspaceSlug: string) => IWorkspaceMemberMe | undefined;
  getWorkspaceRoleByWorkspaceSlug: (workspaceSlug: string) => TUserPermissions | EUserWorkspaceRoles | undefined;
  getProjectRole: (workspaceSlug: string, projectId?: string) => EUserPermissions | undefined;
  getProjectRolesByWorkspaceSlug: (workspaceSlug: string) => IUserProjectsRole;
  hasPageAccess: (workspaceSlug: string, key: string, routerStore?: { workspaceSlug?: string; projectId?: string }) => boolean;
  allowPermissions: (
    allowPermissions: ETempUserRole[],
    level: TUserPermissionsLevel,
    routerStore?: { workspaceSlug?: string; projectId?: string },
    workspaceSlug?: string,
    projectId?: string,
    onPermissionAllowed?: () => boolean
  ) => boolean;
  // Direct state update actions (for optimistic updates)
  setProjectPermission: (workspaceSlug: string, projectId: string, role: EUserPermissions | EUserProjectRoles) => void;
  setProjectUserInfoRole: (workspaceSlug: string, projectId: string, role: EUserPermissions | EUserProjectRoles) => void;
  removeProjectPermission: (workspaceSlug: string, projectId: string) => void;
  // Actions
  fetchUserWorkspaceInfo: (workspaceSlug: string) => Promise<IWorkspaceMemberMe>;
  leaveWorkspace: (workspaceSlug: string) => Promise<void>;
  fetchUserProjectInfo: (workspaceSlug: string, projectId: string) => Promise<TProjectMembership>;
  fetchUserProjectPermissions: (workspaceSlug: string) => Promise<IUserProjectsRole>;
  joinProject: (
    workspaceSlug: string,
    projectId: string,
    fetchWorkspaceLevelProjectEntities: (workspaceSlug: string, projectId: string) => void
  ) => Promise<void>;
  leaveProject: (
    workspaceSlug: string,
    projectId: string,
    projectStore?: { projectMap: Record<string, any> }
  ) => Promise<void>;
}

export type BaseUserPermissionStoreType = BaseUserPermissionState & BaseUserPermissionActions;

const initialState: BaseUserPermissionState = {
  loader: false,
  workspaceUserInfo: {},
  projectUserInfo: {},
  workspaceProjectsPermissions: {},
};

/**
 * Base User Permission Store (Zustand)
 *
 * Manages workspace and project level permissions, roles and access control.
 * Migrated from MobX BaseUserPermissionStore to Zustand.
 */
export const useBaseUserPermissionStore = create<BaseUserPermissionStoreType>()(
  immer((set, get) => ({
    ...initialState,

    // Computed helpers
    workspaceInfoBySlug: (workspaceSlug: string) => {
      if (!workspaceSlug) return undefined;
      return get().workspaceUserInfo[workspaceSlug] || undefined;
    },

    getWorkspaceRoleByWorkspaceSlug: (workspaceSlug: string) => {
      if (!workspaceSlug) return undefined;
      return get().workspaceUserInfo[workspaceSlug]?.role as TUserPermissions | EUserWorkspaceRoles | undefined;
    },

    getProjectRole: (workspaceSlug: string, projectId?: string) => {
      if (!workspaceSlug || !projectId) return undefined;
      const projectRole = get().workspaceProjectsPermissions?.[workspaceSlug]?.[projectId];
      if (!projectRole) return undefined;
      const workspaceRole = get().workspaceUserInfo?.[workspaceSlug]?.role;
      if (workspaceRole === EUserWorkspaceRoles.ADMIN) return EUserPermissions.ADMIN;
      else return projectRole;
    },

    getProjectRolesByWorkspaceSlug: (workspaceSlug: string) => {
      const projectPermissions = get().workspaceProjectsPermissions[workspaceSlug] || {};
      return Object.keys(projectPermissions).reduce((acc, projectId) => {
        const projectRole = get().getProjectRole(workspaceSlug, projectId);
        if (projectRole) {
          acc[projectId] = projectRole;
        }
        return acc;
      }, {} as IUserProjectsRole);
    },

    hasPageAccess: (workspaceSlug: string, key: string, routerStore?: { workspaceSlug?: string; projectId?: string }) => {
      if (!workspaceSlug || !key) return false;
      const settings = WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS.find((item) => item.key === key);
      if (settings) {
        return get().allowPermissions(settings.access, EUserPermissionsLevel.WORKSPACE, routerStore, workspaceSlug);
      }
      return false;
    },

    allowPermissions: (
      allowPermissions: ETempUserRole[],
      level: TUserPermissionsLevel,
      routerStore?: { workspaceSlug?: string; projectId?: string },
      workspaceSlug?: string,
      projectId?: string,
      onPermissionAllowed?: () => boolean
    ) => {
      if (routerStore) {
        if (!workspaceSlug) workspaceSlug = routerStore.workspaceSlug;
        if (!projectId) projectId = routerStore.projectId;
      }

      let currentUserRole: TUserPermissions | undefined = undefined;

      if (level === EUserPermissionsLevel.WORKSPACE) {
        currentUserRole = (workspaceSlug && get().getWorkspaceRoleByWorkspaceSlug(workspaceSlug)) as
          | EUserPermissions
          | undefined;
      }

      if (level === EUserPermissionsLevel.PROJECT) {
        currentUserRole = (workspaceSlug && projectId && get().getProjectRole(workspaceSlug, projectId)) as
          | EUserPermissions
          | undefined;
      }

      if (typeof currentUserRole === "string") {
        currentUserRole = parseInt(currentUserRole);
      }

      if (currentUserRole && typeof currentUserRole === "number" && allowPermissions.includes(currentUserRole)) {
        if (onPermissionAllowed) {
          return onPermissionAllowed();
        } else {
          return true;
        }
      }

      return false;
    },

    // Direct state update actions (for optimistic updates)
    setProjectPermission: (workspaceSlug: string, projectId: string, role: EUserPermissions | EUserProjectRoles) => {
      set((state) => {
        if (!state.workspaceProjectsPermissions[workspaceSlug]) {
          state.workspaceProjectsPermissions[workspaceSlug] = {};
        }
        state.workspaceProjectsPermissions[workspaceSlug][projectId] = role as EUserPermissions;
      });
    },

    setProjectUserInfoRole: (workspaceSlug: string, projectId: string, role: EUserPermissions | EUserProjectRoles) => {
      set((state) => {
        if (!state.projectUserInfo[workspaceSlug]) {
          state.projectUserInfo[workspaceSlug] = {};
        }
        if (!state.projectUserInfo[workspaceSlug][projectId]) {
          state.projectUserInfo[workspaceSlug][projectId] = {} as TProjectMembership;
        }
        state.projectUserInfo[workspaceSlug][projectId].role = role as any;
      });
    },

    removeProjectPermission: (workspaceSlug: string, projectId: string) => {
      set((state) => {
        if (state.workspaceProjectsPermissions[workspaceSlug]) {
          delete state.workspaceProjectsPermissions[workspaceSlug][projectId];
        }
      });
    },

    // Actions
    fetchUserWorkspaceInfo: async (workspaceSlug: string) => {
      try {
        set((state) => {
          state.loader = true;
        });
        const response = await workspaceService.workspaceMemberMe(workspaceSlug);
        if (response) {
          set((state) => {
            state.workspaceUserInfo[workspaceSlug] = response;
            state.loader = false;
          });
        }
        return response;
      } catch (error) {
        console.error("Error fetching user workspace information", error);
        set((state) => {
          state.loader = false;
        });
        throw error;
      }
    },

    leaveWorkspace: async (workspaceSlug: string) => {
      try {
        await userService.leaveWorkspace(workspaceSlug);
        set((state) => {
          delete state.workspaceUserInfo[workspaceSlug];
          delete state.projectUserInfo[workspaceSlug];
          delete state.workspaceProjectsPermissions[workspaceSlug];
        });
      } catch (error) {
        console.error("Error user leaving the workspace", error);
        throw error;
      }
    },

    fetchUserProjectInfo: async (workspaceSlug: string, projectId: string) => {
      try {
        const response = await projectMemberService.projectMemberMe(workspaceSlug, projectId);
        if (response) {
          set((state) => {
            if (!state.projectUserInfo[workspaceSlug]) {
              state.projectUserInfo[workspaceSlug] = {};
            }
            state.projectUserInfo[workspaceSlug][projectId] = response;
            if (!state.workspaceProjectsPermissions[workspaceSlug]) {
              state.workspaceProjectsPermissions[workspaceSlug] = {};
            }
            state.workspaceProjectsPermissions[workspaceSlug][projectId] = response.role as EUserPermissions;
          });
        }
        return response;
      } catch (error) {
        console.error("Error fetching user project information", error);
        throw error;
      }
    },

    fetchUserProjectPermissions: async (workspaceSlug: string) => {
      try {
        const response = await workspaceService.getWorkspaceUserProjectsRole(workspaceSlug);
        set((state) => {
          state.workspaceProjectsPermissions[workspaceSlug] = response;
        });
        return response;
      } catch (error) {
        console.error("Error fetching user project permissions", error);
        throw error;
      }
    },

    joinProject: async (
      workspaceSlug: string,
      projectId: string,
      fetchWorkspaceLevelProjectEntities: (workspaceSlug: string, projectId: string) => void
    ) => {
      try {
        const response = await userService.joinProject(workspaceSlug, [projectId]);
        const projectMemberRole =
          get().getWorkspaceRoleByWorkspaceSlug(workspaceSlug) ?? EUserPermissions.MEMBER;
        if (response) {
          set((state) => {
            if (!state.workspaceProjectsPermissions[workspaceSlug]) {
              state.workspaceProjectsPermissions[workspaceSlug] = {};
            }
            state.workspaceProjectsPermissions[workspaceSlug][projectId] = projectMemberRole as EUserPermissions;
          });
          void fetchWorkspaceLevelProjectEntities(workspaceSlug, projectId);
        }
      } catch (error) {
        console.error("Error user joining the project", error);
        throw error;
      }
    },

    leaveProject: async (
      workspaceSlug: string,
      projectId: string,
      projectStore?: { projectMap: Record<string, any> }
    ) => {
      try {
        await userService.leaveProject(workspaceSlug, projectId);
        set((state) => {
          if (state.workspaceProjectsPermissions[workspaceSlug]) {
            delete state.workspaceProjectsPermissions[workspaceSlug][projectId];
          }
          if (state.projectUserInfo[workspaceSlug]) {
            delete state.projectUserInfo[workspaceSlug][projectId];
          }
          if (projectStore?.projectMap) {
            delete projectStore.projectMap[projectId];
          }
        });
      } catch (error) {
        console.error("Error user leaving the project", error);
        throw error;
      }
    },
  }))
);

/**
 * Legacy abstract class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useBaseUserPermissionStore hook directly in React components
 */
export abstract class BaseUserPermissionStore implements IBaseUserPermissionStore {
  loader: boolean = false;
  workspaceUserInfo: Record<string, IWorkspaceMemberMe> = {};
  projectUserInfo: Record<string, Record<string, TProjectMembership>> = {};
  workspaceProjectsPermissions: Record<string, IUserProjectsRole> = {};

  protected abstract store: any;

  constructor(protected rootStore: any) {}

  // Sync getters from Zustand store
  private syncFromZustand() {
    const state = useBaseUserPermissionStore.getState();
    this.loader = state.loader;
    this.workspaceUserInfo = state.workspaceUserInfo;
    this.projectUserInfo = state.projectUserInfo;
    this.workspaceProjectsPermissions = state.workspaceProjectsPermissions;
  }

  // Computed helpers
  workspaceInfoBySlug = (workspaceSlug: string): IWorkspaceMemberMe | undefined => {
    this.syncFromZustand();
    return useBaseUserPermissionStore.getState().workspaceInfoBySlug(workspaceSlug);
  };

  getWorkspaceRoleByWorkspaceSlug = (workspaceSlug: string): TUserPermissions | EUserWorkspaceRoles | undefined => {
    this.syncFromZustand();
    return useBaseUserPermissionStore.getState().getWorkspaceRoleByWorkspaceSlug(workspaceSlug);
  };

  protected getProjectRole = (workspaceSlug: string, projectId?: string): EUserPermissions | undefined => {
    this.syncFromZustand();
    return useBaseUserPermissionStore.getState().getProjectRole(workspaceSlug, projectId);
  };

  getProjectRolesByWorkspaceSlug = (workspaceSlug: string): IUserProjectsRole => {
    this.syncFromZustand();
    return useBaseUserPermissionStore.getState().getProjectRolesByWorkspaceSlug(workspaceSlug);
  };

  abstract getProjectRoleByWorkspaceSlugAndProjectId: (
    workspaceSlug: string,
    projectId?: string
  ) => EUserPermissions | undefined;

  abstract fetchWorkspaceLevelProjectEntities: (workspaceSlug: string, projectId: string) => void;

  hasPageAccess = (workspaceSlug: string, key: string): boolean => {
    this.syncFromZustand();
    return useBaseUserPermissionStore.getState().hasPageAccess(workspaceSlug, key, this.store?.router);
  };

  allowPermissions = (
    allowPermissions: ETempUserRole[],
    level: TUserPermissionsLevel,
    workspaceSlug?: string,
    projectId?: string,
    onPermissionAllowed?: () => boolean
  ): boolean => {
    this.syncFromZustand();
    return useBaseUserPermissionStore
      .getState()
      .allowPermissions(allowPermissions, level, this.store?.router, workspaceSlug, projectId, onPermissionAllowed);
  };

  // Actions
  fetchUserWorkspaceInfo = async (workspaceSlug: string): Promise<IWorkspaceMemberMe> => {
    const result = await useBaseUserPermissionStore.getState().fetchUserWorkspaceInfo(workspaceSlug);
    this.syncFromZustand();
    return result;
  };

  leaveWorkspace = async (workspaceSlug: string): Promise<void> => {
    await useBaseUserPermissionStore.getState().leaveWorkspace(workspaceSlug);
    this.syncFromZustand();
  };

  fetchUserProjectInfo = async (workspaceSlug: string, projectId: string): Promise<TProjectMembership> => {
    const result = await useBaseUserPermissionStore.getState().fetchUserProjectInfo(workspaceSlug, projectId);
    this.syncFromZustand();
    return result;
  };

  fetchUserProjectPermissions = async (workspaceSlug: string): Promise<IUserProjectsRole> => {
    const result = await useBaseUserPermissionStore.getState().fetchUserProjectPermissions(workspaceSlug);
    this.syncFromZustand();
    return result;
  };

  joinProject = async (workspaceSlug: string, projectId: string): Promise<void> => {
    await useBaseUserPermissionStore
      .getState()
      .joinProject(workspaceSlug, projectId, this.fetchWorkspaceLevelProjectEntities.bind(this));
    this.syncFromZustand();
  };

  leaveProject = async (workspaceSlug: string, projectId: string): Promise<void> => {
    await useBaseUserPermissionStore
      .getState()
      .leaveProject(workspaceSlug, projectId, this.store?.projectRoot?.project);
    this.syncFromZustand();
  };
}
