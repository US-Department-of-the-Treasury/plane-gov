/**
 * Home hooks using TanStack Query.
 *
 * This file provides both the new TanStack Query hooks and a backward-compatible useHome hook.
 * Replaces the previous MobX-based useHome hook.
 *
 * @example
 * // New API (recommended)
 * import { useHomeWidgets, useToggleWidget } from "@/hooks/store/use-home";
 *
 * const { data: widgets, isLoading } = useHomeWidgets(workspaceSlug);
 * const { mutate: toggleWidget } = useToggleWidget();
 *
 * @example
 * // Backward-compatible API
 * import { useHome } from "@/hooks/store/use-home";
 *
 * const { widgets, toggleWidget, reorderWidget, isLoading } = useHome();
 */

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import type { TWidgetEntityData } from "@plane/types";
import {
  useHomeWidgets as useHomeWidgetsQuery,
  useToggleWidget as useToggleWidgetMutation,
  useReorderWidget as useReorderWidgetMutation,
  isAnyWidgetEnabled as checkAnyWidgetEnabled,
  getOrderedWidgets as getOrderedWidgetsList,
  buildWidgetsMap as buildWidgetsMapUtil,
} from "@/store/queries/home";
import { WorkspaceLinkStore } from "@/store/workspace/link.store";

// Re-export TanStack Query hooks and utilities
export {
  useHomeWidgets,
  useToggleWidget,
  useReorderWidget,
  isAnyWidgetEnabled,
  getOrderedWidgets,
  getWidgetByKey,
  buildWidgetsMap,
} from "@/store/queries/home";

/**
 * Backward-compatible useHome hook.
 * Provides the same API as the previous MobX-based hook.
 *
 * @example
 * const { widgets, widgetsMap, orderedWidgets, toggleWidget, reorderWidget, isLoading } = useHome();
 */
export function useHome() {
  const { workspaceSlug } = useParams();
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);

  // Initialize quickLinks store (MobX) - to be migrated later
  const quickLinks = useMemo(() => new WorkspaceLinkStore(), []);

  // Fetch widgets using TanStack Query
  const { data: widgets, isLoading, refetch } = useHomeWidgetsQuery(workspaceSlug?.toString() ?? "");

  // Get mutation hooks
  const { mutate: toggleWidgetMutation } = useToggleWidgetMutation();
  const { mutate: reorderWidgetMutation } = useReorderWidgetMutation();

  // Derived values
  const widgetsMap = buildWidgetsMapUtil(widgets);
  const orderedWidgets = getOrderedWidgetsList(widgets);
  const isAnyWidgetEnabled = checkAnyWidgetEnabled(widgets);

  // Backward-compatible API functions
  const toggleWidget = async (workspaceSlug: string, widgetKey: string, is_enabled: boolean): Promise<void> => {
    return new Promise((resolve, reject) => {
      toggleWidgetMutation(
        { workspaceSlug, widgetKey, is_enabled },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  const reorderWidget = async (
    workspaceSlug: string,
    widgetKey: string,
    destinationId: string,
    edge: string | undefined
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      reorderWidgetMutation(
        { workspaceSlug, widgetKey, destinationId, edge },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  const fetchWidgets = async (workspaceSlug: string): Promise<TWidgetEntityData[] | undefined> => {
    const result = await refetch();
    return result.data;
  };

  const toggleWidgetSettings = (show: boolean) => {
    setShowWidgetSettings(show);
  };

  return {
    // Data
    widgets,
    widgetsMap,
    orderedWidgets,
    isAnyWidgetEnabled,

    // Loading state
    loading: isLoading,
    isLoading,

    // Actions
    toggleWidget,
    reorderWidget,
    fetchWidgets,

    // Modal state
    showWidgetSettings,
    toggleWidgetSettings,

    // QuickLinks store (MobX - to be migrated)
    quickLinks,
  };
}
