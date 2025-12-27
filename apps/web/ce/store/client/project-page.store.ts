import { create } from "zustand";
// types
import { EUserPermissions } from "@plane/constants";
import type { TPage, TPageFilters, TPageNavigationTabs } from "@plane/types";
import { EUserProjectRoles } from "@plane/types";
// helpers
import { filterPagesByPageType } from "@plane/utils";
// services
import { ProjectPageService } from "@/services/page";
// types for project page
import type { TProjectPage } from "@/store/pages/project-page";
import { ProjectPage } from "@/store/pages/project-page";
// store helpers
import { getRouterWorkspaceSlug, getRouterProjectId, useFavoriteStore } from "@/store/client";

type TLoader = "init-loader" | "mutation-loader" | undefined;

type TError = { title: string; description: string };

export const ROLE_PERMISSIONS_TO_CREATE_PAGE = [
  EUserPermissions.ADMIN,
  EUserPermissions.MEMBER,
  EUserProjectRoles.ADMIN,
  EUserProjectRoles.MEMBER,
];

// Service instance at module level
const projectPageService = new ProjectPageService();

// ============================================================================
// State Interface
// ============================================================================

interface ProjectPageStoreState {
  // observables
  loader: TLoader;
  data: Record<string, TProjectPage>; // pageId => Page
  error: TError | undefined;
  filters: TPageFilters;
}

// ============================================================================
// Actions Interface
// ============================================================================

interface ProjectPageStoreActions {
  // helper actions
  updateFilters: <T extends keyof TPageFilters>(filterKey: T, filterValue: TPageFilters[T]) => void;
  clearAllFilters: () => void;
  // actions
  fetchPagesList: (
    workspaceSlug: string,
    projectId: string,
    pageType?: TPageNavigationTabs
  ) => Promise<TPage[] | undefined>;
  fetchPageDetails: (
    workspaceSlug: string,
    projectId: string,
    pageId: string,
    options?: { trackVisit?: boolean }
  ) => Promise<TPage | undefined>;
  createPage: (pageData: Partial<TPage>) => Promise<TPage | undefined>;
  removePage: (params: { pageId: string; shouldSync?: boolean }) => Promise<void>;
  movePage: (workspaceSlug: string, projectId: string, pageId: string, newProjectId: string) => Promise<void>;
  // helper to reset filters on project change
  resetFiltersForProject: () => void;
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type ProjectPageStore = ProjectPageStoreState & ProjectPageStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ProjectPageStoreState = {
  loader: "init-loader",
  data: {},
  error: undefined,
  filters: {
    searchQuery: "",
    sortKey: "updated_at",
    sortBy: "desc",
  },
};

// ============================================================================
// Zustand Store
// ============================================================================

/**
 * Project Page Store (Zustand)
 *
 * Manages pages within projects.
 * Migrated from MobX ProjectPageStore to Zustand.
 *
 * Migration notes:
 * - MobX reactions (e.g., resetting filters on projectId change) should be replaced
 *   with useEffect in components that use this store
 * - ProjectPage instances are still MobX-based (will be migrated separately)
 */
export const useProjectPageStore = create<ProjectPageStore>()((set, get) => ({
  ...initialState,

  // ============================================================================
  // Helper Actions
  // ============================================================================

  updateFilters: (filterKey, filterValue) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [filterKey]: filterValue,
      },
    }));
  },

  clearAllFilters: () => {
    set((state) => ({
      filters: {
        ...state.filters,
        filters: {},
      },
    }));
  },

  resetFiltersForProject: () => {
    set((state) => ({
      filters: {
        ...state.filters,
        searchQuery: "",
      },
    }));
  },

  // ============================================================================
  // Async Actions
  // ============================================================================

  fetchPagesList: async (workspaceSlug, projectId, pageType) => {
    try {
      if (!workspaceSlug || !projectId) return undefined;

      const state = get();
      // Determine loader type based on existing data
      const currentPageIds = pageType
        ? (() => {
            // Inline getCurrentProjectPageIdsByTab logic
            const pagesByType = filterPagesByPageType(pageType, Object.values(state.data || {}));
            const filteredPages = pagesByType.filter((p) => p.project_ids?.includes(projectId));
            return filteredPages.map((page) => page.id) as string[];
          })()
        : undefined;

      set({
        loader: currentPageIds && currentPageIds.length > 0 ? "mutation-loader" : "init-loader",
        error: undefined,
      });

      const pages = await projectPageService.fetchAll(workspaceSlug, projectId);

      set((state) => {
        const updatedData = { ...state.data };

        for (const page of pages) {
          if (page?.id) {
            const existingPage = updatedData[page.id];
            if (existingPage) {
              // If page already exists, update all fields except name
              const { name, ...otherFields } = page;
              existingPage.mutateProperties(otherFields, false);
            } else {
              // If new page, create a new instance with all data
              updatedData[page.id] = new ProjectPage(page);
            }
          }
        }

        return {
          data: updatedData,
          loader: undefined,
        };
      });

      return pages;
    } catch (error) {
      set({
        loader: undefined,
        error: {
          title: "Failed",
          description: "Failed to fetch the pages, Please try again later.",
        },
      });
      throw error;
    }
  },

  fetchPageDetails: async (workspaceSlug, projectId, pageId, options) => {
    const { trackVisit } = options || {};
    try {
      if (!workspaceSlug || !projectId || !pageId) return undefined;

      const state = get();
      const currentPageId = state.data[pageId];

      set({
        loader: currentPageId ? "mutation-loader" : "init-loader",
        error: undefined,
      });

      const page = await projectPageService.fetchById(workspaceSlug, projectId, pageId, trackVisit ?? true);

      set((state) => {
        const updatedData = { ...state.data };

        if (page?.id) {
          const pageInstance = updatedData[page.id];
          if (pageInstance) {
            pageInstance.mutateProperties(page, false);
          } else {
            updatedData[page.id] = new ProjectPage(page);
          }
        }

        return {
          data: updatedData,
          loader: undefined,
        };
      });

      return page;
    } catch (error) {
      set({
        loader: undefined,
        error: {
          title: "Failed",
          description: "Failed to fetch the page, Please try again later.",
        },
      });
      throw error;
    }
  },

  createPage: async (pageData) => {
    try {
      const workspaceSlug = getRouterWorkspaceSlug();
      const projectId = getRouterProjectId();
      if (!workspaceSlug || !projectId) return undefined;

      set({
        loader: "mutation-loader",
        error: undefined,
      });

      const page = await projectPageService.create(workspaceSlug, projectId, pageData);

      set((state) => {
        const updatedData = { ...state.data };

        if (page?.id) {
          updatedData[page.id] = new ProjectPage(page);
        }

        return {
          data: updatedData,
          loader: undefined,
        };
      });

      return page;
    } catch (error) {
      set({
        loader: undefined,
        error: {
          title: "Failed",
          description: "Failed to create a page, Please try again later.",
        },
      });
      throw error;
    }
  },

  removePage: async ({ pageId, shouldSync: _shouldSync = true }) => {
    try {
      const workspaceSlug = getRouterWorkspaceSlug();
      const projectId = getRouterProjectId();
      if (!workspaceSlug || !projectId || !pageId) return undefined;

      await projectPageService.remove(workspaceSlug, projectId, pageId);

      set((state) => {
        const updatedData = { ...state.data };
        delete updatedData[pageId];

        return { data: updatedData };
      });

      // Remove from favorites if needed
      if (useFavoriteStore.getState().entityMap[pageId]) {
        useFavoriteStore.getState().removeFavorite(pageId);
      }
    } catch (error) {
      set({
        loader: undefined,
        error: {
          title: "Failed",
          description: "Failed to delete a page, Please try again later.",
        },
      });
      throw error;
    }
  },

  movePage: async (workspaceSlug, projectId, pageId, newProjectId) => {
    try {
      await projectPageService.move(workspaceSlug, projectId, pageId, newProjectId);

      set((state) => {
        const updatedData = { ...state.data };
        delete updatedData[pageId];

        return { data: updatedData };
      });
    } catch (error) {
      console.error("Unable to move page", error);
      throw error;
    }
  },
}));

