"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserService } from "@plane/services";
import type { IUser, ActorDetail } from "@plane/types";
import { queryKeys } from "./query-keys";

const userService = new UserService();

/**
 * Hook to fetch the current user.
 * Replaces MobX UserStore.fetchCurrentUser.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: () => userService.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    retry: false, // Don't retry on 401
  });
}

/**
 * Hook to update the current user.
 */
export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<IUser>) => userService.update(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.users.me(), updatedUser);
    },
  });
}

/**
 * Utility to compute the current actor from user data.
 */
export function computeCurrentActor(user: IUser | undefined): ActorDetail {
  return {
    id: user?.id,
    first_name: user?.first_name,
    last_name: user?.last_name,
    display_name: user?.display_name,
    avatar_url: user?.avatar_url || undefined,
    is_bot: false,
  };
}

/**
 * Hook to handle sign out.
 * Returns a function that clears all user-related caches.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return () => {
    // Clear user cache on sign out
    queryClient.removeQueries({ queryKey: queryKeys.users.me() });
  };
}
