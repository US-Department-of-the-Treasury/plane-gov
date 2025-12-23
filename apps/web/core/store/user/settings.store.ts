import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { IUserSettings } from "@plane/types";
// services
import { UserService } from "@/services/user.service";

type TError = {
  status: string;
  message: string;
};

export interface IUserSettingsStore {
  // observables
  isLoading: boolean;
  error: TError | undefined;
  data: IUserSettings;
  sidebarCollapsed: boolean;
  isScrolled: boolean;
  // actions
  fetchCurrentUserSettings: (bustCache?: boolean) => Promise<IUserSettings | undefined>;
  toggleSidebar: (collapsed?: boolean) => void;
  toggleIsScrolled: (isScrolled?: boolean) => void;
}

// Zustand Store
interface UserSettingsState {
  isLoading: boolean;
  error: TError | undefined;
  data: IUserSettings;
  sidebarCollapsed: boolean;
  isScrolled: boolean;
}

interface UserSettingsActions {
  fetchCurrentUserSettings: (bustCache?: boolean) => Promise<IUserSettings | undefined>;
  toggleSidebar: (collapsed?: boolean) => void;
  toggleIsScrolled: (isScrolled?: boolean) => void;
}

type UserSettingsStoreType = UserSettingsState & UserSettingsActions;

const userService = new UserService();

export const useUserSettingsStore = create<UserSettingsStoreType>()(
  immer((set, get) => ({
    // State
    isLoading: false,
    sidebarCollapsed: true,
    error: undefined,
    isScrolled: false,
    data: {
      id: undefined,
      email: undefined,
      workspace: {
        last_workspace_id: undefined,
        last_workspace_slug: undefined,
        last_workspace_name: undefined,
        last_workspace_logo: undefined,
        fallback_workspace_id: undefined,
        fallback_workspace_slug: undefined,
        invites: undefined,
      },
    },

    // Actions
    toggleSidebar: (collapsed) => {
      set((state) => {
        state.sidebarCollapsed = collapsed ?? !state.sidebarCollapsed;
      });
    },

    toggleIsScrolled: (isScrolled) => {
      set((state) => {
        state.isScrolled = isScrolled ?? !state.isScrolled;
      });
    },

    fetchCurrentUserSettings: async (bustCache = false) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = undefined;
        });
        const userSettings = await userService.currentUserSettings(bustCache);
        set((state) => {
          state.isLoading = false;
          state.data = userSettings;
        });
        return userSettings;
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = {
            status: "error",
            message: "Failed to fetch user settings",
          };
        });
        throw error;
      }
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class UserSettingsStore implements IUserSettingsStore {
  userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  private get store() {
    return useUserSettingsStore.getState();
  }

  get isLoading() {
    return this.store.isLoading;
  }

  get error() {
    return this.store.error;
  }

  get data() {
    return this.store.data;
  }

  get sidebarCollapsed() {
    return this.store.sidebarCollapsed;
  }

  get isScrolled() {
    return this.store.isScrolled;
  }

  toggleSidebar = (collapsed?: boolean) => this.store.toggleSidebar(collapsed);

  toggleIsScrolled = (isScrolled?: boolean) => this.store.toggleIsScrolled(isScrolled);

  fetchCurrentUserSettings = (bustCache?: boolean) => this.store.fetchCurrentUserSettings(bustCache);
}