// Legacy class removed - use useProjectPageStore hook directly

// ============================================================================
// Legacy Interface (for backwards compatibility with hooks)
// ============================================================================

/**
 * @deprecated Use useProjectPageStore hook directly in new code
 */
export interface IProjectPageStore {
  // observables
  loader: TLoader;
  data: Record<string, TProjectPage>;
  error: TError | undefined;
  filters: TPageFilters;
  // computed
  isAnyPageAvailable: boolean;
  canCurrentUserCreatePage: boolean;
  // helper actions
  getCurrentProjectPageIdsByTab: (pageType: TPageNavigationTabs) => string[] | undefined;
  getCurrentProjectPageIds: (projectId: string) => string[];
  getCurrentProjectFilteredPageIdsByTab: (pageType: TPageNavigationTabs) => string[] | undefined;
  getPageById: (pageId: string) => TProjectPage | undefined;
  updateFilters: <T extends keyof TPageFilters>(filterKey: T, filterValue: TPageFilters[T]) => void;
  clearAllFilters: () => void;
  // actions
  fetchPagesList: (
    workspaceSlug: string,
    projectId: string,
    pageType?: TPageNavigationTabs
  ) => Promise<TPage[] | undefined>;
  fetchPageDetails: (
    workspaceSlug: string,
    projectId: string,
    pageId: string,
    options?: { trackVisit?: boolean }
  ) => Promise<TPage | undefined>;
  createPage: (pageData: Partial<TPage>) => Promise<TPage | undefined>;
  removePage: (params: { pageId: string; shouldSync?: boolean }) => Promise<void>;
  movePage: (workspaceSlug: string, projectId: string, pageId: string, newProjectId: string) => Promise<void>;
}

// Export type aliases for backwards compatibility
export type { TProjectPage };
