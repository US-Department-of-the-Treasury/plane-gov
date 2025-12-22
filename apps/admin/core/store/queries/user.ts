"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserService, AuthService } from "@plane/services";
import type { IUser } from "@plane/types";
import { queryKeys } from "./query-keys";

const userService = new UserService();
const authService = new AuthService();

/**
 * Hook to fetch the current admin user.
 * Replaces MobX UserStore.fetchCurrentUser.
 *
 * Note: The MobX store calls fetchInstanceAdmins after fetching the user.
 * Components should call useInstanceAdmins() separately if needed.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => userService.adminDetails(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    retry: false, // Don't retry on 401/403
  });
}

/**
 * Hook to handle sign out.
 * Returns a function that clears all user-related caches.
 * Replaces MobX UserStore.signOut.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return () => {
    // Clear all caches on sign out
    queryClient.removeQueries({ queryKey: queryKeys.users.me() });
    queryClient.removeQueries({ queryKey: queryKeys.instance.admins() });
    queryClient.removeQueries({ queryKey: queryKeys.instance.info() });
    queryClient.removeQueries({ queryKey: queryKeys.instance.configurations() });
    queryClient.removeQueries({ queryKey: queryKeys.workspaces.all() });
  };
}
