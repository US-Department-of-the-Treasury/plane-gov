import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type TTheme = "dark" | "light";

// Storage key for theme preferences
const STORAGE_KEY = "god-mode-theme";

interface ThemeState {
  // Persisted state
  theme: string | undefined;
  isSidebarCollapsed: boolean | undefined;

  // Ephemeral state (not persisted)
  isNewUserPopup: boolean;
}

interface ThemeActions {
  // Actions
  setTheme: (theme: TTheme) => void;
  toggleSidebar: (collapsed: boolean) => void;
  toggleNewUserPopup: () => void;
}

export type ThemeStore = ThemeState & ThemeActions;

/**
 * Theme store for Admin app using Zustand.
 * Replaces MobX ThemeStore.
 *
 * This store manages pure client-side state:
 * - theme: User's theme preference (persisted to localStorage)
 * - isSidebarCollapsed: Sidebar collapsed state (persisted to localStorage)
 * - isNewUserPopup: New user popup visibility (NOT persisted)
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: undefined,
      isSidebarCollapsed: undefined,
      isNewUserPopup: false,

      setTheme: (theme: TTheme) => {
        set({ theme });
        // Also update localStorage directly for the "theme" key (legacy compatibility)
        if (typeof window !== "undefined") {
          localStorage.setItem("theme", theme);
        }
      },

      toggleSidebar: (collapsed: boolean) => {
        set({ isSidebarCollapsed: collapsed });
        // Also update localStorage directly for the "god_mode_sidebar_collapsed" key (legacy compatibility)
        if (typeof window !== "undefined") {
          localStorage.setItem("god_mode_sidebar_collapsed", collapsed.toString());
        }
      },

      toggleNewUserPopup: () => {
        set((state) => ({ isNewUserPopup: !state.isNewUserPopup }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist theme and sidebar state, NOT the popup state
      partialize: (state) => ({
        theme: state.theme,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
