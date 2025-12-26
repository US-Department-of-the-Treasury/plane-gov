import { create } from "zustand";
import { cloneDeep, isEqual } from "lodash-es";
import type { IWorkspaceView } from "@plane/types";
import { WorkspaceService } from "@/plane-web/services";
import { useWorkspaceRootStore } from "@/store/workspace";
import { getRouterWorkspaceSlug } from "@/store/client";

/**
 * Global view state managed by Zustand.
 */
interface GlobalViewStoreState {
  globalViewMap: Record<string, IWorkspaceView>;
}

interface GlobalViewStoreActions {
  // Sync actions
  syncView: (view: IWorkspaceView) => void;
  syncViews: (views: IWorkspaceView[]) => void;
  removeView: (viewId: string) => void;
  updateViewField: <K extends keyof IWorkspaceView>(viewId: string, field: K, value: IWorkspaceView[K]) => void;
  // Getters
  getViewDetailsById: (viewId: string) => IWorkspaceView | null;
  getSearchedViews: (workspaceId: string, searchQuery: string) => string[] | null;
  getCurrentWorkspaceViews: (workspaceId: string | null) => string[] | null;
}

export type GlobalViewStore = GlobalViewStoreState & GlobalViewStoreActions;

const initialState: GlobalViewStoreState = {
  globalViewMap: {},
};

export const useGlobalViewStore = create<GlobalViewStore>()((set, get) => ({
  ...initialState,

  syncView: (view) => {
    set((state) => ({
      globalViewMap: { ...state.globalViewMap, [view.id]: view },
    }));
  },

  syncViews: (views) => {
    set((state) => {
      const newMap = { ...state.globalViewMap };
      views.forEach((view) => {
        newMap[view.id] = view;
      });
      return { globalViewMap: newMap };
    });
  },

  removeView: (viewId) => {
    set((state) => {
      const newMap = { ...state.globalViewMap };
      delete newMap[viewId];
      return { globalViewMap: newMap };
    });
  },

  updateViewField: (viewId, field, value) => {
    set((state) => {
      if (!state.globalViewMap[viewId]) return state;
      return {
        globalViewMap: {
          ...state.globalViewMap,
          [viewId]: { ...state.globalViewMap[viewId], [field]: value },
        },
      };
    });
  },

  getViewDetailsById: (viewId) => {
    return get().globalViewMap[viewId] ?? null;
  },

  getSearchedViews: (workspaceId, searchQuery) => {
    if (!workspaceId) return null;
    const { globalViewMap } = get();
    return (
      Object.keys(globalViewMap ?? {})?.filter(
        (viewId) =>
          globalViewMap[viewId]?.workspace === workspaceId &&
          globalViewMap[viewId]?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      ) ?? null
    );
  },

  getCurrentWorkspaceViews: (workspaceId) => {
    if (!workspaceId) return null;
    const { globalViewMap } = get();
    return (
      Object.keys(globalViewMap ?? {})?.filter((viewId) => globalViewMap[viewId]?.workspace === workspaceId) ?? null
    );
  },
}));

