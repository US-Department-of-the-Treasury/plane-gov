import { cloneDeep, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { IUserTheme, TUserProfile } from "@plane/types";
import { EStartOfTheWeek } from "@plane/types";
// services
import { UserService } from "@/services/user.service";
// store
import type { CoreRootStore } from "../root.store";

type TError = {
  status: string;
  message: string;
};

export interface IUserProfileStore {
  // observables
  isLoading: boolean;
  error: TError | undefined;
  data: TUserProfile;
  // actions
  fetchUserProfile: () => Promise<TUserProfile | undefined>;
  updateUserProfile: (data: Partial<TUserProfile>) => Promise<TUserProfile | undefined>;
  finishUserOnboarding: () => Promise<void>;
  updateTourCompleted: () => Promise<TUserProfile | undefined>;
  updateUserTheme: (data: Partial<IUserTheme>) => Promise<TUserProfile | undefined>;
}

// Zustand Store
interface ProfileState {
  isLoading: boolean;
  error: TError | undefined;
  data: TUserProfile;
}

interface ProfileActions {
  mutateUserProfile: (data: Partial<TUserProfile>) => void;
  fetchUserProfile: (userService: UserService) => Promise<TUserProfile | undefined>;
  updateUserProfile: (userService: UserService, data: Partial<TUserProfile>) => Promise<TUserProfile | undefined>;
  finishUserOnboarding: (userService: UserService, store: CoreRootStore) => Promise<void>;
  updateTourCompleted: (userService: UserService) => Promise<TUserProfile | undefined>;
  updateUserTheme: (userService: UserService, data: Partial<IUserTheme>) => Promise<TUserProfile | undefined>;
}

type ProfileStoreType = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStoreType>()(
  immer((set, get) => ({
    // State
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

    // Actions
    mutateUserProfile: (data) => {
      if (!data) return;
      set((state) => {
        Object.entries(data).forEach(([key, value]) => {
          if (key in state.data) lodashSet(state.data, key, value);
        });
      });
    },

    fetchUserProfile: async (userService) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = undefined;
        });
        const userProfile = await userService.getCurrentUserProfile();
        set((state) => {
          state.isLoading = false;
          state.data = userProfile;
        });
        return userProfile;
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = {
            status: "user-profile-fetch-error",
            message: "Failed to fetch user profile",
          };
        });
        throw error;
      }
    },

    updateUserProfile: async (userService, data) => {
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
        set((state) => {
          state.error = {
            status: "user-profile-update-error",
            message: "Failed to update user profile",
          };
        });
      }
    },

    finishUserOnboarding: async (userService, store) => {
      try {
        const firstWorkspace = Object.values(store.workspaceRoot.workspaces ?? {})?.[0];
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
          get().fetchUserProfile(userService),
          store.user.userSettings.fetchCurrentUserSettings(true), // Cache-busting enabled
        ]);

        // Only after settings are refreshed, update the user profile store to mark as onboarded
        get().mutateUserProfile({ ...dataToUpdate, is_onboarded: true });
      } catch (error) {
        set((state) => {
          state.error = {
            status: "user-profile-onboard-finish-error",
            message: "Failed to finish user onboarding",
          };
        });
        throw error;
      }
    },

    updateTourCompleted: async (userService) => {
      const isUserProfileTourCompleted = get().data.is_tour_completed || false;
      try {
        get().mutateUserProfile({ is_tour_completed: true });
        const userProfile = await userService.updateUserTourCompleted();
        return userProfile;
      } catch (error) {
        set((state) => {
          state.error = {
            status: "user-profile-tour-complete-error",
            message: "Failed to update user profile is_tour_completed",
          };
        });
        get().mutateUserProfile({ is_tour_completed: isUserProfileTourCompleted });
        throw error;
      }
    },

    updateUserTheme: async (userService, data) => {
      const currentProfileTheme = cloneDeep(get().data.theme);
      try {
        set((state) => {
          Object.keys(data).forEach((key) => {
            const dataKey = key as keyof IUserTheme;
            if (state.data.theme) lodashSet(state.data.theme, dataKey, data[dataKey]);
          });
        });
        const userProfile = await userService.updateCurrentUserProfile({
          theme: get().data.theme,
        });
        return userProfile;
      } catch (error) {
        set((state) => {
          Object.keys(data).forEach((key: string) => {
            const userKey: keyof IUserTheme = key as keyof IUserTheme;
            if (currentProfileTheme) lodashSet(state.data.theme, userKey, currentProfileTheme[userKey]);
          });
          state.error = {
            status: "user-profile-theme-update-error",
            message: "Failed to update user profile theme",
          };
        });
        throw error;
      }
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class ProfileStore implements IUserProfileStore {
  userService: UserService;

  constructor(public store: CoreRootStore) {
    this.userService = new UserService();
  }

  private get profileStore() {
    return useProfileStore.getState();
  }

  get isLoading() {
    return this.profileStore.isLoading;
  }

  get error() {
    return this.profileStore.error;
  }

  get data() {
    return this.profileStore.data;
  }

  mutateUserProfile = (data: Partial<TUserProfile>) => this.profileStore.mutateUserProfile(data);

  fetchUserProfile = () => this.profileStore.fetchUserProfile(this.userService);

  updateUserProfile = (data: Partial<TUserProfile>) => this.profileStore.updateUserProfile(this.userService, data);

  finishUserOnboarding = () => this.profileStore.finishUserOnboarding(this.userService, this.store);

  updateTourCompleted = () => this.profileStore.updateTourCompleted(this.userService);

  updateUserTheme = (data: Partial<IUserTheme>) => this.profileStore.updateUserTheme(this.userService, data);
}
