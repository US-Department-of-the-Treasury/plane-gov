"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { API_BASE_URL, EUserPermissions } from "@plane/constants";
import type { IUser, TUserPermissions } from "@plane/types";
import { useCurrentUser, useUpdateCurrentUser, useCurrentUserProfile } from "@/store/queries/user";
import { AuthService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { useUserPermissions } from "./user-permissions";

// Service instances
const authService = new AuthService();
const userService = new UserService();

/**
 * Hook to access current user data and mutations.
 * Migrated from MobX to TanStack Query.
 *
 * @example
 * // Query only:
 * const { data: user, isLoading, error } = useUser();
 *
 * // With mutations:
 * const { data: user, updateCurrentUser, signOut } = useUser();
 * updateCurrentUser({ first_name: "John" });
 *
 * // With user profile:
 * const { data: user, userProfile } = useUser();
 * console.log(userProfile.data); // Access user profile data
 *
 * // With permissions:
 * const { permission, canPerformAnyCreateAction, projectsWithCreatePermissions } = useUser();
 */
export const useUser = () => {
  const query = useCurrentUser();
  const { mutateAsync: updateUser } = useUpdateCurrentUser();
  const { workspaceSlug } = useParams();
  const permission = useUserPermissions();
  const { getProjectRolesByWorkspaceSlug } = permission;

  // Get user profile query for backward compatibility
  const userProfile = useCurrentUserProfile();

  // Compute projects with create permissions
  const projectsWithCreatePermissions = useMemo(() => {
    if (!workspaceSlug || typeof workspaceSlug !== "string") return null;

    const allWorkspaceProjectRoles = getProjectRolesByWorkspaceSlug(workspaceSlug);

    const userPermissions =
      (allWorkspaceProjectRoles &&
        Object.keys(allWorkspaceProjectRoles)
          .filter((key) => allWorkspaceProjectRoles[key] >= EUserPermissions.MEMBER)
          .reduce(
            (res: { [projectId: string]: number }, key: string) => ((res[key] = allWorkspaceProjectRoles[key]), res),
            {}
          )) ||
      null;

    return userPermissions;
  }, [workspaceSlug, getProjectRolesByWorkspaceSlug]);

  // Compute if user can perform any create action
  const canPerformAnyCreateAction = useMemo(() => {
    return projectsWithCreatePermissions ? Object.keys(projectsWithCreatePermissions).length > 0 : false;
  }, [projectsWithCreatePermissions]);

  return {
    ...query,
    // Provide mutation methods for backward compatibility
    fetchCurrentUser: () => {
      query.refetch();
    },
    updateCurrentUser: (data: Partial<IUser>) => {
      return updateUser(data);
    },
    signOut: async () => {
      await authService.signOut(API_BASE_URL);
    },
    changePassword: async (csrfToken: string, payload: { old_password?: string; new_password: string }) => {
      return userService.changePassword(csrfToken, payload);
    },
    deactivateAccount: async () => {
      await userService.deactivateAccount();
      // Note: Store reset logic needs to be handled elsewhere
    },
    handleSetPassword: async (csrfToken: string, data: { password: string }) => {
      return authService.setPassword(csrfToken, data);
    },
    // Computed properties for permissions
    canPerformAnyCreateAction,
    projectsWithCreatePermissions,
    // Additional query results for backward compatibility
    userProfile,
    permission,
  };
};

/**
 * Hook to get the update mutation directly.
 *
 * @example
 * const { mutate: updateUser, isPending } = useUpdateUser();
 * updateUser({ first_name: "John" });
 */
export const useUpdateUser = () => {
  return useUpdateCurrentUser();
};
