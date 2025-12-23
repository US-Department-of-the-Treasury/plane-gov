import type { EUserPermissions } from "@plane/constants";
import type { RootStore } from "@/plane-web/store/root.store";
import { BaseUserPermissionStore } from "@/store/user/base-permissions.store";
import type { IBaseUserPermissionStore } from "@/store/user/base-permissions.store";

export type IUserPermissionStore = IBaseUserPermissionStore;

export class UserPermissionStore extends BaseUserPermissionStore implements IUserPermissionStore {
  constructor(store: RootStore) {
    super(store);
  }

  /**
   * @description Returns the project role from the workspace
   * @param { string } workspaceSlug
   * @param { string } projectId
   * @returns { EUserPermissions | undefined }
   */
  getProjectRoleByWorkspaceSlugAndProjectId = (workspaceSlug: string, projectId?: string): EUserPermissions | undefined =>
    this.getProjectRole(workspaceSlug, projectId);

  fetchWorkspaceLevelProjectEntities = (workspaceSlug: string, projectId: string): void => {
    void this.store.projectRoot.project.fetchProjectDetails(workspaceSlug, projectId);
  };
}
