"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  THomeDashboardResponse,
  TWidget,
  TWidgetFiltersFormData,
  TWidgetStatsResponse,
  TWidgetKeys,
  TWidgetStatsRequestParams,
} from "@plane/types";
import { DashboardService } from "@/services/dashboard.service";
import { queryKeys } from "./query-keys";

// Service instance
const dashboardService = new DashboardService();

/**
 * Hook to fetch home dashboard widgets for a workspace.
 * Replaces MobX DashboardStore.fetchHomeDashboardWidgets for read operations.
 *
 * @example
 * const { data: dashboard, isLoading } = useHomeDashboardWidgets(workspaceSlug);
 * // Access: dashboard.dashboard.id, dashboard.widgets
 */
export function useHomeDashboardWidgets(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.home(workspaceSlug),
    queryFn: () => dashboardService.getHomeDashboardWidgets(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch widget stats for a specific dashboard widget.
 * Replaces MobX DashboardStore.fetchWidgetStats for read operations.
 *
 * @example
 * const { data: stats, isLoading } = useWidgetStats(workspaceSlug, dashboardId, { widget_key: "assigned_issues" });
 */
export function useWidgetStats(
  workspaceSlug: string,
  dashboardId: string,
  params: TWidgetStatsRequestParams
) {
  return useQuery({
    queryKey: queryKeys.dashboard.widgetStats(workspaceSlug, dashboardId, params.widget_key),
    queryFn: () => dashboardService.getWidgetStats(workspaceSlug, dashboardId, params),
    enabled: !!workspaceSlug && !!dashboardId && !!params.widget_key,
    staleTime: 2 * 60 * 1000, // 2 minutes - widget stats may change frequently
    gcTime: 30 * 60 * 1000,
  });
}

interface UpdateDashboardWidgetParams {
  workspaceSlug: string;
  dashboardId: string;
  widgetId: string;
  data: Partial<TWidget>;
}

/**
 * Hook to update a dashboard widget with optimistic updates.
 * Replaces MobX DashboardStore.updateDashboardWidget for write operations.
 *
 * @example
 * const { mutate: updateWidget, isPending } = useUpdateDashboardWidget();
 * updateWidget({ workspaceSlug, dashboardId, widgetId, data: { is_visible: false } });
 */
export function useUpdateDashboardWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dashboardId, widgetId, data }: UpdateDashboardWidgetParams) =>
      dashboardService.updateDashboardWidget(dashboardId, widgetId, data),
    onMutate: async ({ workspaceSlug, dashboardId, widgetId, data }) => {
      const homeQueryKey = queryKeys.dashboard.home(workspaceSlug);
      await queryClient.cancelQueries({ queryKey: homeQueryKey });

      const previousDashboard = queryClient.getQueryData<THomeDashboardResponse>(homeQueryKey);

      if (previousDashboard?.widgets) {
        const updatedWidgets = previousDashboard.widgets.map((widget) =>
          widget.id === widgetId ? { ...widget, ...data } : widget
        );

        queryClient.setQueryData<THomeDashboardResponse>(homeQueryKey, {
          ...previousDashboard,
          widgets: updatedWidgets,
        });
      }

      return { previousDashboard, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDashboard && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.dashboard.home(context.workspaceSlug), context.previousDashboard);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home(workspaceSlug) });
    },
  });
}

interface UpdateDashboardWidgetFiltersParams {
  workspaceSlug: string;
  dashboardId: string;
  widgetId: string;
  data: TWidgetFiltersFormData;
}

/**
 * Hook to update dashboard widget filters with optimistic updates.
 * Replaces MobX DashboardStore.updateDashboardWidgetFilters for write operations.
 *
 * @example
 * const { mutate: updateFilters, isPending } = useUpdateDashboardWidgetFilters();
 * updateFilters({ workspaceSlug, dashboardId, widgetId, data: { widgetKey: "assigned_issues", filters: {...} } });
 */
export function useUpdateDashboardWidgetFilters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dashboardId, widgetId, data }: UpdateDashboardWidgetFiltersParams) => {
      // Get current widget details to merge filters
      const widgetData = {
        filters: data.filters,
      };
      return dashboardService.updateDashboardWidget(dashboardId, widgetId, widgetData);
    },
    onMutate: async ({ workspaceSlug, dashboardId, widgetId, data }) => {
      const homeQueryKey = queryKeys.dashboard.home(workspaceSlug);
      await queryClient.cancelQueries({ queryKey: homeQueryKey });

      const previousDashboard = queryClient.getQueryData<THomeDashboardResponse>(homeQueryKey);

      if (previousDashboard?.widgets) {
        const updatedWidgets = previousDashboard.widgets.map((widget) => {
          if (widget.id === widgetId) {
            return {
              ...widget,
              widget_filters: {
                ...widget.widget_filters,
                ...data.filters,
              },
            };
          }
          return widget;
        });

        queryClient.setQueryData<THomeDashboardResponse>(homeQueryKey, {
          ...previousDashboard,
          widgets: updatedWidgets,
        });
      }

      // Invalidate widget stats for the specific widget
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.widgetStats(workspaceSlug, dashboardId, data.widgetKey),
      });

      return { previousDashboard, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDashboard && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.dashboard.home(context.workspaceSlug), context.previousDashboard);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.home(workspaceSlug) });
    },
  });
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Get widget details by widget key from dashboard response.
 *
 * @example
 * const { data: dashboard } = useHomeDashboardWidgets(workspaceSlug);
 * const widget = getWidgetDetails(dashboard, "assigned_issues");
 */
export function getWidgetDetails(
  dashboard: THomeDashboardResponse | undefined,
  widgetKey: TWidgetKeys
): TWidget | undefined {
  if (!dashboard?.widgets) return undefined;
  return dashboard.widgets.find((widget) => widget.key === widgetKey);
}

/**
 * Get all widgets from dashboard response.
 *
 * @example
 * const { data: dashboard } = useHomeDashboardWidgets(workspaceSlug);
 * const widgets = getWidgets(dashboard);
 */
export function getWidgets(dashboard: THomeDashboardResponse | undefined): TWidget[] {
  return dashboard?.widgets ?? [];
}

/**
 * Get dashboard ID from dashboard response.
 *
 * @example
 * const { data: dashboard } = useHomeDashboardWidgets(workspaceSlug);
 * const dashboardId = getDashboardId(dashboard);
 */
export function getDashboardId(dashboard: THomeDashboardResponse | undefined): string | null {
  return dashboard?.dashboard?.id ?? null;
}
