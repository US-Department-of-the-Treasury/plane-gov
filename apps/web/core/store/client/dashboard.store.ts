import { create } from "zustand";
import { set } from "lodash-es";
import type {
  THomeDashboardResponse,
  TWidget,
  TWidgetFiltersFormData,
  TWidgetStatsResponse,
  TWidgetKeys,
  TWidgetStatsRequestParams,
} from "@plane/types";
import { DashboardService } from "@/services/dashboard.service";

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

// Service instance for legacy wrapper
const dashboardService = new DashboardService();

/**
 * Legacy interface for backward compatibility with MobX store.
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
  // actions
  fetchHomeDashboardWidgets: (workspaceSlug: string) => Promise<THomeDashboardResponse>;
  fetchWidgetStats: (
    workspaceSlug: string,
    dashboardId: string,
    params: TWidgetStatsRequestParams
  ) => Promise<TWidgetStatsResponse>;
  updateDashboardWidget: (
    workspaceSlug: string,
    dashboardId: string,
    widgetId: string,
    data: Partial<TWidget>
  ) => Promise<any>;
  updateDashboardWidgetFilters: (
    workspaceSlug: string,
    dashboardId: string,
    widgetId: string,
    data: TWidgetFiltersFormData
  ) => Promise<any>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks directly in React components
 */
export class DashboardStoreLegacy implements IDashboardStore {
  private rootStore: {
    router: { workspaceSlug: string | null };
    issue: { issues: { addIssue: (issues: any[]) => void } };
  };

  constructor(rootStore: any) {
    this.rootStore = rootStore;
  }

  get widgetStatsError() {
    return useDashboardStore.getState().widgetStatsError;
  }

  get homeDashboardId() {
    return useDashboardStore.getState().homeDashboardId;
  }

  get widgetDetails() {
    return useDashboardStore.getState().widgetDetails;
  }

  get widgetStats() {
    return useDashboardStore.getState().widgetStats;
  }

  get homeDashboardWidgets() {
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    return useDashboardStore.getState().getHomeDashboardWidgets(workspaceSlug);
  }

  getWidgetDetails = (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => {
    return useDashboardStore.getState().getWidgetDetails(workspaceSlug, dashboardId, widgetKey);
  };

  getWidgetStats = <T>(workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys): T | undefined => {
    return useDashboardStore.getState().getWidgetStats<T>(workspaceSlug, dashboardId, widgetKey);
  };

  getWidgetStatsError = (workspaceSlug: string, dashboardId: string, widgetKey: TWidgetKeys) => {
    return useDashboardStore.getState().getWidgetStatsError(workspaceSlug, dashboardId, widgetKey);
  };

  fetchHomeDashboardWidgets = async (workspaceSlug: string): Promise<THomeDashboardResponse> => {
    const { setHomeDashboardId, setWidgetDetails } = useDashboardStore.getState();
    try {
      const response = await dashboardService.getHomeDashboardWidgets(workspaceSlug);
      setHomeDashboardId(response.dashboard.id);
      setWidgetDetails(workspaceSlug, response.dashboard.id, response.widgets);
      return response;
    } catch (error) {
      setHomeDashboardId(null);
      throw error;
    }
  };

  fetchWidgetStats = async (workspaceSlug: string, dashboardId: string, params: TWidgetStatsRequestParams) => {
    const { setWidgetStats, setWidgetStatsError } = useDashboardStore.getState();
    try {
      const res = await dashboardService.getWidgetStats(workspaceSlug, dashboardId, params);
      if (res.issues) {
        this.rootStore.issue.issues.addIssue(res.issues);
      }
      setWidgetStats(workspaceSlug, dashboardId, params.widget_key, res);
      setWidgetStatsError(workspaceSlug, dashboardId, params.widget_key, null);
      return res;
    } catch (error) {
      setWidgetStatsError(workspaceSlug, dashboardId, params.widget_key, error);
      throw error;
    }
  };

  updateDashboardWidget = async (
    workspaceSlug: string,
    dashboardId: string,
    widgetId: string,
    data: Partial<TWidget>
  ): Promise<any> => {
    const { widgetDetails, updateWidgetInDetails } = useDashboardStore.getState();
    const widgets = widgetDetails?.[workspaceSlug]?.[dashboardId];
    if (!widgets) throw new Error("Dashboard not found");

    const widgetIndex = widgets.findIndex((widget) => widget.id === widgetId);
    if (widgetIndex === -1) throw new Error("Widget not found");

    const originalWidget = { ...widgets[widgetIndex] };

    try {
      updateWidgetInDetails(workspaceSlug, dashboardId, widgetIndex, {
        ...widgets[widgetIndex],
        ...data,
      });
      const response = await dashboardService.updateDashboardWidget(dashboardId, widgetId, data);
      return response;
    } catch (error) {
      // Revert on error
      updateWidgetInDetails(workspaceSlug, dashboardId, widgetIndex, originalWidget);
      throw error;
    }
  };

  updateDashboardWidgetFilters = async (
    workspaceSlug: string,
    dashboardId: string,
    widgetId: string,
    data: TWidgetFiltersFormData
  ): Promise<TWidget> => {
    const { widgetDetails, setWidgetDetails } = useDashboardStore.getState();
    const widgetDetailsItem = this.getWidgetDetails(workspaceSlug, dashboardId, data.widgetKey);
    if (!widgetDetailsItem) throw new Error("Widget not found");

    const originalWidgets = widgetDetails?.[workspaceSlug]?.[dashboardId] || [];

    try {
      const updatedWidget = {
        ...widgetDetailsItem,
        widget_filters: {
          ...widgetDetailsItem.widget_filters,
          ...data.filters,
        },
      };

      // Optimistic update
      setWidgetDetails(
        workspaceSlug,
        dashboardId,
        originalWidgets.map((w) => (w.id === widgetId ? updatedWidget : w))
      );

      const response = await this.updateDashboardWidget(workspaceSlug, dashboardId, widgetId, {
        filters: {
          ...widgetDetailsItem.widget_filters,
          ...data.filters,
        },
      });

      return response;
    } catch (error) {
      // Revert on error
      setWidgetDetails(
        workspaceSlug,
        dashboardId,
        originalWidgets.map((w) => (w.id === widgetId ? widgetDetailsItem : w))
      );
      throw error;
    }
  };
}
