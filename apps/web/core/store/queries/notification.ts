"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TNotification,
  TNotificationPaginatedInfo,
  TNotificationPaginatedInfoQueryParams,
  TUnreadNotificationsCount,
} from "@plane/types";
import workspaceNotificationService from "@/services/workspace-notification.service";
import { queryKeys } from "./query-keys";

/**
 * Hook to fetch unread notifications count for a workspace.
 * Replaces MobX WorkspaceNotificationStore.getUnreadNotificationsCount for read operations.
 *
 * @example
 * const { data: unreadCount, isLoading } = useUnreadNotificationsCount(workspaceSlug);
 */
export function useUnreadNotificationsCount(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(workspaceSlug),
    queryFn: async () => {
      const result = await workspaceNotificationService.fetchUnreadNotificationsCount(workspaceSlug);
      // Ensure we never return undefined to TanStack Query
      return result ?? { total_unread_notifications_count: 0, mention_unread_notifications_count: 0 };
    },
    enabled: !!workspaceSlug,
    staleTime: 1 * 60 * 1000, // 1 minute - notifications change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Provide initial data to prevent undefined state
    placeholderData: { total_unread_notifications_count: 0, mention_unread_notifications_count: 0 },
  });
}

/**
 * Hook to fetch notifications for a workspace with filters.
 * Replaces MobX WorkspaceNotificationStore.getNotifications for read operations.
 *
 * @example
 * const { data: notifications, isLoading } = useNotifications(workspaceSlug, { snoozed: false, archived: false });
 */
export function useNotifications(workspaceSlug: string, params: TNotificationPaginatedInfoQueryParams) {
  return useQuery({
    queryKey: queryKeys.notifications.filtered(workspaceSlug, params),
    queryFn: () => workspaceNotificationService.fetchNotifications(workspaceSlug, params),
    enabled: !!workspaceSlug,
    staleTime: 30 * 1000, // 30 seconds - notifications should be fresh
    gcTime: 5 * 60 * 1000,
  });
}

interface UpdateNotificationParams {
  workspaceSlug: string;
  notificationId: string;
  data: Partial<TNotification>;
}

/**
 * Hook to update a notification with optimistic updates.
 * Replaces MobX Notification.updateNotification for write operations.
 *
 * @example
 * const { mutate: updateNotification, isPending } = useUpdateNotification();
 * updateNotification({ workspaceSlug, notificationId, data: { read_at: new Date().toISOString() } });
 */
export function useUpdateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, notificationId, data }: UpdateNotificationParams) =>
      workspaceNotificationService.updateNotificationById(workspaceSlug, notificationId, data),
    onMutate: async ({ workspaceSlug, notificationId, data }) => {
      // Cancel outgoing queries for this workspace
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });

      // Get all notification queries for this workspace
      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      // Optimistically update all matching queries
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) =>
            notification.id === notificationId ? { ...notification, ...data } : notification
          );
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      return { queriesCache, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.queriesCache) {
        context.queriesCache.forEach(([queryKey, oldData]) => {
          if (oldData) {
            queryClient.setQueryData(queryKey, oldData);
          }
        });
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
    },
  });
}

interface MarkNotificationAsReadParams {
  workspaceSlug: string;
  notificationId: string;
}

/**
 * Hook to mark a notification as read with optimistic updates.
 * Replaces MobX Notification.markNotificationAsRead for write operations.
 *
 * @example
 * const { mutate: markAsRead, isPending } = useMarkNotificationAsRead();
 * markAsRead({ workspaceSlug, notificationId });
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, notificationId }: MarkNotificationAsReadParams) =>
      workspaceNotificationService.markNotificationAsRead(workspaceSlug, notificationId),
    onMutate: async ({ workspaceSlug, notificationId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.unreadCount(workspaceSlug) });

      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      const previousUnreadCount = queryClient.getQueryData<TUnreadNotificationsCount>(
        queryKeys.notifications.unreadCount(workspaceSlug)
      );

      // Optimistically update notification
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read_at: new Date().toISOString() }
              : notification
          );
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      // Optimistically decrement unread count
      if (previousUnreadCount) {
        queryClient.setQueryData<TUnreadNotificationsCount>(queryKeys.notifications.unreadCount(workspaceSlug), {
          total_unread_notifications_count: Math.max(0, previousUnreadCount.total_unread_notifications_count - 1),
          mention_unread_notifications_count: previousUnreadCount.mention_unread_notifications_count,
        });
      }

      return { queriesCache, previousUnreadCount, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.queriesCache) {
          context.queriesCache.forEach(([queryKey, oldData]) => {
            if (oldData) {
              queryClient.setQueryData(queryKey, oldData);
            }
          });
        }
        if (context.previousUnreadCount) {
          queryClient.setQueryData(
            queryKeys.notifications.unreadCount(context.workspaceSlug),
            context.previousUnreadCount
          );
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(workspaceSlug) });
    },
  });
}

/**
 * Hook to mark a notification as unread with optimistic updates.
 * Replaces MobX Notification.markNotificationAsUnRead for write operations.
 *
 * @example
 * const { mutate: markAsUnread, isPending } = useMarkNotificationAsUnread();
 * markAsUnread({ workspaceSlug, notificationId });
 */
