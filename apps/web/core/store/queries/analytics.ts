"use client";

import { useQuery } from "@tanstack/react-query";
import type { IAnalyticsResponse, TAnalyticsTabsBase, TAnalyticsGraphsBase, TAnalyticsFilterParams } from "@plane/types";
import { AnalyticsService } from "@/services/analytics.service";
import { queryKeys } from "./query-keys";

// Service instance
const analyticsService = new AnalyticsService();

/**
 * Hook to fetch advanced analytics data.
 * Replaces MobX AnalyticsStore for read operations.
 *
 * @example
 * const { data: analytics, isLoading } = useAdvanceAnalytics(workspaceSlug, "overview", params);
 */
export function useAdvanceAnalytics<T extends IAnalyticsResponse>(
  workspaceSlug: string,
  tab: TAnalyticsTabsBase,
  params?: TAnalyticsFilterParams,
  isPeekView?: boolean
) {
  return useQuery({
    queryKey: queryKeys.analytics.advance(workspaceSlug, tab, params),
    queryFn: () => analyticsService.getAdvanceAnalytics<T>(workspaceSlug, tab, params, isPeekView),
    enabled: !!workspaceSlug && !!tab,
    staleTime: 2 * 60 * 1000, // 2 minutes - analytics can change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch advanced analytics stats.
 * Replaces MobX AnalyticsStore for stats operations.
 *
 * @example
 * const { data: stats, isLoading } = useAdvanceAnalyticsStats(workspaceSlug, "work-items", params);
 */
export function useAdvanceAnalyticsStats<T>(
  workspaceSlug: string,
  tab: Exclude<TAnalyticsTabsBase, "overview">,
  params?: TAnalyticsFilterParams,
  isPeekView?: boolean
) {
  return useQuery({
    queryKey: queryKeys.analytics.stats(workspaceSlug, tab, params),
    queryFn: () => analyticsService.getAdvanceAnalyticsStats<T>(workspaceSlug, tab, params, isPeekView),
    enabled: !!workspaceSlug && !!tab,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch advanced analytics charts data.
 * Replaces MobX AnalyticsStore for charts operations.
 *
 * @example
 * const { data: charts, isLoading } = useAdvanceAnalyticsCharts(workspaceSlug, "work-items", params);
 */
export function useAdvanceAnalyticsCharts<T>(
  workspaceSlug: string,
  tab: TAnalyticsGraphsBase,
  params?: TAnalyticsFilterParams,
  isPeekView?: boolean
) {
  return useQuery({
    queryKey: queryKeys.analytics.charts(workspaceSlug, tab, params),
    queryFn: () => analyticsService.getAdvanceAnalyticsCharts<T>(workspaceSlug, tab, params, isPeekView),
    enabled: !!workspaceSlug && !!tab,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
