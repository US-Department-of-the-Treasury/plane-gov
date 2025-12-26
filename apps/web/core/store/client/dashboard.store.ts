import { create } from "zustand";
import type {
  TWidget,
  TWidgetStatsResponse,
  TWidgetKeys,
} from "@plane/types";

/**
 * Dashboard state managed by Zustand.
 * Server data is fetched via TanStack Query, but we maintain a local cache
 * for synchronous access and imperative operations.
 */
interface DashboardStoreState {
  // error states
  widgetStatsError: { [workspaceSlug: string]: Record<string, Record<TWidgetKeys, any | null>> };
  // data cache
  homeDashboardId: string | null;
  widgetDetails: { [workspaceSlug: string]: Record<string, TWidget[]> };
  widgetStats: { [workspaceSlug: string]: Record<string, Record<TWidgetKeys, TWidgetStatsResponse>> };
}

interface DashboardStoreActions {
  // Sync actions
  setHomeDashboardId: (id: string | null) => void;
  setWidgetDetails: (workspaceSlug: string, dashboardId: string, widgets: TWidget[]) => void;
  setWidgetStats: (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys, stats: TWidgetStatsResponse) => void;
  setWidgetStatsError: (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys, error: any | null) => void;
  updateWidgetInDetails: (workspaceSlug: string, dashboardId: string, widgetIndex: number, widget: TWidget) => void;
  // Getters
  getHomeDashboardWidgets: (workspaceSlug: string | null) => TWidget[] | undefined;
  getWidgetDetails: (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => TWidget | undefined;
  getWidgetStats: <T>(workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => T | undefined;
  getWidgetStatsError: (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => any | null;
}

export type DashboardStore = DashboardStoreState & DashboardStoreActions;

const initialState: DashboardStoreState = {
  widgetStatsError: {},
  homeDashboardId: null,
  widgetDetails: {},
  widgetStats: {},
};

export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  ...initialState,

  setHomeDashboardId: (id) => {
    set({ homeDashboardId: id });
  },

  setWidgetDetails: (workspaceSlug, dashboardId, widgets) => {
    set((state) => {
      const newWidgetDetails = { ...state.widgetDetails };
      if (!newWidgetDetails[workspaceSlug]) {
        newWidgetDetails[workspaceSlug] = {};
      }
      newWidgetDetails[workspaceSlug][dashboardId] = widgets;
      return { widgetDetails: newWidgetDetails };
    });
  },

  setWidgetStats: (workspaceSlug, dashboardId, widgetKey, stats) => {
    set((state) => {
      const newWidgetStats = JSON.parse(JSON.stringify(state.widgetStats));
      if (!newWidgetStats[workspaceSlug]) {
        newWidgetStats[workspaceSlug] = {};
      }
      if (!newWidgetStats[workspaceSlug][dashboardId]) {
        newWidgetStats[workspaceSlug][dashboardId] = {};
      }
      newWidgetStats[workspaceSlug][dashboardId][widgetKey] = stats;
      return { widgetStats: newWidgetStats };
    });
  },

  setWidgetStatsError: (workspaceSlug, dashboardId, widgetKey, error) => {
    set((state) => {
      const newWidgetStatsError = JSON.parse(JSON.stringify(state.widgetStatsError));
      if (!newWidgetStatsError[workspaceSlug]) {
        newWidgetStatsError[workspaceSlug] = {};
      }
      if (!newWidgetStatsError[workspaceSlug][dashboardId]) {
        newWidgetStatsError[workspaceSlug][dashboardId] = {};
      }
      newWidgetStatsError[workspaceSlug][dashboardId][widgetKey] = error;
      return { widgetStatsError: newWidgetStatsError };
    });
  },

  updateWidgetInDetails: (workspaceSlug, dashboardId, widgetIndex, widget) => {
    set((state) => {
      const newWidgetDetails = { ...state.widgetDetails };
      if (newWidgetDetails[workspaceSlug]?.[dashboardId]) {
        const widgets = [...newWidgetDetails[workspaceSlug][dashboardId]];
        widgets[widgetIndex] = widget;
        newWidgetDetails[workspaceSlug][dashboardId] = widgets;
      }
      return { widgetDetails: newWidgetDetails };
    });
  },

  getHomeDashboardWidgets: (workspaceSlug) => {
    if (!workspaceSlug) return undefined;
    const { homeDashboardId, widgetDetails } = get();
    return homeDashboardId ? widgetDetails?.[workspaceSlug]?.[homeDashboardId] : undefined;
  },

  getWidgetDetails: (workspaceSlug, dashboardId, widgetKey) => {
    const widgets = get().widgetDetails?.[workspaceSlug]?.[dashboardId];
    if (!widgets) return undefined;
    return widgets.find((widget) => widget.key === widgetKey);
  },

  getWidgetStats: <T>(workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys): T | undefined => {
    return (get().widgetStats?.[workspaceSlug]?.[dashboardId]?.[widgetKey] as unknown as T) ?? undefined;
  },

  getWidgetStatsError: (workspaceSlug, dashboardId, widgetKey) => {
    return get().widgetStatsError?.[workspaceSlug]?.[dashboardId]?.[widgetKey] ?? null;
  },
}));

/**
 * Legacy interface for backward compatibility.
 * @deprecated Use DashboardStore type directly
 */
export interface IDashboardStore {
  // error states
  widgetStatsError: { [workspaceSlug: string]: Record<string, Record<TWidgetKeys, any | null>> };
  // observables
  homeDashboardId: string | null;
  widgetDetails: { [workspaceSlug: string]: Record<string, TWidget[]> };
  widgetStats: { [workspaceSlug: string]: Record<string, Record<TWidgetKeys, TWidgetStatsResponse>> };
  // computed
  homeDashboardWidgets: TWidget[] | undefined;
  // computed actions
  getWidgetDetails: (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => TWidget | undefined;
  getWidgetStats: <T>(workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => T | undefined;
  getWidgetStatsError: (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => any | null;
}
