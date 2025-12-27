import { create } from "zustand";
import type { IWorkspaceView } from "@plane/types";

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
