/**
 * Dashboard hooks using TanStack Query.
 *
 * This file re-exports TanStack Query hooks for dashboard functionality.
 * Replaces the previous MobX-based useDashboard hook.
 *
 * @example
 * import { useHomeDashboardWidgets, useUpdateDashboardWidget } from "@/hooks/store/use-dashboard";
 *
 * const { data: dashboard, isLoading } = useHomeDashboardWidgets(workspaceSlug);
 * const { mutate: updateWidget } = useUpdateDashboardWidget();
 */

export {
  useHomeDashboardWidgets,
  useWidgetStats,
  useUpdateDashboardWidget,
  useUpdateDashboardWidgetFilters,
  getWidgetDetails,
  getWidgets,
  getDashboardId,
} from "@/store/queries/dashboard";
