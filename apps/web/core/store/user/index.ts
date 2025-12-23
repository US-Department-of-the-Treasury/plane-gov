import { cloneDeep, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import { EUserPermissions, API_BASE_URL } from "@plane/constants";
import type { IUser, TUserPermissions } from "@plane/types";
// plane web imports
import type { RootStore } from "@/plane-web/store/root.store";
import type { IUserPermissionStore } from "@/plane-web/store/user/permission.store";
import { UserPermissionStore } from "@/plane-web/store/user/permission.store";
// services
import { AuthService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
// stores
import type { IAccountStore } from "@/store/user/account.store";
import type { IUserProfileStore } from "@/store/user/profile.store";
import { ProfileStore } from "@/store/user/profile.store";
// local imports
import type { IUserSettingsStore } from "./settings.store";
import { UserSettingsStore } from "./settings.store";

type TUserErrorStatus = {
  status: string;
  message: string;
};

export interface IUserStore {
  // observables
  isAuthenticated: boolean;
  isLoading: boolean;
  error: TUserErrorStatus | undefined;
  data: IUser | undefined;
  // store observables
  userProfile: IUserProfileStore;
  userSettings: IUserSettingsStore;
  accounts: Record<string, IAccountStore>;
  permission: IUserPermissionStore;
  // actions
  fetchCurrentUser: () => Promise<IUser | undefined>;
  updateCurrentUser: (data: Partial<IUser>) => Promise<IUser | undefined>;
  handleSetPassword: (csrfToken: string, data: { password: string }) => Promise<IUser | undefined>;
  deactivateAccount: () => Promise<void>;
  changePassword: (
    csrfToken: string,
    payload: { old_password?: string; new_password: string }
  ) => Promise<IUser | undefined>;
  reset: () => void;
  signOut: () => Promise<void>;
  // computed
  canPerformAnyCreateAction: boolean;
  projectsWithCreatePermissions: { [projectId: string]: number } | null;
}

// Zustand Store
interface UserState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: TUserErrorStatus | undefined;
  data: IUser | undefined;
}

interface UserActions {
  fetchCurrentUser: (
    userService: UserService,
    userProfile: IUserProfileStore,
    userSettings: IUserSettingsStore,
    store: RootStore
  ) => Promise<IUser>;
  updateCurrentUser: (userService: UserService, data: Partial<IUser>) => Promise<IUser>;
  handleSetPassword: (authService: AuthService, csrfToken: string, data: { password: string }) => Promise<IUser | undefined>;
  changePassword: (
    userService: UserService,
    csrfToken: string,
    payload: { old_password?: string; new_password: string }
  ) => Promise<IUser | undefined>;
  deactivateAccount: (userService: UserService, store: RootStore) => Promise<void>;
  reset: () => void;
  signOut: (authService: AuthService, store: RootStore) => Promise<void>;
}

type UserStoreType = UserState & UserActions;

export const useUserStore = create<UserStoreType>()(
  immer((set, get) => ({
    // State
    isAuthenticated: false,
    isLoading: false,
    error: undefined,
    data: undefined,

    // Actions
    fetchCurrentUser: async (userService, userProfile, userSettings, store) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = undefined;
        });
        const user = await userService.currentUser();
        if (user && user?.id) {
          await Promise.all([
            userProfile.fetchUserProfile(),
            userSettings.fetchCurrentUserSettings(),
            store.workspaceRoot.fetchWorkspaces(),
          ]);
          set((state) => {
            state.data = user;
            state.isLoading = false;
            state.isAuthenticated = true;
          });
        } else {
          set((state) => {
            state.data = user;
            state.isLoading = false;
            state.isAuthenticated = false;
          });
        }
        return user;
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.isAuthenticated = false;
          state.error = {
            status: "user-fetch-error",
            message: "Failed to fetch current user",
          };
        });
        throw error;
      }
    },

    updateCurrentUser: async (userService, data) => {
      const currentUserData = get().data;
      try {
        if (currentUserData) {
          set((state) => {
            Object.keys(data).forEach((key: string) => {
              const userKey: keyof IUser = key as keyof IUser;
              if (state.data) lodashSet(state.data, userKey, data[userKey]);
            });
          });
        }
        const user = await userService.updateUser(data);
        return user;
      } catch (error) {
        if (currentUserData) {
          set((state) => {
            Object.keys(currentUserData).forEach((key: string) => {
              const userKey: keyof IUser = key as keyof IUser;
              if (state.data) lodashSet(state.data, userKey, currentUserData[userKey]);
            });
          });
        }
        set((state) => {
          state.error = {
            status: "user-update-error",
            message: "Failed to update current user",
          };
        });
        throw error;
      }
    },

    handleSetPassword: async (authService, csrfToken, data) => {
      const currentUserData = cloneDeep(get().data);
      try {
        if (currentUserData && currentUserData.is_password_autoset && get().data) {
          const user = await authService.setPassword(csrfToken, { password: data.password });
          set((state) => {
            if (state.data) lodashSet(state.data, ["is_password_autoset"], false);
          });
          return user;
        }
        return undefined;
      } catch (error) {
        set((state) => {
          if (state.data) lodashSet(state.data, ["is_password_autoset"], true);
          state.error = {
            status: "user-update-error",
            message: "Failed to update current user",
          };
        });
        throw error;
      }
    },

    changePassword: async (userService, csrfToken, payload) => {
      try {
        const user = await userService.changePassword(csrfToken, payload);
        set((state) => {
          if (state.data) lodashSet(state.data, ["is_password_autoset"], false);
        });
        return user;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },

    deactivateAccount: async (userService, store) => {
      await userService.deactivateAccount();
      store.resetOnSignOut();
    },

    reset: () => {
      set((state) => {
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = undefined;
        state.data = undefined;
      });
    },

    signOut: async (authService, store) => {
      await authService.signOut(API_BASE_URL);
      store.resetOnSignOut();
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class UserStore implements IUserStore {
  userProfile: IUserProfileStore;
  userSettings: IUserSettingsStore;
  accounts: Record<string, IAccountStore> = {};
  permission: IUserPermissionStore;
  userService: UserService;
  authService: AuthService;

  constructor(private store: RootStore) {
    this.userProfile = new ProfileStore(store);
    this.userSettings = new UserSettingsStore();
    this.permission = new UserPermissionStore(store);
    this.userService = new UserService();
    this.authService = new AuthService();
  }

  private get userStore() {
    return useUserStore.getState();
  }

  get isAuthenticated() {
    return this.userStore.isAuthenticated;
  }

  get isLoading() {
    return this.userStore.isLoading;
  }

  get error() {
    return this.userStore.error;
  }

  get data() {
    return this.userStore.data;
  }

  fetchCurrentUser = () => {
    return this.userStore.fetchCurrentUser(this.userService, this.userProfile, this.userSettings, this.store);
  };

  updateCurrentUser = (data: Partial<IUser>) => {
    return this.userStore.updateCurrentUser(this.userService, data);
  };

  handleSetPassword = (csrfToken: string, data: { password: string }) => {
    return this.userStore.handleSetPassword(this.authService, csrfToken, data);
  };

  changePassword = (csrfToken: string, payload: { old_password?: string; new_password: string }) => {
    return this.userStore.changePassword(this.userService, csrfToken, payload);
  };

  deactivateAccount = () => {
    return this.userStore.deactivateAccount(this.userService, this.store);
  };

  reset = () => {
    this.userStore.reset();
    this.userProfile = new ProfileStore(this.store);
    this.userSettings = new UserSettingsStore();
    this.permission = new UserPermissionStore(this.store);
  };

  signOut = () => {
    return this.userStore.signOut(this.authService, this.store);
  };

  // helper methods
  /**
   * @description fetches the projects with write permissions
   * @returns {{[projectId: string]: number} || null}
   */
  fetchProjectsWithCreatePermissions = (): { [key: string]: TUserPermissions } => {
    const { workspaceSlug } = this.store.router;

    const allWorkspaceProjectRoles = this.permission.getProjectRolesByWorkspaceSlug(workspaceSlug || "");

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
  };

  /**
   * @description returns projects where user has permissions
   * @returns {{[projectId: string]: number} || null}
   */
  get projectsWithCreatePermissions() {
    return this.fetchProjectsWithCreatePermissions();
  }

  /**
   * @description returns true if user has permissions to write in any project
   * @returns {boolean}
   */
  get canPerformAnyCreateAction() {
    const filteredProjects = this.fetchProjectsWithCreatePermissions();
    return filteredProjects ? Object.keys(filteredProjects).length > 0 : false;
  }
}
