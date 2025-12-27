import { useEffect, useMemo, useCallback, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
// plane imports
import type { TPageFilters, TPageNavigationTabs } from "@plane/types";
import { filterPagesByPageType, getPageName, orderPages, shouldFilterPage } from "@plane/utils";
// store
import { getRouterProjectId, getRouterWorkspaceSlug, useRouterStore, useBaseUserPermissionStore } from "@/store/client";
import type { IProjectPageStore, TProjectPage } from "@/plane-web/store/client";
import { useProjectPageStore, ROLE_PERMISSIONS_TO_CREATE_PAGE } from "@/plane-web/store/client";

export enum EPageStoreType {
  PROJECT = "PROJECT_PAGE",
}

export type TReturnType = {
  [EPageStoreType.PROJECT]: IProjectPageStore;
};

/**
 * Hook for accessing page store functionality with reactive state.
 * Uses Zustand store directly without legacy class wrapper.
 *
 * For new code, prefer using the individual TanStack Query hooks directly.
 *
 * @deprecated Use useProjectPageStore hook directly in new code
 */
export const usePageStore = <T extends EPageStoreType>(_storeType: T): TReturnType[T] => {
  // Track previous project ID for change detection
  const previousProjectIdRef = useRef<string | undefined>(getRouterProjectId());

  // Subscribe to router changes to reset filters on project change
  useEffect(() => {
    const unsubscribe = useRouterStore.subscribe((state: { query: Record<string, unknown> }) => {
      const currentProjectId = state.query?.projectId?.toString();
      if (currentProjectId !== previousProjectIdRef.current) {
        previousProjectIdRef.current = currentProjectId;
        if (currentProjectId) {
          useProjectPageStore.getState().resetFiltersForProject();
        }
      }
    });

    return unsubscribe;
  }, []);

  // Subscribe to Zustand store for reactivity
  const { loader, data, error, filters } = useProjectPageStore(
    useShallow((state) => ({
      loader: state.loader,
      data: state.data,
      error: state.error,
      filters: state.filters,
    }))
  );

  // Helper methods
  const getCurrentProjectPageIdsByTab = useCallback((pageType: TPageNavigationTabs) => {
    const projectId = getRouterProjectId();
    if (!projectId) return undefined;

    const state = useProjectPageStore.getState();
    let pagesByType = filterPagesByPageType(pageType, Object.values(state.data || {}));
    pagesByType = pagesByType.filter((p) => p.project_ids?.includes(projectId));

    const pages = (pagesByType.map((page) => page.id) as string[]) || undefined;
    return pages ?? undefined;
  }, []);

  const getCurrentProjectPageIds = useCallback((projectId: string) => {
    if (!projectId) return [];
    const state = useProjectPageStore.getState();
    const pages = Object.values(state.data || {}).filter((page) => page.project_ids?.includes(projectId));
    return pages.map((page) => page.id) as string[];
  }, []);

  const getCurrentProjectFilteredPageIdsByTab = useCallback((pageType: TPageNavigationTabs) => {
    const projectId = getRouterProjectId();
    if (!projectId) return undefined;

    const state = useProjectPageStore.getState();

    const pagesByType = filterPagesByPageType(pageType, Object.values(state.data || {}));
    let filteredPages = pagesByType.filter(
      (p) =>
        p.project_ids?.includes(projectId) &&
        getPageName(p.name).toLowerCase().includes(state.filters.searchQuery.toLowerCase()) &&
        shouldFilterPage(p, state.filters.filters)
    );
    filteredPages = orderPages(filteredPages, state.filters.sortKey, state.filters.sortBy);

    const pages = (filteredPages.map((page) => page.id) as string[]) || undefined;
    return pages ?? undefined;
  }, []);

  const getPageById = useCallback((pageId: string): TProjectPage | undefined => {
    const state = useProjectPageStore.getState();
    return state.data?.[pageId] || undefined;
  }, []);

  const updateFilters = useCallback(<K extends keyof TPageFilters>(filterKey: K, filterValue: TPageFilters[K]) => {
    useProjectPageStore.getState().updateFilters(filterKey, filterValue);
  }, []);

  const clearAllFilters = useCallback(() => {
    useProjectPageStore.getState().clearAllFilters();
  }, []);

  // Actions (delegate to Zustand store)
  const fetchPagesList = useCallback((workspaceSlug: string, projectId: string, pageType?: TPageNavigationTabs) => {
    return useProjectPageStore.getState().fetchPagesList(workspaceSlug, projectId, pageType);
  }, []);

  const fetchPageDetails = useCallback(
    (workspaceSlug: string, projectId: string, pageId: string, options?: { trackVisit?: boolean }) => {
      return useProjectPageStore.getState().fetchPageDetails(workspaceSlug, projectId, pageId, options);
    },
    []
  );

  const createPage = useCallback((pageData: Partial<TProjectPage>) => {
    return useProjectPageStore.getState().createPage(pageData);
  }, []);

  const removePage = useCallback((params: { pageId: string; shouldSync?: boolean }) => {
    return useProjectPageStore.getState().removePage(params);
  }, []);

  const movePage = useCallback((workspaceSlug: string, projectId: string, pageId: string, newProjectId: string) => {
    return useProjectPageStore.getState().movePage(workspaceSlug, projectId, pageId, newProjectId);
  }, []);

  // Return a combined interface with reactive state and computed properties
  return useMemo(
    () => ({
      // Reactive state from Zustand
      loader,
      data,
      error,
      filters,

      // Computed properties
      get isAnyPageAvailable(): boolean {
        const state = useProjectPageStore.getState();
        if (state.loader) return true;
        return Object.keys(state.data).length > 0;
      },
      get canCurrentUserCreatePage(): boolean {
        const workspaceSlug = getRouterWorkspaceSlug();
        const projectId = getRouterProjectId();
        const currentUserProjectRole = useBaseUserPermissionStore
          .getState()
          .getProjectRole(workspaceSlug?.toString() || "", projectId?.toString() || "");
        return !!currentUserProjectRole && ROLE_PERMISSIONS_TO_CREATE_PAGE.includes(currentUserProjectRole);
      },

      // Helper methods
      getCurrentProjectPageIdsByTab,
      getCurrentProjectPageIds,
      getCurrentProjectFilteredPageIdsByTab,
      getPageById,
      updateFilters,
      clearAllFilters,

      // Actions
      fetchPagesList,
      fetchPageDetails,
      createPage,
      removePage,
      movePage,
    }),
    [
      loader,
      data,
      error,
      filters,
      getCurrentProjectPageIdsByTab,
      getCurrentProjectPageIds,
      getCurrentProjectFilteredPageIdsByTab,
      getPageById,
      updateFilters,
      clearAllFilters,
      fetchPagesList,
      fetchPageDetails,
      createPage,
      removePage,
      movePage,
    ]
  ) as TReturnType[T];
};
