import { orderBy, clone, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { THomeWidgetKeys, TWidgetEntityData } from "@plane/types";
// plane web services
import { WorkspaceService } from "@/plane-web/services";
// store
import type { IWorkspaceLinkStore } from "./link.store";
import { WorkspaceLinkStore } from "./link.store";

// Zustand Store
interface HomeState {
  loading: boolean;
  showWidgetSettings: boolean;
  widgetsMap: Record<string, TWidgetEntityData>;
  widgets: THomeWidgetKeys[];
}

interface HomeActions {
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

type HomeStoreType = HomeState & HomeActions;

const workspaceService = new WorkspaceService();

export const useHomeStore = create<HomeStoreType>()(
  immer((set, get) => ({
    // State
    loading: false,
    showWidgetSettings: false,
    widgetsMap: {},
    widgets: [],

    // Actions
    toggleWidgetSettings: (value) => {
      set((state) => {
        state.showWidgetSettings = value !== undefined ? value : !state.showWidgetSettings;
      });
    },

    fetchWidgets: async (workspaceSlug) => {
      try {
        set((state) => {
          state.loading = true;
        });
        const widgets = await workspaceService.fetchWorkspaceWidgets(workspaceSlug);
        set((state) => {
          state.widgets = orderBy(Object.values(widgets), "sort_order", "desc").map((widget) => widget.key);
          widgets.forEach((widget) => {
            state.widgetsMap[widget.key] = widget;
          });
          state.loading = false;
        });
      } catch (error) {
        console.error("Failed to fetch widgets");
        set((state) => {
          state.loading = false;
        });
        throw error;
      }
    },

    toggleWidget: async (workspaceSlug, widgetKey, is_enabled) => {
      try {
        await workspaceService.updateWorkspaceWidget(workspaceSlug, widgetKey, {
          is_enabled,
        });
        set((state) => {
          if (state.widgetsMap[widgetKey]) {
            state.widgetsMap[widgetKey].is_enabled = is_enabled;
          }
        });
      } catch (error) {
        console.error("Failed to toggle widget");
        throw error;
      }
    },

    reorderWidget: async (workspaceSlug, widgetKey, destinationId, edge) => {
      const state = get();
      const sortOrderBeforeUpdate = clone(state.widgetsMap[widgetKey]?.sort_order);
      try {
        let resultSequence = 10000;
        if (edge) {
          const sortedIds = orderBy(Object.values(state.widgetsMap), "sort_order", "desc").map((widget) => widget.key);
          const destinationSequence = state.widgetsMap[destinationId]?.sort_order || undefined;
          if (destinationSequence) {
            const destinationIndex = sortedIds.findIndex((id) => id === destinationId);
            if (edge === "reorder-above") {
              const prevSequence = state.widgetsMap[sortedIds[destinationIndex - 1]]?.sort_order || undefined;
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
        set((state) => {
          if (state.widgetsMap[widgetKey]) {
            state.widgetsMap[widgetKey].sort_order = resultSequence;
          }
        });
        await workspaceService.updateWorkspaceWidget(workspaceSlug, widgetKey, {
          sort_order: resultSequence,
        });
      } catch (error) {
        console.error("Failed to move widget");
        set((state) => {
          if (state.widgetsMap[widgetKey]) {
            state.widgetsMap[widgetKey].sort_order = sortOrderBeforeUpdate;
          }
        });
        throw error;
      }
    },
  }))
);

// Legacy interface for backward compatibility
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

// Legacy class wrapper for backward compatibility
export class HomeStore implements IHomeStore {
  quickLinks: IWorkspaceLinkStore;

  constructor() {
    this.quickLinks = new WorkspaceLinkStore();
  }

  private get store() {
    return useHomeStore.getState();
  }

  get loading() {
    return this.store.loading;
  }

  get showWidgetSettings() {
    return this.store.showWidgetSettings;
  }

  get widgetsMap() {
    return this.store.widgetsMap;
  }

  get widgets() {
    return this.store.widgets;
  }

  get isAnyWidgetEnabled() {
    return Object.values(this.store.widgetsMap).some((widget) => widget.is_enabled);
  }

  get orderedWidgets() {
    return orderBy(Object.values(this.store.widgetsMap), "sort_order", "desc").map((widget) => widget.key);
  }

  // Actions
  toggleWidgetSettings = (value?: boolean) => this.store.toggleWidgetSettings(value);
  fetchWidgets = (workspaceSlug: string) => this.store.fetchWidgets(workspaceSlug);
  reorderWidget = (workspaceSlug: string, widgetKey: string, destinationId: string, edge: string | undefined) =>
    this.store.reorderWidget(workspaceSlug, widgetKey, destinationId, edge);
  toggleWidget = (workspaceSlug: string, widgetKey: string, is_enabled: boolean) =>
    this.store.toggleWidget(workspaceSlug, widgetKey, is_enabled);
}