// Service instance
const workspaceService = new WorkspaceService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IGlobalViewStore {
  globalViewMap: Record<string, IWorkspaceView>;
  currentWorkspaceViews: string[] | null;
  getSearchedViews: (searchQuery: string) => string[] | null;
  getViewDetailsById: (viewId: string) => IWorkspaceView | null;
  fetchAllGlobalViews: (workspaceSlug: string) => Promise<IWorkspaceView[]>;
  fetchGlobalViewDetails: (workspaceSlug: string, viewId: string) => Promise<IWorkspaceView>;
  createGlobalView: (workspaceSlug: string, data: Partial<IWorkspaceView>) => Promise<IWorkspaceView>;
  updateGlobalView: (
    workspaceSlug: string,
    viewId: string,
    data: Partial<IWorkspaceView>,
    shouldSyncFilters?: boolean
  ) => Promise<IWorkspaceView | undefined>;
  deleteGlobalView: (workspaceSlug: string, viewId: string) => Promise<any>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * @deprecated Use useGlobalViewStore hook directly in React components
 */
export class GlobalViewStoreLegacy implements IGlobalViewStore {
  // Keep rootStore reference only for issue methods (IssueRootStore not yet fully migrated)
  private rootStore: {
    issue: {
      workspaceIssuesFilter: {
        updateFilterExpression: (workspaceSlug: string, viewId: string, filters: any) => Promise<void>;
      };
      workspaceIssues: {
        fetchIssuesWithExistingPagination: (workspaceSlug: string, viewId: string, type: string) => void;
      };
    };
  };

  constructor(rootStore: any) {
    this.rootStore = rootStore;
  }

  /**
   * @description Get current workspace directly from Zustand store
   * Direct Zustand store access - no rootStore indirection for workspace data
   */
  private getCurrentWorkspace = (): { id: string } | null => {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    const workspaces = useWorkspaceRootStore.getState().workspaces;
    const workspace = Object.values(workspaces ?? {}).find((w) => w.slug === workspaceSlug);
    return workspace || null;
  };

  get globalViewMap() {
    return useGlobalViewStore.getState().globalViewMap;
  }

  get currentWorkspaceViews() {
    // Direct Zustand store access - no rootStore indirection
    const currentWorkspace = this.getCurrentWorkspace();
    if (!currentWorkspace) return null;
    return useGlobalViewStore.getState().getCurrentWorkspaceViews(currentWorkspace.id);
  }

  getSearchedViews = (searchQuery: string) => {
    // Direct Zustand store access - no rootStore indirection
    const currentWorkspace = this.getCurrentWorkspace();
    if (!currentWorkspace) return null;
    return useGlobalViewStore.getState().getSearchedViews(currentWorkspace.id, searchQuery);
  };

  getViewDetailsById = (viewId: string) => {
    return useGlobalViewStore.getState().getViewDetailsById(viewId);
  };

  fetchAllGlobalViews = async (workspaceSlug: string): Promise<IWorkspaceView[]> => {
    const response = await workspaceService.getAllViews(workspaceSlug);
    useGlobalViewStore.getState().syncViews(response);
    return response;
  };

  fetchGlobalViewDetails = async (workspaceSlug: string, viewId: string): Promise<IWorkspaceView> => {
    const response = await workspaceService.getViewDetails(workspaceSlug, viewId);
    useGlobalViewStore.getState().syncView(response);
    return response;
  };

  createGlobalView = async (workspaceSlug: string, data: Partial<IWorkspaceView>): Promise<IWorkspaceView> => {
    try {
      const response = await workspaceService.createView(workspaceSlug, data);
      useGlobalViewStore.getState().syncView(response);
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  updateGlobalView = async (
    workspaceSlug: string,
    viewId: string,
    data: Partial<IWorkspaceView>,
    shouldSyncFilters: boolean = true
  ): Promise<IWorkspaceView | undefined> => {
    const { globalViewMap, syncView } = useGlobalViewStore.getState();
    const currentViewData = globalViewMap[viewId] ? cloneDeep(globalViewMap[viewId]) : undefined;

    try {
      // Optimistic update
      if (globalViewMap[viewId]) {
        syncView({ ...globalViewMap[viewId], ...data } as IWorkspaceView);
      }

      const currentView = await workspaceService.updateView(workspaceSlug, viewId, data);

      // Sync filters if needed
      if (shouldSyncFilters && !isEqual(currentViewData?.rich_filters || {}, currentView?.rich_filters || {})) {
        await this.rootStore.issue.workspaceIssuesFilter.updateFilterExpression(
          workspaceSlug,
          viewId,
          currentView?.rich_filters || {}
        );
        this.rootStore.issue.workspaceIssues.fetchIssuesWithExistingPagination(workspaceSlug, viewId, "mutation");
      }
      return currentView;
    } catch (error) {
      // Revert on error
      if (currentViewData) {
        syncView(currentViewData);
      }
      throw error;
    }
  };

  deleteGlobalView = async (workspaceSlug: string, viewId: string): Promise<any> => {
    await workspaceService.deleteView(workspaceSlug, viewId);
    useGlobalViewStore.getState().removeView(viewId);
  };
}
