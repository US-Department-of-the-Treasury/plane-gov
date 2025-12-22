import { useMemo, useCallback } from "react";
import type { TNotification, TNotificationPaginatedInfoQueryParams } from "@plane/types";
import {
  useNotifications,
  getNotificationById,
  useUpdateNotification,
  useMarkNotificationAsRead,
  useMarkNotificationAsUnread,
  useArchiveNotification,
  useUnarchiveNotification,
  useSnoozeNotification,
  useUnsnoozeNotification,
} from "@/store/queries";

/**
 * Hook to get a single notification by ID with action methods.
 * This replaces the MobX-based useNotification hook.
 * Provides backward compatibility by returning an object with asJson and action methods.
 *
 * @param workspaceSlug - The workspace slug
 * @param params - Query parameters for fetching notifications
 * @param notificationId - The notification ID to retrieve
 * @returns Object with notification data (asJson) and action methods
 *
 * @example
 * const { asJson: notification, markNotificationAsRead } = useNotification(workspaceSlug, params, notificationId);
 */
export const useNotification = (
  workspaceSlug: string,
  params: TNotificationPaginatedInfoQueryParams,
  notificationId: string | undefined
) => {
  const { data: notifications } = useNotifications(workspaceSlug, params);
  const notification = getNotificationById(notifications, notificationId);

  // Mutation hooks
  const updateMutation = useUpdateNotification();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAsUnreadMutation = useMarkNotificationAsUnread();
  const archiveMutation = useArchiveNotification();
  const unarchiveMutation = useUnarchiveNotification();
  const snoozeMutation = useSnoozeNotification();
  const unsnoozeMutation = useUnsnoozeNotification();

  // Action methods that match the MobX interface
  // mutateNotification is a no-op for backward compatibility
  // In TanStack Query, optimistic updates are handled by the mutations themselves
  const mutateNotification = useCallback((_notification: Partial<TNotification>) => {
    // No-op for backward compatibility with MobX interface
    // TanStack Query handles optimistic updates in mutation hooks
  }, []);

  const updateNotification = useCallback(
    async (ws: string, payload: Partial<TNotification>) => {
      if (!notificationId) return undefined;
      return updateMutation.mutateAsync({ workspaceSlug: ws, notificationId, data: payload });
    },
    [notificationId, updateMutation]
  );
  const markNotificationAsRead = useCallback(
    async (ws: string) => {
      if (!notificationId) return undefined;
      return markAsReadMutation.mutateAsync({ workspaceSlug: ws, notificationId });
    },
    [notificationId, markAsReadMutation]
  );

  const markNotificationAsUnRead = useCallback(
    async (ws: string) => {
      if (!notificationId) return undefined;
      return markAsUnreadMutation.mutateAsync({ workspaceSlug: ws, notificationId });
    },
    [notificationId, markAsUnreadMutation]
  );

  const archiveNotification = useCallback(
    async (ws: string) => {
      if (!notificationId) return undefined;
      return archiveMutation.mutateAsync({ workspaceSlug: ws, notificationId });
    },
    [notificationId, archiveMutation]
  );

  const unArchiveNotification = useCallback(
    async (ws: string) => {
      if (!notificationId) return undefined;
      return unarchiveMutation.mutateAsync({ workspaceSlug: ws, notificationId });
    },
    [notificationId, unarchiveMutation]
  );

  const snoozeNotification = useCallback(
    async (ws: string, snoozeTill: Date) => {
      if (!notificationId) return undefined;
      return snoozeMutation.mutateAsync({ workspaceSlug: ws, notificationId, snoozeTill });
    },
    [notificationId, snoozeMutation]
  );

  const unSnoozeNotification = useCallback(
    async (ws: string) => {
      if (!notificationId) return undefined;
      return unsnoozeMutation.mutateAsync({ workspaceSlug: ws, notificationId });
    },
    [notificationId, unsnoozeMutation]
  );

  // Return object with MobX-compatible interface
  // Spread notification properties directly for backward compatibility with consumers
  // expecting INotification properties on the return object
  return useMemo(
    () => ({
      ...notification,
      asJson: notification,
      mutateNotification,
      updateNotification,
      markNotificationAsRead,
      markNotificationAsUnRead,
      archiveNotification,
      unArchiveNotification,
      snoozeNotification,
      unSnoozeNotification,
    }),
    [
      notification,
      mutateNotification,
      updateNotification,
      markNotificationAsRead,
      markNotificationAsUnRead,
      archiveNotification,
      unArchiveNotification,
      snoozeNotification,
      unSnoozeNotification,
    ]
  );
};
