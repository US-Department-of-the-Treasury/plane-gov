import { useContext } from "react";
// mobx store
import { StoreContext } from "@/lib/store-context";
// plane web imports
import type { IUserPermissionStore } from "@/plane-web/store/user/permission.store";

/**
 * Hook to access user permissions data.
 *
 * NOTE: This hook still uses MobX StoreContext as there is no TanStack Query
 * equivalent yet. A future migration will need to:
 * 1. Create permission-related queries in @/store/queries/user
 * 2. Implement allowPermissions, getWorkspaceRoleByWorkspaceSlug, etc. using TanStack Query
 * 3. Update this hook to use the new query-based approach
 *
 * @example
 * const { allowPermissions, getWorkspaceRoleByWorkspaceSlug } = useUserPermissions();
 * const canCreate = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
 */
export const useUserPermissions = (): IUserPermissionStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useUserPermissions must be used within StoreProvider");

  return context.user.permission;
};
