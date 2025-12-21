// Zustand store (migrated from MobX)
import type { ThemeStore } from "@/store/client";
import { useThemeStore } from "@/store/client";

/**
 * Hook to access the app theme store (sidebar states).
 * Migrated from MobX to Zustand for better performance and simpler API.
 */
export const useAppTheme = (): ThemeStore => {
  return useThemeStore();
};
