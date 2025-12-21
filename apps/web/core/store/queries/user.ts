"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IUser } from "@plane/types";
import { UserService } from "@/services/user.service";
import { queryKeys } from "./query-keys";

// Service instance
const userService = new UserService();

/**
 * Fetch current user data
 */
async function fetchCurrentUser(): Promise<IUser> {
  const user = await userService.currentUser();
  return user;
}

/**
 * Update current user data
 */
async function updateUser(data: Partial<IUser>): Promise<IUser> {
  const user = (await userService.updateUser(data)) as IUser;
  return user;
}

/**
 * Hook to fetch and cache current user data.
 * Replaces MobX UserStore.fetchCurrentUser for read operations.
 *
 * @example
 * const { data: user, isLoading, error } = useCurrentUser();
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error && typeof error === "object" && "status" in error) {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403) return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to update current user data with optimistic updates.
 * Replaces MobX UserStore.updateCurrentUser for write operations.
 *
 * @example
 * const { mutate: updateUser, isPending } = useUpdateCurrentUser();
 * updateUser({ first_name: "John" });
 */
export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.users.me() });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData<IUser>(queryKeys.users.me());

      // Optimistically update
      if (previousUser) {
        queryClient.setQueryData<IUser>(queryKeys.users.me(), {
          ...previousUser,
          ...newData,
        });
      }

      return { previousUser };
    },
    // Rollback on error
    onError: (_error, _newData, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.users.me(), context.previousUser);
      }
    },
    // Refetch after mutation settles
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}

/**
 * Hook to fetch current user settings.
 *
 * @example
 * const { data: settings, isLoading } = useCurrentUserSettings();
 */
export function useCurrentUserSettings() {
  return useQuery({
    queryKey: queryKeys.users.settings(),
    queryFn: () => userService.currentUserSettings(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch current user profile.
 *
 * @example
 * const { data: profile, isLoading } = useCurrentUserProfile();
 */
export function useCurrentUserProfile() {
  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => userService.getCurrentUserProfile(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to update current user profile.
 *
 * @example
 * const { mutate: updateProfile, isPending } = useUpdateCurrentUserProfile();
 * updateProfile({ bio: "Software Engineer" });
 */
export function useUpdateCurrentUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IUser>) => userService.updateCurrentUserProfile(data),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me() });
    },
  });
}
