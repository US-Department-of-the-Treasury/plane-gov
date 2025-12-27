import { create } from "zustand";
import { orderBy } from "lodash-es";
import type { THomeWidgetKeys, TWidgetEntityData } from "@plane/types";

/**
 * Workspace Home state managed by Zustand.
 * Handles home dashboard widgets and their configuration.
 */
interface WorkspaceHomeStoreState {
  // observables
  loading: boolean;
  showWidgetSettings: boolean;
  widgetsMap: Record<string, TWidgetEntityData>;
  widgets: THomeWidgetKeys[];
}

interface WorkspaceHomeStoreActions {
  // Sync actions
  setLoading: (loading: boolean) => void;
  setShowWidgetSettings: (show: boolean) => void;
  setWidgetsMap: (widgetsMap: Record<string, TWidgetEntityData>) => void;
  setWidgets: (widgets: THomeWidgetKeys[]) => void;
  updateWidgetInMap: (widgetKey: string, data: Partial<TWidgetEntityData>) => void;
  // Actions
  toggleWidgetSettings: (value?: boolean) => void;
  // Getters (computed)
  getIsAnyWidgetEnabled: () => boolean;
  getOrderedWidgets: () => THomeWidgetKeys[];
}

export type WorkspaceHomeStore = WorkspaceHomeStoreState & WorkspaceHomeStoreActions;

const initialState: WorkspaceHomeStoreState = {
  loading: false,
  showWidgetSettings: false,
  widgetsMap: {},
  widgets: [],
};

export const useWorkspaceHomeStore = create<WorkspaceHomeStore>()((set, get) => ({
  ...initialState,

  setLoading: (loading) => {
    set({ loading });
  },

  setShowWidgetSettings: (show) => {
    set({ showWidgetSettings: show });
  },

  setWidgetsMap: (widgetsMap) => {
    set({ widgetsMap });
  },

  setWidgets: (widgets) => {
    set({ widgets });
  },

  updateWidgetInMap: (widgetKey, data) => {
    set((state) => {
      const newWidgetsMap = { ...state.widgetsMap };
      if (newWidgetsMap[widgetKey]) {
        newWidgetsMap[widgetKey] = {
          ...newWidgetsMap[widgetKey],
          ...data,
        };
      }
      return { widgetsMap: newWidgetsMap };
    });
  },

  toggleWidgetSettings: (value) => {
    set((state) => ({
      showWidgetSettings: value !== undefined ? value : !state.showWidgetSettings,
    }));
  },

  getIsAnyWidgetEnabled: () => {
    const { widgetsMap } = get();
    return Object.values(widgetsMap).some((widget) => widget.is_enabled);
  },

  getOrderedWidgets: () => {
    const { widgetsMap } = get();
    return orderBy(Object.values(widgetsMap), "sort_order", "desc").map((widget) => widget.key);
  },
}));
