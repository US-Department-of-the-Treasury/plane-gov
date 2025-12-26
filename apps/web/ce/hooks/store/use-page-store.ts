import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
// store
import { store } from "@/lib/store-context";
import type { IProjectPageStore } from "@/store/pages/project-page.store";
import { useProjectPageStore, ProjectPageStoreLegacy } from "@/plane-web/store/client";

export enum EPageStoreType {
  PROJECT = "PROJECT_PAGE",
}

export type TReturnType = {
  [EPageStoreType.PROJECT]: IProjectPageStore;
};

// Singleton instance for the legacy wrapper
let projectPageInstance: ProjectPageStoreLegacy | null = null;

const getProjectPageInstance = (): ProjectPageStoreLegacy => {
  if (!projectPageInstance) {
    projectPageInstance = new ProjectPageStoreLegacy(store);
  }
  return projectPageInstance;
};

/**
 * Hook for accessing page store functionality with reactive state.
 * Combines Zustand store state with legacy facade for backward compatibility.
 *
 * For new code, prefer using the individual TanStack Query hooks directly.
 *
 * @deprecated Use useProjectPageStore hook directly in new code
 */
export const usePageStore = <T extends EPageStoreType>(_storeType: T): TReturnType[T] => {
  // Subscribe to Zustand store for reactivity
  const { loader, data, error, filters } = useProjectPageStore(
    useShallow((state) => ({
      loader: state.loader,
      data: state.data,
      error: state.error,
      filters: state.filters,
    }))
  );

  // Get the legacy facade for methods that need CoreRootStore
  const facade = getProjectPageInstance();

  // Return a combined interface that uses reactive state for properties
  // and the facade for methods
  return useMemo(
    () => ({
      // Reactive state from Zustand
      loader,
      data,
      error,
      filters,

      // Computed properties from facade (use current state)
      get isAnyPageAvailable() {
        return facade.isAnyPageAvailable;
      },
      get canCurrentUserCreatePage() {
        return facade.canCurrentUserCreatePage;
      },

      // Methods from facade (need CoreRootStore)
      getCurrentProjectPageIdsByTab: facade.getCurrentProjectPageIdsByTab,
      getCurrentProjectPageIds: facade.getCurrentProjectPageIds,
      getCurrentProjectFilteredPageIdsByTab: facade.getCurrentProjectFilteredPageIdsByTab,
      getPageById: facade.getPageById,
      updateFilters: facade.updateFilters,
      clearAllFilters: facade.clearAllFilters,
      fetchPagesList: facade.fetchPagesList,
      fetchPageDetails: facade.fetchPageDetails,
      createPage: facade.createPage,
      removePage: facade.removePage,
      movePage: facade.movePage,
    }),
    [loader, data, error, filters, facade]
  ) as TReturnType[T];
};
