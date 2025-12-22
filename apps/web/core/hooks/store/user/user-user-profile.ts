"use client";

import { useCurrentUserProfile, useUpdateCurrentUserProfile, useFinishUserOnboarding } from "@/store/queries/user";
import type { TUserProfile, IUserTheme } from "@plane/types";

/**
 * Hook to access current user profile data and mutations.
 * Migrated from MobX to TanStack Query.
 *
 * @example
 * // Query only:
 * const { data: profile, isLoading, error } = useUserProfile();
 *
 * // With mutations:
 * const { data: profile, updateUserProfile, updateUserTheme, finishUserOnboarding } = useUserProfile();
 * updateUserProfile({ role: "Developer" });
 */
export const useUserProfile = () => {
  const query = useCurrentUserProfile();
  const { mutateAsync: updateProfile } = useUpdateCurrentUserProfile();
  const { mutateAsync: finishOnboarding } = useFinishUserOnboarding();

  return {
    ...query,
    // Provide mutation methods for backward compatibility
    updateUserProfile: (data: Partial<TUserProfile>) => {
      return updateProfile(data);
    },
    updateUserTheme: (data: Partial<IUserTheme>) => {
      return updateProfile({ theme: data as IUserTheme });
    },
    updateTourCompleted: () => {
      return updateProfile({ is_tour_completed: true });
    },
    finishUserOnboarding: () => {
      return finishOnboarding();
    },
  };
};

/**
 * Hook to get the update mutation directly.
 *
 * @example
 * const { mutate: updateProfile, isPending } = useUpdateUserProfile();
 * updateProfile({ bio: "Software Engineer" });
 */
export const useUpdateUserProfile = () => {
  return useUpdateCurrentUserProfile();
};