export function useMarkNotificationAsUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, notificationId }: MarkNotificationAsReadParams) =>
      workspaceNotificationService.markNotificationAsUnread(workspaceSlug, notificationId),
    onMutate: async ({ workspaceSlug, notificationId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.unreadCount(workspaceSlug) });

      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      const previousUnreadCount = queryClient.getQueryData<TUnreadNotificationsCount>(
        queryKeys.notifications.unreadCount(workspaceSlug)
      );

      // Optimistically update notification
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) =>
            notification.id === notificationId ? { ...notification, read_at: undefined } : notification
          );
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      // Optimistically increment unread count
      if (previousUnreadCount) {
        queryClient.setQueryData<TUnreadNotificationsCount>(queryKeys.notifications.unreadCount(workspaceSlug), {
          total_unread_notifications_count: previousUnreadCount.total_unread_notifications_count + 1,
          mention_unread_notifications_count: previousUnreadCount.mention_unread_notifications_count,
        });
      }

      return { queriesCache, previousUnreadCount, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.queriesCache) {
          context.queriesCache.forEach(([queryKey, oldData]) => {
            if (oldData) {
              queryClient.setQueryData(queryKey, oldData);
            }
          });
        }
        if (context.previousUnreadCount) {
          queryClient.setQueryData(
            queryKeys.notifications.unreadCount(context.workspaceSlug),
            context.previousUnreadCount
          );
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(workspaceSlug) });
    },
  });
}

/**
 * Hook to archive a notification with optimistic updates.
 * Replaces MobX Notification.archiveNotification for write operations.
 *
 * @example
 * const { mutate: archiveNotification, isPending } = useArchiveNotification();
 * archiveNotification({ workspaceSlug, notificationId });
 */
export function useArchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, notificationId }: MarkNotificationAsReadParams) =>
      workspaceNotificationService.markNotificationAsArchived(workspaceSlug, notificationId),
    onMutate: async ({ workspaceSlug, notificationId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });

      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      // Optimistically update notification
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) =>
            notification.id === notificationId
              ? { ...notification, archived_at: new Date().toISOString() }
              : notification
          );
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      return { queriesCache, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.queriesCache) {
        context.queriesCache.forEach(([queryKey, oldData]) => {
          if (oldData) {
            queryClient.setQueryData(queryKey, oldData);
          }
        });
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
    },
  });
}

/**
 * Hook to unarchive a notification with optimistic updates.
 * Replaces MobX Notification.unArchiveNotification for write operations.
 *
 * @example
 * const { mutate: unarchiveNotification, isPending } = useUnarchiveNotification();
 * unarchiveNotification({ workspaceSlug, notificationId });
 */
export function useUnarchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, notificationId }: MarkNotificationAsReadParams) =>
      workspaceNotificationService.markNotificationAsUnArchived(workspaceSlug, notificationId),
    onMutate: async ({ workspaceSlug, notificationId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });

      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      // Optimistically update notification
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) =>
            notification.id === notificationId ? { ...notification, archived_at: undefined } : notification
          );
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      return { queriesCache, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.queriesCache) {
        context.queriesCache.forEach(([queryKey, oldData]) => {
          if (oldData) {
            queryClient.setQueryData(queryKey, oldData);
          }
        });
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
    },
  });
}

interface SnoozeNotificationParams {
  workspaceSlug: string;
  notificationId: string;
  snoozeTill: Date;
}

/**
 * Hook to snooze a notification with optimistic updates.
 * Replaces MobX Notification.snoozeNotification for write operations.
 *
 * @example
 * const { mutate: snoozeNotification, isPending } = useSnoozeNotification();
 * snoozeNotification({ workspaceSlug, notificationId, snoozeTill: new Date() });
 */
export function useSnoozeNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, notificationId, snoozeTill }: SnoozeNotificationParams) =>
      workspaceNotificationService.updateNotificationById(workspaceSlug, notificationId, {
        snoozed_till: snoozeTill.toISOString(),
      }),
    onMutate: async ({ workspaceSlug, notificationId, snoozeTill }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });

      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      // Optimistically update notification
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) =>
            notification.id === notificationId
              ? { ...notification, snoozed_till: snoozeTill.toISOString() }
              : notification
          );
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      return { queriesCache, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.queriesCache) {
        context.queriesCache.forEach(([queryKey, oldData]) => {
          if (oldData) {
            queryClient.setQueryData(queryKey, oldData);
          }
        });
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
    },
  });
}

