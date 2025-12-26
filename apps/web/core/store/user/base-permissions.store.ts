import { unset as lodashUnset } from "lodash-es";
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
import type { RootStore } from "@/plane-web/store/root.store";
// services
import projectMemberService from "@/services/project/project-member.service";
import userService from "@/services/user.service";

// derived services
const workspaceService = new WorkspaceService();

type ETempUserRole = TUserPermissions | EUserWorkspaceRoles | EUserProjectRoles; // TODO: Remove this once we have migrated user permissions to enums to plane constants package

export interface IBaseUserPermissionStore {
  loader: boolean;
  // observables
  workspaceUserInfo: Record<string, IWorkspaceMemberMe>; // workspaceSlug -> IWorkspaceMemberMe
  projectUserInfo: Record<string, Record<string, TProjectMembership>>; // workspaceSlug -> projectId -> TProjectMembership
  workspaceProjectsPermissions: Record<string, IUserProjectsRole>; // workspaceSlug -> IUserProjectsRole
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

// Zustand Store
interface BaseUserPermissionState {
  loader: boolean;
  workspaceUserInfo: Record<string, IWorkspaceMemberMe>;
  projectUserInfo: Record<string, Record<string, TProjectMembership>>;
  workspaceProjectsPermissions: Record<string, IUserProjectsRole>;
}

interface BaseUserPermissionActions {
  fetchUserWorkspaceInfo: (workspaceSlug: string) => Promise<IWorkspaceMemberMe>;
  leaveWorkspace: (workspaceSlug: string, store: RootStore) => Promise<void>;
  fetchUserProjectInfo: (workspaceSlug: string, projectId: string) => Promise<TProjectMembership>;
  fetchUserProjectPermissions: (workspaceSlug: string) => Promise<IUserProjectsRole>;
  joinProject: (
    workspaceSlug: string,
    projectId: string,
    getWorkspaceRoleByWorkspaceSlug: (slug: string) => TUserPermissions | EUserWorkspaceRoles | undefined,
    fetchWorkspaceLevelProjectEntities: (workspaceSlug: string, projectId: string) => void
  ) => Promise<void>;
  leaveProject: (workspaceSlug: string, projectId: string, store: RootStore) => Promise<void>;
}

type BaseUserPermissionStoreType = BaseUserPermissionState & BaseUserPermissionActions;

export const useBaseUserPermissionStore = create<BaseUserPermissionStoreType>()(
  immer((set, get) => ({
    // State
    loader: false,
    workspaceUserInfo: {},
    projectUserInfo: {},
    workspaceProjectsPermissions: {},

    // Actions
    fetchUserWorkspaceInfo: async (workspaceSlug) => {
      try {
        set((state) => {
          state.loader = true;
        });
        const response = await workspaceService.workspaceMemberMe(workspaceSlug);
        if (response) {
          set((state) => {
            // Direct property access for proper Zustand reactivity
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

    leaveWorkspace: async (workspaceSlug, store) => {
      try {
        await userService.leaveWorkspace(workspaceSlug);
        set((state) => {
          lodashUnset(state.workspaceUserInfo, workspaceSlug);
          lodashUnset(state.projectUserInfo, workspaceSlug);
          lodashUnset(state.workspaceProjectsPermissions, workspaceSlug);
        });
      } catch (error) {
        console.error("Error user leaving the workspace", error);
        throw error;
      }
    },

    fetchUserProjectInfo: async (workspaceSlug, projectId) => {
      try {
        const response = await projectMemberService.projectMemberMe(workspaceSlug, projectId);
        if (response) {
          set((state) => {
            // Direct property access for proper Zustand reactivity
            if (!state.projectUserInfo[workspaceSlug]) {
              state.projectUserInfo[workspaceSlug] = {};
            }
            state.projectUserInfo[workspaceSlug][projectId] = response;
            if (!state.workspaceProjectsPermissions[workspaceSlug]) {
              state.workspaceProjectsPermissions[workspaceSlug] = {};
            }
            state.workspaceProjectsPermissions[workspaceSlug][projectId] = response.role;
          });
        }
        return response;
      } catch (error) {
        console.error("Error fetching user project information", error);
        throw error;
      }
    },

    fetchUserProjectPermissions: async (workspaceSlug) => {
      try {
        const response = await workspaceService.getWorkspaceUserProjectsRole(workspaceSlug);
        set((state) => {
          // Direct property access for proper Zustand reactivity
          state.workspaceProjectsPermissions[workspaceSlug] = response;
        });
        return response;
      } catch (error) {
        console.error("Error fetching user project permissions", error);
        throw error;
      }
    },

    joinProject: async (workspaceSlug, projectId, getWorkspaceRoleByWorkspaceSlug, fetchWorkspaceLevelProjectEntities) => {
      try {
        const response = await userService.joinProject(workspaceSlug, [projectId]);
        const projectMemberRole = getWorkspaceRoleByWorkspaceSlug(workspaceSlug) ?? (EUserPermissions.MEMBER as EUserPermissions);
        if (response) {
          set((state) => {
            // Direct property access for proper Zustand reactivity
            if (!state.workspaceProjectsPermissions[workspaceSlug]) {
              state.workspaceProjectsPermissions[workspaceSlug] = {};
            }
            state.workspaceProjectsPermissions[workspaceSlug][projectId] = projectMemberRole;
          });
          void fetchWorkspaceLevelProjectEntities(workspaceSlug, projectId);
        }
      } catch (error) {
        console.error("Error user joining the project", error);
        throw error;
      }
    },

    leaveProject: async (workspaceSlug, projectId, store) => {
      try {
        await userService.leaveProject(workspaceSlug, projectId);
        set((state) => {
          // Direct property access for proper Zustand reactivity
          if (state.workspaceProjectsPermissions[workspaceSlug]) {
            delete state.workspaceProjectsPermissions[workspaceSlug][projectId];
          }
          if (state.projectUserInfo[workspaceSlug]) {
            delete state.projectUserInfo[workspaceSlug][projectId];
          }
        });
        // Also remove from project store
        delete store.projectRoot.project.projectMap[projectId];
      } catch (error) {
        console.error("Error user leaving the project", error);
        throw error;
      }
    },
  }))
);

/**
 * @description This store is used to handle permission layer for the currently logged user.
 * It manages workspace and project level permissions, roles and access control.
 */
export abstract class BaseUserPermissionStore implements IBaseUserPermissionStore {
  constructor(protected store: RootStore) {}

  protected get permissionStore() {
    return useBaseUserPermissionStore.getState();
  }

  get loader() {
    return this.permissionStore.loader;
  }

  get workspaceUserInfo() {
    return this.permissionStore.workspaceUserInfo;
  }

  get projectUserInfo() {
    return this.permissionStore.projectUserInfo;
  }

  get workspaceProjectsPermissions() {
    return this.permissionStore.workspaceProjectsPermissions;
  }

  // computed helpers
  /**
   * @description Returns the current workspace information
   * @param { string } workspaceSlug
   * @returns { IWorkspaceMemberMe | undefined }
   */
  workspaceInfoBySlug = (workspaceSlug: string): IWorkspaceMemberMe | undefined => {
    if (!workspaceSlug) return undefined;
    return this.workspaceUserInfo[workspaceSlug] || undefined;
  };

  /**
   * @description Returns the workspace role by slug
   * @param { string } workspaceSlug
   * @returns { TUserPermissions | EUserWorkspaceRoles | undefined }
   */
  getWorkspaceRoleByWorkspaceSlug = (workspaceSlug: string): TUserPermissions | EUserWorkspaceRoles | undefined => {
    if (!workspaceSlug) return undefined;
    return this.workspaceUserInfo[workspaceSlug]?.role as TUserPermissions | EUserWorkspaceRoles | undefined;
  };

  /**
   * @description Returns the project membership permission
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { EUserPermissions | undefined }
   */
  protected getProjectRole = (workspaceSlug: string, projectId?: string): EUserPermissions | undefined => {
    if (!workspaceSlug || !projectId) return undefined;
    const projectRole = this.workspaceProjectsPermissions?.[workspaceSlug]?.[projectId];
    if (!projectRole) return undefined;
    const workspaceRole = this.workspaceUserInfo?.[workspaceSlug]?.role;
    if (workspaceRole === EUserWorkspaceRoles.ADMIN) return EUserPermissions.ADMIN as EUserPermissions;
    else return projectRole as EUserPermissions;
  };

  /**
   * @description Returns the project permissions by workspace slug
   * @param { string } workspaceSlug
   * @returns { IUserProjectsRole }
   */
  getProjectRolesByWorkspaceSlug = (workspaceSlug: string): IUserProjectsRole => {
    const projectPermissions = this.workspaceProjectsPermissions[workspaceSlug] || {};
    return Object.keys(projectPermissions).reduce((acc, projectId) => {
      const projectRole = this.getProjectRoleByWorkspaceSlugAndProjectId(workspaceSlug, projectId);
      if (projectRole) {
        acc[projectId] = projectRole;
      }
      return acc;
    }, {} as IUserProjectsRole);
  };

  /**
   * @description Returns the current project permissions
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { EUserPermissions | undefined }
   */
  abstract getProjectRoleByWorkspaceSlugAndProjectId: (
    workspaceSlug: string,
    projectId?: string
  ) => EUserPermissions | undefined;

  /**
   * @description Fetches project-level entities that are not automatically loaded by the project wrapper.
   * This is used when joining a project to ensure all necessary workspace-level project data is available.
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { Promise<void> }
   */
  abstract fetchWorkspaceLevelProjectEntities: (workspaceSlug: string, projectId: string) => void;

  /**
   * @description Returns whether the user has the permission to access a page
   * @param { string } page
   * @returns { boolean }
   */
  hasPageAccess = (workspaceSlug: string, key: string): boolean => {
    if (!workspaceSlug || !key) return false;
    const settings = WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS.find((item) => item.key === key);
    if (settings) {
      return this.allowPermissions(settings.access, EUserPermissionsLevel.WORKSPACE, workspaceSlug);
    }
    return false;
  };

  // action helpers
  /**
   * @description Returns whether the user has the permission to perform an action
   * @param { TUserPermissions[] } allowPermissions
   * @param { TUserPermissionsLevel } level
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @param { () => boolean } onPermissionAllowed
   * @returns { boolean }
   */
  allowPermissions = (
    allowPermissions: ETempUserRole[],
    level: TUserPermissionsLevel,
    workspaceSlug?: string,
    projectId?: string,
    onPermissionAllowed?: () => boolean
  ): boolean => {
    const { workspaceSlug: currentWorkspaceSlug, projectId: currentProjectId } = this.store.router;
    if (!workspaceSlug) workspaceSlug = currentWorkspaceSlug;
    if (!projectId) projectId = currentProjectId;

    let currentUserRole: TUserPermissions | undefined = undefined;

    if (level === EUserPermissionsLevel.WORKSPACE) {
      currentUserRole = (workspaceSlug && this.getWorkspaceRoleByWorkspaceSlug(workspaceSlug)) as
        | EUserPermissions
        | undefined;
    }

    if (level === EUserPermissionsLevel.PROJECT) {
      currentUserRole = (workspaceSlug &&
        projectId &&
        this.getProjectRoleByWorkspaceSlugAndProjectId(workspaceSlug, projectId)) as EUserPermissions | undefined;
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
  };

  // actions
  /**
   * @description Fetches the user's workspace information
   * @param { string } workspaceSlug
   * @returns { Promise<IWorkspaceMemberMe | undefined> }
   */
  fetchUserWorkspaceInfo = async (workspaceSlug: string): Promise<IWorkspaceMemberMe> => {
    return this.permissionStore.fetchUserWorkspaceInfo(workspaceSlug);
  };

  /**
   * @description Leaves a workspace
   * @param { string } workspaceSlug
   * @returns { Promise<void | undefined> }
   */
  leaveWorkspace = async (workspaceSlug: string): Promise<void> => {
    return this.permissionStore.leaveWorkspace(workspaceSlug, this.store);
  };

  /**
   * @description Fetches the user's project information
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { Promise<TProjectMembership | undefined> }
   */
  fetchUserProjectInfo = async (workspaceSlug: string, projectId: string): Promise<TProjectMembership> => {
    return this.permissionStore.fetchUserProjectInfo(workspaceSlug, projectId);
  };

  /**
   * @description Fetches the user's project permissions
   * @param { string } workspaceSlug
   * @returns { Promise<IUserProjectsRole | undefined> }
   */
  fetchUserProjectPermissions = async (workspaceSlug: string): Promise<IUserProjectsRole> => {
    return this.permissionStore.fetchUserProjectPermissions(workspaceSlug);
  };

  /**
   * @description Joins a project
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { Promise<void> }
   */
  joinProject = async (workspaceSlug: string, projectId: string): Promise<void> => {
    return this.permissionStore.joinProject(
      workspaceSlug,
      projectId,
      this.getWorkspaceRoleByWorkspaceSlug,
      this.fetchWorkspaceLevelProjectEntities
    );
  };

  /**
   * @description Leaves a project
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { Promise<void> }
   */
  leaveProject = async (workspaceSlug: string, projectId: string): Promise<void> => {
    return this.permissionStore.leaveProject(workspaceSlug, projectId, this.store);
  };
}
