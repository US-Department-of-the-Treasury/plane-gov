"use client";

import { useState } from "react";
import { useCurrentUserSettings } from "@/store/queries/user";

/**
 * Hook to access current user settings and UI state.
 * Migrated from MobX to TanStack Query.
 *
 * NOTE: UI state properties (sidebarCollapsed, isScrolled) are now local React state
 * instead of MobX observables. This is a breaking change from the MobX version where
 * these were shared across components. Consider moving to a context or state management
 * solution if shared state is needed.
 *
 * @example
 * const { data: settings, isLoading, sidebarCollapsed, toggleSidebar } = useUserSettings();
 */
export const useUserSettings = () => {
  const query = useCurrentUserSettings();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  return {
    ...query,
    // UI state properties (now local state instead of shared MobX state)
    sidebarCollapsed,
    isScrolled,
    // UI state methods
    toggleSidebar: (collapsed?: boolean) => {
      setSidebarCollapsed((prev) => (collapsed !== undefined ? collapsed : !prev));
    },
    toggleIsScrolled: (scrolled?: boolean) => {
      setIsScrolled((prev) => (scrolled !== undefined ? scrolled : !prev));
    },
    // Backend data methods
    fetchCurrentUserSettings: (bustCache?: boolean) => {
      // Refetch with cache invalidation if bustCache is true
      // Note: refetch() always fetches fresh data; bustCache parameter kept for API compatibility
      return query.refetch();
    },
  };
};
