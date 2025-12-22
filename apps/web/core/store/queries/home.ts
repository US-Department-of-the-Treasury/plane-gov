"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderBy } from "lodash-es";
import type { THomeWidgetKeys, TWidgetEntityData } from "@plane/types";
import { WorkspaceService } from "@/services/workspace.service";
import { queryKeys } from "./query-keys";

// Service instance
const workspaceService = new WorkspaceService();

/**
 * Hook to fetch workspace home widgets.
 * Replaces MobX HomeStore.fetchWidgets for read operations.
 *
 * @example
 * const { data: widgets, isLoading } = useHomeWidgets(workspaceSlug);
 */
export function useHomeWidgets(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.home.widgets(workspaceSlug),
    queryFn: () => workspaceService.fetchWorkspaceWidgets(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

interface ToggleWidgetParams {
  workspaceSlug: string;
  widgetKey: string;
  is_enabled: boolean;
}

/**
 * Hook to toggle a widget on/off with optimistic updates.
 * Replaces MobX HomeStore.toggleWidget for write operations.
 *
 * @example
 * const { mutate: toggleWidget, isPending } = useToggleWidget();
 * toggleWidget({ workspaceSlug, widgetKey: "assigned_issues", is_enabled: true });
 */
export function useToggleWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, widgetKey, is_enabled }: ToggleWidgetParams) =>
      workspaceService.updateWorkspaceWidget(workspaceSlug, widgetKey, { is_enabled }),
    onMutate: async ({ workspaceSlug, widgetKey, is_enabled }) => {
      const queryKey = queryKeys.home.widgets(workspaceSlug);
      await queryClient.cancelQueries({ queryKey });

      const previousWidgets = queryClient.getQueryData<TWidgetEntityData[]>(queryKey);

      if (previousWidgets) {
        const updatedWidgets = previousWidgets.map((widget) =>
          widget.key === widgetKey ? { ...widget, is_enabled } : widget
        );
        queryClient.setQueryData<TWidgetEntityData[]>(queryKey, updatedWidgets);
      }

      return { previousWidgets, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWidgets && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.home.widgets(context.workspaceSlug), context.previousWidgets);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.widgets(workspaceSlug) });
    },
  });
}

interface ReorderWidgetParams {
  workspaceSlug: string;
  widgetKey: string;
  destinationId: string;
  edge: string | undefined;
}

/**
 * Hook to reorder widgets with optimistic updates.
 * Replaces MobX HomeStore.reorderWidget for write operations.
 *
 * @example
 * const { mutate: reorderWidget, isPending } = useReorderWidget();
 * reorderWidget({ workspaceSlug, widgetKey: "assigned_issues", destinationId: "created_issues", edge: "reorder-above" });
 */
