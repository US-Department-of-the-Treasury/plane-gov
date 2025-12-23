import { create } from "zustand";
import { orderBy, clone, set } from "lodash-es";
import type { THomeWidgetKeys, TWidgetEntityData } from "@plane/types";
import { WorkspaceService } from "@/plane-web/services";
import type { IWorkspaceLinkStore } from "./workspace-link.store";
import { WorkspaceLinkStoreLegacy } from "./workspace-link.store";

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

// Service instance for legacy wrapper
const workspaceService = new WorkspaceService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IHomeStore {
  // observables
  loading: boolean;
  showWidgetSettings: boolean;
  widgetsMap: Record<string, TWidgetEntityData>;
  widgets: THomeWidgetKeys[];
  // computed
  isAnyWidgetEnabled: boolean;
  orderedWidgets: THomeWidgetKeys[];
  //stores
  quickLinks: IWorkspaceLinkStore;
  // actions
  toggleWidgetSettings: (value?: boolean) => void;
  fetchWidgets: (workspaceSlug: string) => Promise<void>;
  reorderWidget: (
    workspaceSlug: string,
    widgetKey: string,
    destinationId: string,
    edge: string | undefined
  ) => Promise<void>;
  toggleWidget: (workspaceSlug: string, widgetKey: string, is_enabled: boolean) => void;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks directly in React components
 */
export class HomeStoreLegacy implements IHomeStore {
  // Nested stores
  quickLinks: IWorkspaceLinkStore;

  constructor() {
    // Initialize nested stores
    this.quickLinks = new WorkspaceLinkStoreLegacy();
  }

  get loading() {
    return useWorkspaceHomeStore.getState().loading;
  }

  get showWidgetSettings() {
    return useWorkspaceHomeStore.getState().showWidgetSettings;
  }

  get widgetsMap() {
    return useWorkspaceHomeStore.getState().widgetsMap;
  }

  get widgets() {
    return useWorkspaceHomeStore.getState().widgets;
  }

  get isAnyWidgetEnabled() {
    return useWorkspaceHomeStore.getState().getIsAnyWidgetEnabled();
  }

  get orderedWidgets() {
    return useWorkspaceHomeStore.getState().getOrderedWidgets();
  }

  toggleWidgetSettings = (value?: boolean) => {
    useWorkspaceHomeStore.getState().toggleWidgetSettings(value);
  };

  fetchWidgets = async (workspaceSlug: string) => {
    const { setLoading, setWidgets, setWidgetsMap } = useWorkspaceHomeStore.getState();
    try {
      setLoading(true);
      const widgets = await workspaceService.fetchWorkspaceWidgets(workspaceSlug);
      const orderedWidgets = orderBy(Object.values(widgets), "sort_order", "desc").map((widget) => widget.key);

      const widgetsMap: Record<string, TWidgetEntityData> = {};
      widgets.forEach((widget) => {
        widgetsMap[widget.key] = widget;
      });

      setWidgets(orderedWidgets);
      setWidgetsMap(widgetsMap);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch widgets");
      setLoading(false);
      throw error;
    }
  };

  toggleWidget = async (workspaceSlug: string, widgetKey: string, is_enabled: boolean) => {
    const { updateWidgetInMap } = useWorkspaceHomeStore.getState();
    try {
      await workspaceService.updateWorkspaceWidget(workspaceSlug, widgetKey, {
        is_enabled,
      });
      updateWidgetInMap(widgetKey, { is_enabled });
    } catch (error) {
      console.error("Failed to toggle widget");
      throw error;
    }
  };

  reorderWidget = async (workspaceSlug: string, widgetKey: string, destinationId: string, edge: string | undefined) => {
    const { widgetsMap, updateWidgetInMap } = useWorkspaceHomeStore.getState();
    const sortOrderBeforeUpdate = clone(widgetsMap[widgetKey]?.sort_order);

    try {
      let resultSequence = 10000;
      if (edge) {
        const sortedIds = orderBy(Object.values(widgetsMap), "sort_order", "desc").map((widget) => widget.key);
        const destinationSequence = widgetsMap[destinationId]?.sort_order || undefined;
        if (destinationSequence) {
          const destinationIndex = sortedIds.findIndex((id) => id === destinationId);
          if (edge === "reorder-above") {
            const prevSequence = widgetsMap[sortedIds[destinationIndex - 1]]?.sort_order || undefined;
            if (prevSequence) {
              resultSequence = (destinationSequence + prevSequence) / 2;
            } else {
              resultSequence = destinationSequence + resultSequence;
            }
          } else {
            resultSequence = destinationSequence - resultSequence;
          }
        }
      }

      updateWidgetInMap(widgetKey, { sort_order: resultSequence });

      await workspaceService.updateWorkspaceWidget(workspaceSlug, widgetKey, {
        sort_order: resultSequence,
      });
    } catch (error) {
      console.error("Failed to move widget");
      // Revert on error
      if (sortOrderBeforeUpdate !== undefined) {
        updateWidgetInMap(widgetKey, { sort_order: sortOrderBeforeUpdate });
      }
      throw error;
    }
  };
}
