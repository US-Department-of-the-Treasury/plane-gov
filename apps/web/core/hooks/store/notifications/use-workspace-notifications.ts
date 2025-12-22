"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  TNotification,
  TNotificationFilter,
  TNotificationLite,
  TNotificationPaginatedInfo,
  TNotificationPaginatedInfoQueryParams,
  TUnreadNotificationsCount,
} from "@plane/types";
import type { TNotificationTab } from "@plane/constants";
import { ENotificationTab, ENotificationLoader, ENotificationQueryParamType, ENotificationFilterType } from "@plane/constants";
import {
  useUnreadNotificationsCount as useTanStackUnreadNotificationsCount,
  useNotifications as useTanStackNotifications,
  useUpdateNotification,
  useMarkNotificationAsRead,
  useMarkNotificationAsUnread,
  useArchiveNotification,
  useUnarchiveNotification,
  useSnoozeNotification,
  useUnsnoozeNotification,
  useMarkAllNotificationsAsRead as useTanStackMarkAllNotificationsAsRead,
  getNotificationById,
  filterNotificationsByReadStatus,
  filterNotificationsByArchivedStatus,
} from "@/store/queries";

// Re-export individual hooks for direct usage
export {
  useUpdateNotification,
  useMarkNotificationAsRead,
  useMarkNotificationAsUnread,
  useArchiveNotification,
  useUnarchiveNotification,
  useSnoozeNotification,
  useUnsnoozeNotification,
  getNotificationById,
  filterNotificationsByReadStatus,
  filterNotificationsByArchivedStatus,
};

type TNotificationLoader = ENotificationLoader | undefined;
type TNotificationQueryParamType = ENotificationQueryParamType;

/**
 * Backward-compatible hook that wraps TanStack Query hooks with local UI state.
 * Provides the same interface as the old MobX WorkspaceNotificationStore.
 *
 * @param workspaceSlug - Optional workspace slug to automatically fetch notifications
 *
 * @example
 * const { loader, filters, updateFilters, getNotifications, markAllNotificationsAsRead } = useWorkspaceNotifications(workspaceSlug);
 */