export function useReorderWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceSlug, widgetKey, destinationId, edge }: ReorderWidgetParams) => {
      const queryKey = queryKeys.home.widgets(workspaceSlug);
      const widgets = queryClient.getQueryData<TWidgetEntityData[]>(queryKey);

      if (!widgets) throw new Error("Widgets not found");

      // Build widgets map for easier lookup
      const widgetsMap = widgets.reduce((acc, widget) => {
        acc[widget.key] = widget;
        return acc;
      }, {} as Record<string, TWidgetEntityData>);

      // Calculate new sort order
      let resultSequence = 10000;
      if (edge) {
        const sortedIds = orderBy(Object.values(widgetsMap), "sort_order", "desc").map((widget) => widget.key);
        const destinationSequence = widgetsMap[destinationId]?.sort_order;

        if (destinationSequence !== undefined) {
          const destinationIndex = sortedIds.findIndex((id) => id === destinationId);
          if (edge === "reorder-above") {
            const prevSequence = widgetsMap[sortedIds[destinationIndex - 1]]?.sort_order;
            if (prevSequence !== undefined) {
              resultSequence = (destinationSequence + prevSequence) / 2;
            } else {
              resultSequence = destinationSequence + resultSequence;
            }
          } else {
            resultSequence = destinationSequence - resultSequence;
          }
        }
      }

      return workspaceService.updateWorkspaceWidget(workspaceSlug, widgetKey, {
        sort_order: resultSequence,
      });
    },
    onMutate: async ({ workspaceSlug, widgetKey, destinationId, edge }) => {
      const queryKey = queryKeys.home.widgets(workspaceSlug);
      await queryClient.cancelQueries({ queryKey });

      const previousWidgets = queryClient.getQueryData<TWidgetEntityData[]>(queryKey);

      if (previousWidgets) {
        // Build widgets map
        const widgetsMap = previousWidgets.reduce((acc, widget) => {
          acc[widget.key] = widget;
          return acc;
        }, {} as Record<string, TWidgetEntityData>);

        // Calculate new sort order (same logic as mutationFn)
        let resultSequence = 10000;
        if (edge) {
          const sortedIds = orderBy(Object.values(widgetsMap), "sort_order", "desc").map((widget) => widget.key);
          const destinationSequence = widgetsMap[destinationId]?.sort_order;

          if (destinationSequence !== undefined) {
            const destinationIndex = sortedIds.findIndex((id) => id === destinationId);
            if (edge === "reorder-above") {
              const prevSequence = widgetsMap[sortedIds[destinationIndex - 1]]?.sort_order;
              if (prevSequence !== undefined) {
                resultSequence = (destinationSequence + prevSequence) / 2;
              } else {
                resultSequence = destinationSequence + resultSequence;
              }
            } else {
              resultSequence = destinationSequence - resultSequence;
            }
          }
        }

        // Update the widget with new sort order
        const updatedWidgets = previousWidgets.map((widget) =>
          widget.key === widgetKey ? { ...widget, sort_order: resultSequence } : widget
        );

        queryClient.setQueryData<TWidgetEntityData[]>(queryKey, updatedWidgets);
      }

      return { previousWidgets, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousWidgets && context.workspaceSlug) {
        queryClient.setQueryData(queryKeys.home.widgets(context.workspaceSlug), context.previousWidgets);
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.widgets(workspaceSlug) });
    },
  });
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Check if any widget is enabled.
 *
 * @example
 * const { data: widgets } = useHomeWidgets(workspaceSlug);
 * const isAnyEnabled = isAnyWidgetEnabled(widgets);
 */
export function isAnyWidgetEnabled(widgets: TWidgetEntityData[] | undefined): boolean {
  if (!widgets) return false;
  return widgets.some((widget) => widget.is_enabled);
}

/**
 * Get widgets ordered by sort_order descending.
 *
 * @example
 * const { data: widgets } = useHomeWidgets(workspaceSlug);
 * const ordered = getOrderedWidgets(widgets);
 */
export function getOrderedWidgets(widgets: TWidgetEntityData[] | undefined): THomeWidgetKeys[] {
  if (!widgets) return [];
  return orderBy(widgets, "sort_order", "desc").map((widget) => widget.key);
}

/**
 * Get widget by key from widgets array.
 *
 * @example
 * const { data: widgets } = useHomeWidgets(workspaceSlug);
 * const widget = getWidgetByKey(widgets, "assigned_issues");
 */
export function getWidgetByKey(
  widgets: TWidgetEntityData[] | undefined,
  widgetKey: string
): TWidgetEntityData | undefined {
  if (!widgets) return undefined;
  return widgets.find((widget) => widget.key === widgetKey);
}

/**
 * Build widgets map keyed by widget key for fast lookups.
 *
 * @example
 * const { data: widgets } = useHomeWidgets(workspaceSlug);
 * const widgetsMap = buildWidgetsMap(widgets);
 * const widget = widgetsMap["assigned_issues"];
 */
export function buildWidgetsMap(
  widgets: TWidgetEntityData[] | undefined
): Record<string, TWidgetEntityData> {
  if (!widgets) return {};
  return widgets.reduce((acc, widget) => {
    acc[widget.key] = widget;
    return acc;
  }, {} as Record<string, TWidgetEntityData>);
}