/**
 * Hook to unsnooze a notification with optimistic updates.
 * Replaces MobX Notification.unSnoozeNotification for write operations.
 *
 * @example
 * const { mutate: unsnoozeNotification, isPending } = useUnsnoozeNotification();
 * unsnoozeNotification({ workspaceSlug, notificationId });
 */
export function useUnsnoozeNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, notificationId }: MarkNotificationAsReadParams) =>
      workspaceNotificationService.updateNotificationById(workspaceSlug, notificationId, {
        snoozed_till: undefined,
      }),
    onMutate: async ({ workspaceSlug, notificationId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });

      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      // Optimistically update notification
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) =>
            notification.id === notificationId ? { ...notification, snoozed_till: undefined } : notification
          );
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      return { queriesCache, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context?.queriesCache) {
        context.queriesCache.forEach(([queryKey, oldData]) => {
          if (oldData) {
            queryClient.setQueryData(queryKey, oldData);
          }
        });
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
    },
  });
}

interface MarkAllNotificationsAsReadParams {
  workspaceSlug: string;
  params: TNotificationPaginatedInfoQueryParams;
}

/**
 * Hook to mark all notifications as read with optimistic updates.
 * Replaces MobX WorkspaceNotificationStore.markAllNotificationsAsRead for write operations.
 *
 * @example
 * const { mutate: markAllAsRead, isPending } = useMarkAllNotificationsAsRead();
 * markAllAsRead({ workspaceSlug, params: { snoozed: false, archived: false } });
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, params }: MarkAllNotificationsAsReadParams) =>
      workspaceNotificationService.markAllNotificationsAsRead(workspaceSlug, params),
    onMutate: async ({ workspaceSlug }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.unreadCount(workspaceSlug) });

      const queriesCache = queryClient.getQueriesData<TNotificationPaginatedInfo>({
        queryKey: queryKeys.notifications.all(workspaceSlug),
      });

      const previousUnreadCount = queryClient.getQueryData<TUnreadNotificationsCount>(
        queryKeys.notifications.unreadCount(workspaceSlug)
      );

      // Optimistically mark all notifications as read
      queriesCache.forEach(([queryKey, oldData]) => {
        if (oldData?.results) {
          const updatedResults = oldData.results.map((notification) => ({
            ...notification,
            read_at: new Date().toISOString(),
          }));
          queryClient.setQueryData(queryKey, { ...oldData, results: updatedResults });
        }
      });

      // Optimistically set unread count to 0
      queryClient.setQueryData<TUnreadNotificationsCount>(queryKeys.notifications.unreadCount(workspaceSlug), {
        total_unread_notifications_count: 0,
        mention_unread_notifications_count: 0,
      });

      return { queriesCache, previousUnreadCount, workspaceSlug };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.queriesCache) {
          context.queriesCache.forEach(([queryKey, oldData]) => {
            if (oldData) {
              queryClient.setQueryData(queryKey, oldData);
            }
          });
        }
        if (context.previousUnreadCount) {
          queryClient.setQueryData(
            queryKeys.notifications.unreadCount(context.workspaceSlug),
            context.previousUnreadCount
          );
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(workspaceSlug) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(workspaceSlug) });
    },
  });
}

// Utility functions for derived data (used inline by components)

/**
 * Get a notification by ID from notifications list.
 *
 * @example
 * const { data: notifications } = useNotifications(workspaceSlug, params);
 * const notification = getNotificationById(notifications, notificationId);
 */
export function getNotificationById(
  notifications: TNotificationPaginatedInfo | undefined,
  notificationId: string | undefined
): TNotification | undefined {
  if (!notifications?.results || !notificationId) return undefined;
  return notifications.results.find((n) => n.id === notificationId);
}

/**
 * Filter notifications by read status.
 *
 * @example
 * const { data: notifications } = useNotifications(workspaceSlug, params);
 * const unreadNotifications = filterNotificationsByReadStatus(notifications, false);
 */
export function filterNotificationsByReadStatus(
  notifications: TNotificationPaginatedInfo | undefined,
  isRead: boolean
): TNotification[] {
  if (!notifications?.results) return [];
  return notifications.results.filter((n) => (isRead ? !!n.read_at : !n.read_at));
}

/**
 * Filter notifications by archived status.
 *
 * @example
 * const { data: notifications } = useNotifications(workspaceSlug, params);
 * const archivedNotifications = filterNotificationsByArchivedStatus(notifications, true);
 */
export function filterNotificationsByArchivedStatus(
  notifications: TNotificationPaginatedInfo | undefined,
  isArchived: boolean
): TNotification[] {
  if (!notifications?.results) return [];
  return notifications.results.filter((n) => (isArchived ? !!n.archived_at : !n.archived_at));
}