export function useWorkspaceNotifications(workspaceSlug?: string) {
  // Local UI state
  const [currentNotificationTab, setCurrentNotificationTab] = useState<TNotificationTab>(ENotificationTab.ALL);
  const [currentSelectedNotificationId, setCurrentSelectedNotificationId] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState<TNotificationFilter>({
    type: {
      [ENotificationFilterType.ASSIGNED]: false,
      [ENotificationFilterType.CREATED]: false,
      [ENotificationFilterType.SUBSCRIBED]: false,
    },
    snoozed: false,
    archived: false,
    read: false,
  });
  const [loader, setLoader] = useState<TNotificationLoader>(undefined);

  // Build query params from filters
  const queryParams = useMemo<TNotificationPaginatedInfoQueryParams>(() => {
    const typeFilters = Object.entries(filters.type)
      .filter(([_, enabled]) => enabled)
      .map(([type]) => type);

    return {
      type: typeFilters.length > 0 ? typeFilters.join(",") : undefined,
      snoozed: filters.snoozed || undefined,
      archived: filters.archived || undefined,
      read: filters.read || undefined,
      mentioned: undefined,
    };
  }, [filters]);

  // TanStack Query hooks - only enabled when workspaceSlug is provided
  const unreadCountQuery = useTanStackUnreadNotificationsCount(workspaceSlug || "");
  const notificationsQuery = useTanStackNotifications(workspaceSlug || "", queryParams);
  const markAllAsReadMutation = useTanStackMarkAllNotificationsAsRead();

  // Derived data from TanStack Query
  const unreadCountData = useMemo<TUnreadNotificationsCount>(
    () =>
      unreadCountQuery.data || {
        total_unread_notifications_count: 0,
        mention_unread_notifications_count: 0,
      },
    [unreadCountQuery.data]
  );

  const notificationsData = useMemo(() => notificationsQuery.data, [notificationsQuery.data]);

  // Helper functions
  const updateFilters = useCallback(<T extends keyof TNotificationFilter>(key: T, value: TNotificationFilter[T]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const updateBulkFilters = useCallback((newFilters: Partial<TNotificationFilter>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const setUnreadNotificationsCount = useCallback((type: "increment" | "decrement", newCount?: number) => {
    // This is kept for backward compatibility but doesn't update the actual query cache
    // The actual count is managed by TanStack Query through mutations
    console.warn("setUnreadNotificationsCount is deprecated. TanStack Query manages counts automatically.");
  }, []);

  // Fetch functions that match the old MobX interface
  const getUnreadNotificationsCount = useCallback(
    async (slug: string): Promise<TUnreadNotificationsCount | undefined> => {
      try {
        // Return the current query data if available, or refetch
        if (slug === workspaceSlug && unreadCountQuery.data) {
          return unreadCountQuery.data;
        }
        // For different workspaceSlug, this would need to trigger a new query
        // For now, return current data
        return unreadCountQuery.data;
      } catch (error) {
        console.error("Error fetching unread notifications count:", error);
        return undefined;
      }
    },
    [workspaceSlug, unreadCountQuery.data]
  );

  const getNotifications = useCallback(
    async (
      slug: string,
      loaderType?: TNotificationLoader,
      queryCursorType?: TNotificationQueryParamType
    ): Promise<TNotificationPaginatedInfo | undefined> => {
      try {
        if (loaderType) {
          setLoader(loaderType);
        }

        // Return the current query data if available
        if (slug === workspaceSlug && notificationsQuery.data) {
          return notificationsQuery.data;
        }

        // Refetch if needed
        const result = await notificationsQuery.refetch();
        return result.data;
      } catch (error) {
        console.error("Error fetching notifications:", error);
        return undefined;
      } finally {
        setLoader(undefined);
      }
    },
    [workspaceSlug, notificationsQuery]
  );

  const markAllNotificationsAsRead = useCallback(
    async (slug: string): Promise<void> => {
      try {
        setLoader(ENotificationLoader.MARK_ALL_AS_READY);
        await markAllAsReadMutation.mutateAsync({
          workspaceSlug: slug,
          params: queryParams,
        });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        throw error;
      } finally {
        setLoader(undefined);
      }
    },
    [markAllAsReadMutation, queryParams]
  );

  // Computed functions
  const notificationIdsByWorkspaceId = useCallback(
    (workspaceId: string): string[] | undefined => {
      if (!notificationsData?.results) return undefined;
      return notificationsData.results.filter((n) => n.workspace === workspaceId).map((n) => n.id);
    },
    [notificationsData]
  );

  const notificationLiteByNotificationId = useCallback(
    (notificationId: string | undefined): TNotificationLite => {
      const defaultLite: TNotificationLite = {
        workspace_slug: workspaceSlug,
        project_id: undefined,
        notification_id: undefined,
        issue_id: undefined,
        is_inbox_issue: undefined,
      };

      if (!notificationId || !notificationsData?.results) return defaultLite;

      const notification = notificationsData.results.find((n) => n.id === notificationId);
      if (!notification) return defaultLite;

      return {
        workspace_slug: workspaceSlug,
        project_id: notification.project,
        notification_id: notification.id,
        issue_id: notification.data?.issue?.id,
        is_inbox_issue: notification.is_inbox_issue || false,
      };
    },
    [notificationsData, workspaceSlug]
  );

  const mutateNotifications = useCallback(
    (notifications: TNotification[]) => {
      // This is kept for backward compatibility but doesn't directly mutate the query cache
      // Consider migrating to use TanStack Query's setQueryData if needed
      console.warn("mutateNotifications is deprecated. Use TanStack Query mutations instead.");
    },
    []
  );

  // Computed values
  const paginationInfo = useMemo(() => {
    if (!notificationsData) return undefined;
    const { results, ...rest } = notificationsData;
    return rest;
  }, [notificationsData]);

  const notifications = useMemo(() => {
    if (!notificationsData?.results) return {};
    return notificationsData.results.reduce(
      (acc, notification) => {
        acc[notification.id] = notification as any; // Type cast for compatibility
        return acc;
      },
      {} as Record<string, any>
    );
  }, [notificationsData]);

  // Update loader state based on query states
  useMemo(() => {
    if (notificationsQuery.isFetching && !loader) {
      setLoader(ENotificationLoader.MUTATION_LOADER);
    } else if (!notificationsQuery.isFetching && loader) {
      setLoader(undefined);
    }
  }, [notificationsQuery.isFetching, loader]);

  return {
    // Observable state
    loader: loader || (notificationsQuery.isLoading ? ENotificationLoader.INIT_LOADER : undefined),
    unreadNotificationsCount: unreadCountData,
    notifications,
    currentNotificationTab,
    currentSelectedNotificationId,
    paginationInfo,
    filters,

    // Computed functions
    notificationIdsByWorkspaceId,
    notificationLiteByNotificationId,

    // Helper actions
    mutateNotifications,
    updateFilters,
    updateBulkFilters,

    // Actions
    setCurrentNotificationTab,
    setCurrentSelectedNotificationId,
    setUnreadNotificationsCount,
    getUnreadNotificationsCount,
    getNotifications,
    markAllNotificationsAsRead,

    // TanStack Query states (for debugging/advanced usage)
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    isError: notificationsQuery.isError || unreadCountQuery.isError,
    error: notificationsQuery.error || unreadCountQuery.error,
  };
}
