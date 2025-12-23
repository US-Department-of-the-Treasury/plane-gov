import { create } from "zustand";
import type { IUserSettings } from "@plane/types";
import { UserService } from "@/services/user.service";

type TError = {
  status: string;
  message: string;
};

/**
 * State interface for UserSettings store
 */
interface UserSettingsStoreState {
  isLoading: boolean;
  error: TError | undefined;
  data: IUserSettings;
  sidebarCollapsed: boolean;
  isScrolled: boolean;
}

/**
 * Actions interface for UserSettings store
 */
interface UserSettingsStoreActions {
  fetchCurrentUserSettings: (bustCache?: boolean) => Promise<IUserSettings | undefined>;
  toggleSidebar: (collapsed?: boolean) => void;
  toggleIsScrolled: (isScrolled?: boolean) => void;
}

/**
 * Combined type export
 */
export type UserSettingsStoreType = UserSettingsStoreState & UserSettingsStoreActions;

/**
 * Initial state
 */
const initialState: UserSettingsStoreState = {
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
};

/**
 * User Settings Store (Zustand)
 *
 * Manages user settings, sidebar state, and scroll state.
 * Migrated from MobX UserSettingsStore to Zustand.
 *
 * @example
 * // In React components, use the hook:
 * const { data, fetchCurrentUserSettings } = useUserSettingsStore();
 *
 * // For non-React code or legacy compatibility:
 * const settings = useUserSettingsStore.getState().data;
 */
export const useUserSettingsStore = create<UserSettingsStoreType>()((set, get) => {
  // Initialize service instance
  const userService = new UserService();

  return {
    ...initialState,

    /**
     * Toggle sidebar collapsed state
     * @param collapsed - Optional boolean to set specific state, otherwise toggles current state
     */
    toggleSidebar: (collapsed) => {
      const currentState = get().sidebarCollapsed;
      set({ sidebarCollapsed: collapsed ?? !currentState });
    },

    /**
     * Toggle isScrolled state
     * @param isScrolled - Optional boolean to set specific state, otherwise toggles current state
     */
    toggleIsScrolled: (isScrolled) => {
      const currentState = get().isScrolled;
      set({ isScrolled: isScrolled ?? !currentState });
    },

    /**
     * Fetch current user settings
     * @param bustCache - If true, forces a fresh fetch bypassing cache
     * @returns Promise<IUserSettings | undefined>
     */
    fetchCurrentUserSettings: async (bustCache = false) => {
      try {
        set({
          isLoading: true,
          error: undefined,
        });

        const userSettings = await userService.currentUserSettings(bustCache);

        set({
          isLoading: false,
          data: userSettings,
        });

        return userSettings;
      } catch (error) {
        set({
          isLoading: false,
          error: {
            status: "error",
            message: "Failed to fetch user settings",
          },
        });
        throw error;
      }
    },
  };
});

/**
 * Legacy interface for backward compatibility
 * Matches the original MobX IUserSettingsStore interface
 */
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

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useUserSettingsStore hook directly in React components
 */
export class UserSettingsStore implements IUserSettingsStore {
  get isLoading() {
    return useUserSettingsStore.getState().isLoading;
  }

  get error() {
    return useUserSettingsStore.getState().error;
  }

  get data() {
    return useUserSettingsStore.getState().data;
  }

  get sidebarCollapsed() {
    return useUserSettingsStore.getState().sidebarCollapsed;
  }

  get isScrolled() {
    return useUserSettingsStore.getState().isScrolled;
  }

  fetchCurrentUserSettings = (bustCache?: boolean) => {
    return useUserSettingsStore.getState().fetchCurrentUserSettings(bustCache);
  };

  toggleSidebar = (collapsed?: boolean) => {
    useUserSettingsStore.getState().toggleSidebar(collapsed);
  };

  toggleIsScrolled = (isScrolled?: boolean) => {
    useUserSettingsStore.getState().toggleIsScrolled(isScrolled);
  };
}
