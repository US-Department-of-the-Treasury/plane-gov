import { cloneDeep, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import type { IUserTheme, TUserProfile } from "@plane/types";
import { EStartOfTheWeek } from "@plane/types";
import { UserService } from "@/services/user.service";

type TError = {
  status: string;
  message: string;
};

// State interface
interface UserProfileStoreState {
  isLoading: boolean;
  error: TError | undefined;
  data: TUserProfile;
}

// Actions interface
interface UserProfileStoreActions {
  // Helper action
  mutateUserProfile: (data: Partial<TUserProfile>) => void;
  // Public actions
  fetchUserProfile: () => Promise<TUserProfile | undefined>;
  updateUserProfile: (data: Partial<TUserProfile>) => Promise<TUserProfile | undefined>;
  finishUserOnboarding: (rootStore: {
    workspaceRoot: { workspaces: Record<string, any> | undefined };
    user: { userSettings: { fetchCurrentUserSettings: (cacheBust?: boolean) => Promise<any> } };
  }) => Promise<void>;
  updateTourCompleted: () => Promise<TUserProfile | undefined>;
  updateUserTheme: (data: Partial<IUserTheme>) => Promise<TUserProfile | undefined>;
}

// Combined type export
export type UserProfileStore = UserProfileStoreState & UserProfileStoreActions;

// Legacy interface for backward compatibility
export interface IUserProfileStore {
  isLoading: boolean;
  error: TError | undefined;
  data: TUserProfile;
  fetchUserProfile: () => Promise<TUserProfile | undefined>;
  updateUserProfile: (data: Partial<TUserProfile>) => Promise<TUserProfile | undefined>;
  finishUserOnboarding: () => Promise<void>;
  updateTourCompleted: () => Promise<TUserProfile | undefined>;
  updateUserTheme: (data: Partial<IUserTheme>) => Promise<TUserProfile | undefined>;
}

// Initial state
const initialState: UserProfileStoreState = {
  isLoading: false,
  error: undefined,
  data: {
    id: undefined,
    user: undefined,
    role: undefined,
    last_workspace_id: undefined,
    theme: {
      theme: undefined,
      primary: undefined,
      background: undefined,
      darkPalette: false,
    },
    onboarding_step: {
      workspace_join: false,
      profile_complete: false,
      workspace_create: false,
      workspace_invite: false,
    },
    is_onboarded: false,
    is_tour_completed: false,
    use_case: undefined,
    billing_address_country: undefined,
    billing_address: undefined,
    has_billing_address: false,
    has_marketing_email_consent: false,
    created_at: "",
    updated_at: "",
    language: "",
    start_of_the_week: EStartOfTheWeek.SUNDAY,
  },
};

// Service instance
const userService = new UserService();

// Zustand store
export const useUserProfileStore = create<UserProfileStore>()((set, get) => ({
  ...initialState,

  // Helper action
  mutateUserProfile: (data) => {
    if (!data) return;
    set((state) => {
      const newData = { ...state.data };
      Object.entries(data).forEach(([key, value]) => {
        if (key in newData) lodashSet(newData, key, value);
      });
      return { data: newData };
    });
  },

  /**
   * @description fetches user profile information
   * @returns {Promise<TUserProfile | undefined>}
   */
  fetchUserProfile: async () => {
    try {
      set({ isLoading: true, error: undefined });
      const userProfile = await userService.getCurrentUserProfile();
      set({ isLoading: false, data: userProfile });
      return userProfile;
    } catch (error) {
      set({
        isLoading: false,
        error: {
          status: "user-profile-fetch-error",
          message: "Failed to fetch user profile",
        },
      });
      throw error;
    }
  },

  /**
   * @description updated the user profile information
   * @param {Partial<TUserProfile>} data
   * @returns {Promise<TUserProfile | undefined>}
   */
  updateUserProfile: async (data) => {
    const currentUserProfileData = get().data;
    try {
      if (currentUserProfileData) {
        get().mutateUserProfile(data);
      }
      const userProfile = await userService.updateCurrentUserProfile(data);
      return userProfile;
    } catch {
      if (currentUserProfileData) {
        get().mutateUserProfile(currentUserProfileData);
      }
      set({
        error: {
          status: "user-profile-update-error",
          message: "Failed to update user profile",
        },
      });
    }
  },

  /**
   * @description finishes the user onboarding
   * @returns { void }
   */
  finishUserOnboarding: async (rootStore) => {
    try {
      const firstWorkspace = Object.values(rootStore.workspaceRoot.workspaces ?? {})?.[0];
      const dataToUpdate: Partial<TUserProfile> = {
        onboarding_step: {
          profile_complete: true,
          workspace_join: true,
          workspace_create: true,
          workspace_invite: true,
        },
        last_workspace_id: firstWorkspace?.id,
      };

      // update user onboarding steps
      await userService.updateCurrentUserProfile(dataToUpdate);

      // update user onboarding status
      await userService.updateUserOnBoard();

      // Wait for user settings to be refreshed with cache-busting before updating onboarding status
      await Promise.all([
        get().fetchUserProfile(),
        rootStore.user.userSettings.fetchCurrentUserSettings(true), // Cache-busting enabled
      ]);

      // Only after settings are refreshed, update the user profile store to mark as onboarded
      get().mutateUserProfile({ ...dataToUpdate, is_onboarded: true });
    } catch (error) {
      set({
        error: {
          status: "user-profile-onboard-finish-error",
          message: "Failed to finish user onboarding",
        },
      });
      throw error;
    }
  },

  /**
   * @description updates the user tour completed status
   * @returns @returns {Promise<TUserProfile | undefined>}
   */
  updateTourCompleted: async () => {
    const isUserProfileTourCompleted = get().data.is_tour_completed || false;
    try {
      get().mutateUserProfile({ is_tour_completed: true });
      const userProfile = await userService.updateUserTourCompleted();
      return userProfile;
    } catch (error) {
      get().mutateUserProfile({ is_tour_completed: isUserProfileTourCompleted });
      set({
        error: {
          status: "user-profile-tour-complete-error",
          message: "Failed to update user profile is_tour_completed",
        },
      });
      throw error;
    }
  },

  /**
   * @description updates the user theme
   * @returns @returns {Promise<TUserProfile | undefined>}
   */
  updateUserTheme: async (data) => {
    const currentProfileTheme = cloneDeep(get().data.theme);
    try {
      set((state) => {
        const newData = { ...state.data };
        const newTheme = { ...newData.theme };
        Object.keys(data).forEach((key) => {
          const dataKey = key as keyof IUserTheme;
          lodashSet(newTheme, dataKey, data[dataKey]);
        });
        newData.theme = newTheme;
        return { data: newData };
      });
      const userProfile = await userService.updateCurrentUserProfile({
        theme: get().data.theme,
      });
      return userProfile;
    } catch (error) {
      set((state) => {
        const newData = { ...state.data };
        const newTheme = { ...newData.theme };
        Object.keys(data).forEach((key: string) => {
          const userKey: keyof IUserTheme = key as keyof IUserTheme;
          if (currentProfileTheme) lodashSet(newTheme, userKey, currentProfileTheme[userKey]);
        });
        newData.theme = newTheme;
        return {
          data: newData,
          error: {
            status: "user-profile-theme-update-error",
            message: "Failed to update user profile theme",
          },
        };
      });
      throw error;
    }
  },
}));

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useUserProfileStore hook or useUserProfile() from hooks/store
 */
export class ProfileStore implements IUserProfileStore {
  private rootStore: {
    workspaceRoot: { workspaces: Record<string, any> | undefined };
    user: { userSettings: { fetchCurrentUserSettings: (cacheBust?: boolean) => Promise<any> } };
  };

  constructor(
    rootStore: {
      workspaceRoot: { workspaces: Record<string, any> | undefined };
      user: { userSettings: { fetchCurrentUserSettings: (cacheBust?: boolean) => Promise<any> } };
    }
  ) {
    this.rootStore = rootStore;
  }

  get isLoading() {
    return useUserProfileStore.getState().isLoading;
  }

  get error() {
    return useUserProfileStore.getState().error;
  }

  get data() {
    return useUserProfileStore.getState().data;
  }

  fetchUserProfile = () => useUserProfileStore.getState().fetchUserProfile();

  updateUserProfile = (data: Partial<TUserProfile>) => useUserProfileStore.getState().updateUserProfile(data);

  finishUserOnboarding = () => useUserProfileStore.getState().finishUserOnboarding(this.rootStore);

  updateTourCompleted = () => useUserProfileStore.getState().updateTourCompleted();

  updateUserTheme = (data: Partial<IUserTheme>) => useUserProfileStore.getState().updateUserTheme(data);
}
