import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import { EUserPermissions } from "@plane/constants";
import type { TPage, TPageFilters, TPageNavigationTabs } from "@plane/types";
import { EUserProjectRoles } from "@plane/types";
// helpers
import { filterPagesByPageType, getPageName, orderPages, shouldFilterPage } from "@plane/utils";
// plane web constants
// plane web store
import type { RootStore } from "@/plane-web/store/root.store";
// services
import { ProjectPageService } from "@/services/page";
// zustand stores
import { useFavoriteStore } from "@/store/client";
// store
import type { CoreRootStore } from "../root.store";
import type { TProjectPage } from "./project-page";
import { ProjectPage } from "./project-page";

type TLoader = "init-loader" | "mutation-loader" | undefined;

type TError = { title: string; description: string };

export const ROLE_PERMISSIONS_TO_CREATE_PAGE = [
  EUserPermissions.ADMIN,
  EUserPermissions.MEMBER,
  EUserProjectRoles.ADMIN,
  EUserProjectRoles.MEMBER,
];

export interface IProjectPageStore {
  // observables
  loader: TLoader;
  data: Record<string, TProjectPage>; // pageId => Page
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

// Zustand Store
interface ProjectPageStoreState {
  loader: TLoader;
  data: Record<string, TProjectPage>;
  error: TError | undefined;
  filters: TPageFilters;
}

interface ProjectPageStoreActions {
  setLoader: (loader: TLoader) => void;
  setError: (error: TError | undefined) => void;
  setPageData: (pageId: string, page: TProjectPage) => void;
  removePage: (pageId: string) => void;
  updateFilters: <T extends keyof TPageFilters>(filterKey: T, filterValue: TPageFilters[T]) => void;
  clearAllFilters: () => void;
  resetSearchQuery: () => void;
}

type ProjectPageStoreType = ProjectPageStoreState & ProjectPageStoreActions;

const createProjectPageStore = () =>
  create<ProjectPageStoreType>()(
    immer((set) => ({
      // State
      loader: "init-loader" as TLoader,
      data: {},
      error: undefined,
      filters: {
        searchQuery: "",
        sortKey: "updated_at",
        sortBy: "desc",
      },

      // Actions
      setLoader: (loader) => {
        set((state) => {
          state.loader = loader;
        });
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      setPageData: (pageId, page) => {
        set((state) => {
          state.data[pageId] = page;
        });
      },

      removePage: (pageId) => {
        set((state) => {
          delete state.data[pageId];
        });
      },

      updateFilters: (filterKey, filterValue) => {
        set((state) => {
          // Direct property access for proper Zustand reactivity
          state.filters[filterKey] = filterValue;
        });
      },

      clearAllFilters: () => {
        set((state) => {
          // Direct property access for proper Zustand reactivity
          state.filters.filters = {};
        });
      },

      resetSearchQuery: () => {
        set((state) => {
          state.filters.searchQuery = "";
        });
      },
    }))
  );

export class ProjectPageStore implements IProjectPageStore {
  // service
  service: ProjectPageService;
  rootStore: CoreRootStore;
  // zustand store
  private pageStore: ReturnType<typeof createProjectPageStore>;
  private lastProjectId: string | null = null;

  constructor(private store: RootStore) {
    this.rootStore = store;
    // service
    this.service = new ProjectPageService();
    // init zustand store
    this.pageStore = createProjectPageStore();
    // Note: Project ID change reaction is handled inline in methods that need it
    // by checking this.lastProjectId vs current projectId
  }

  private checkAndResetOnProjectChange() {
    const currentProjectId = this.store.router.projectId?.toString() || null;
    if (currentProjectId !== this.lastProjectId && currentProjectId) {
      this.pageStore.getState().resetSearchQuery();
      this.lastProjectId = currentProjectId;
    }
  }

  // Property getters
  get loader() {
    return this.pageStore.getState().loader;
  }

  get data() {
    return this.pageStore.getState().data;
  }

  get error() {
    return this.pageStore.getState().error;
  }

  get filters() {
    return this.pageStore.getState().filters;
  }

  /**
   * @description check if any page is available
   */
  get isAnyPageAvailable() {
    const state = this.pageStore.getState();
    if (state.loader) return true;
    return Object.keys(state.data).length > 0;
  }

  /**
   * @description returns true if the current logged in user can create a page
   */
  get canCurrentUserCreatePage() {
    const { workspaceSlug, projectId } = this.store.router;
    const currentUserProjectRole = this.store.user.permission.getProjectRoleByWorkspaceSlugAndProjectId(
      workspaceSlug?.toString() || "",
      projectId?.toString() || ""
    );
    return !!currentUserProjectRole && ROLE_PERMISSIONS_TO_CREATE_PAGE.includes(currentUserProjectRole);
  }

  /**
   * @description get the current project page ids based on the pageType
   * @param {TPageNavigationTabs} pageType
   */
  getCurrentProjectPageIdsByTab = (pageType: TPageNavigationTabs) => {
    const { projectId } = this.store.router;
    const data = this.pageStore.getState().data;
    if (!projectId) return undefined;
    // helps to filter pages based on the pageType
    let pagesByType = filterPagesByPageType(pageType, Object.values(data || {}));
    pagesByType = pagesByType.filter((p) => p.project_ids?.includes(projectId));

    const pages = (pagesByType.map((page) => page.id) as string[]) || undefined;

    return pages ?? undefined;
  };

  /**
   * @description get the current project page ids
   * @param {string} projectId
   */
  getCurrentProjectPageIds = (projectId: string) => {
    const data = this.pageStore.getState().data;
    if (!projectId) return [];
    const pages = Object.values(data || {}).filter((page) => page.project_ids?.includes(projectId));
    return pages.map((page) => page.id) as string[];
  };

  /**
   * @description get the current project filtered page ids based on the pageType
   * @param {TPageNavigationTabs} pageType
   */
  getCurrentProjectFilteredPageIdsByTab = (pageType: TPageNavigationTabs) => {
    const { projectId } = this.store.router;
    const state = this.pageStore.getState();
    if (!projectId) return undefined;

    // helps to filter pages based on the pageType
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
  };

  /**
   * @description get the page store by id
   * @param {string} pageId
   */
  getPageById = (pageId: string) => {
    const data = this.pageStore.getState().data;
    return data?.[pageId] || undefined;
  };

  updateFilters = <T extends keyof TPageFilters>(filterKey: T, filterValue: TPageFilters[T]) => {
    this.pageStore.getState().updateFilters(filterKey, filterValue);
  };

  /**
   * @description clear all the filters
   */
  clearAllFilters = () => {
    this.pageStore.getState().clearAllFilters();
  };

  /**
   * @description fetch all the pages
   */
  fetchPagesList = async (workspaceSlug: string, projectId: string, pageType?: TPageNavigationTabs) => {
    try {
      if (!workspaceSlug || !projectId) return undefined;

      // Check if project changed and reset search query
      this.checkAndResetOnProjectChange();

      const currentPageIds = pageType ? this.getCurrentProjectPageIdsByTab(pageType) : undefined;
      this.pageStore.getState().setLoader(
        currentPageIds && currentPageIds.length > 0 ? `mutation-loader` : `init-loader`
      );
      this.pageStore.getState().setError(undefined);

      const pages = await this.service.fetchAll(workspaceSlug, projectId);

      for (const page of pages) {
        if (page?.id) {
          const existingPage = this.getPageById(page.id);
          if (existingPage) {
            // If page already exists, update all fields except name
            const { name, ...otherFields } = page;
            existingPage.mutateProperties(otherFields, false);
          } else {
            // If new page, create a new instance with all data
            this.pageStore.getState().setPageData(page.id, new ProjectPage(this.store, page));
          }
        }
      }
      this.pageStore.getState().setLoader(undefined);

      return pages;
    } catch (error) {
      this.pageStore.getState().setLoader(undefined);
      this.pageStore.getState().setError({
        title: "Failed",
        description: "Failed to fetch the pages, Please try again later.",
      });
      throw error;
    }
  };

  /**
   * @description fetch the details of a page
   * @param {string} pageId
   */
  fetchPageDetails = async (...args: Parameters<IProjectPageStore["fetchPageDetails"]>) => {
    const [workspaceSlug, projectId, pageId, options] = args;
    const { trackVisit } = options || {};
    try {
      if (!workspaceSlug || !projectId || !pageId) return undefined;

      const currentPageId = this.getPageById(pageId);
      this.pageStore.getState().setLoader(currentPageId ? `mutation-loader` : `init-loader`);
      this.pageStore.getState().setError(undefined);

      const page = await this.service.fetchById(workspaceSlug, projectId, pageId, trackVisit ?? true);

      if (page?.id) {
        const pageInstance = this.getPageById(page.id);
        if (pageInstance) {
          pageInstance.mutateProperties(page, false);
        } else {
          this.pageStore.getState().setPageData(page.id, new ProjectPage(this.store, page));
        }
      }
      this.pageStore.getState().setLoader(undefined);

      return page;
    } catch (error) {
      this.pageStore.getState().setLoader(undefined);
      this.pageStore.getState().setError({
        title: "Failed",
        description: "Failed to fetch the page, Please try again later.",
      });
      throw error;
    }
  };

  /**
   * @description create a page
   * @param {Partial<TPage>} pageData
   */
  createPage = async (pageData: Partial<TPage>) => {
    try {
      const { workspaceSlug, projectId } = this.store.router;
      if (!workspaceSlug || !projectId) return undefined;

      this.pageStore.getState().setLoader("mutation-loader");
      this.pageStore.getState().setError(undefined);

      const page = await this.service.create(workspaceSlug, projectId, pageData);
      if (page?.id) {
        this.pageStore.getState().setPageData(page.id, new ProjectPage(this.store, page));
      }
      this.pageStore.getState().setLoader(undefined);

      return page;
    } catch (error) {
      this.pageStore.getState().setLoader(undefined);
      this.pageStore.getState().setError({
        title: "Failed",
        description: "Failed to create a page, Please try again later.",
      });
      throw error;
    }
  };

  /**
   * @description delete a page
   * @param {string} pageId
   */
  removePage = async ({ pageId, shouldSync = true }: { pageId: string; shouldSync?: boolean }) => {
    try {
      const { workspaceSlug, projectId } = this.store.router;
      if (!workspaceSlug || !projectId || !pageId) return undefined;

      await this.service.remove(workspaceSlug, projectId, pageId);
      this.pageStore.getState().removePage(pageId);
      if (useFavoriteStore.getState().entityMap[pageId]) {
        useFavoriteStore.getState().removeFavorite(pageId);
      }
    } catch (error) {
      this.pageStore.getState().setLoader(undefined);
      this.pageStore.getState().setError({
        title: "Failed",
        description: "Failed to delete a page, Please try again later.",
      });
      throw error;
    }
  };

  /**
   * @description move a page to a new project
   * @param {string} workspaceSlug
   * @param {string} projectId
   * @param {string} pageId
   * @param {string} newProjectId
   */
  movePage = async (workspaceSlug: string, projectId: string, pageId: string, newProjectId: string) => {
    try {
      await this.service.move(workspaceSlug, projectId, pageId, newProjectId);
      this.pageStore.getState().removePage(pageId);
    } catch (error) {
      console.error("Unable to move page", error);
      throw error;
    }
  };
}
