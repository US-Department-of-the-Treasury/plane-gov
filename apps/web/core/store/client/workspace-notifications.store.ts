import { orderBy, isEmpty, update, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { TNotificationTab } from "@plane/constants";
import { ENotificationTab, ENotificationLoader, ENotificationQueryParamType } from "@plane/constants";
import type {
  TNotification,
  TNotificationFilter,
  TNotificationLite,
  TNotificationPaginatedInfo,
  TNotificationPaginatedInfoQueryParams,
  TUnreadNotificationsCount,
} from "@plane/types";
// helpers
import { convertToEpoch } from "@plane/utils";
// services
import workspaceNotificationService from "@/services/workspace-notification.service";
// store
import type { NotificationStore } from "@/store/client/notification.store";
import { createNotificationStore } from "@/store/client/notification.store";
import { getRouterWorkspaceSlug } from "@/store/client/router.store";

type TNotificationLoader = ENotificationLoader | undefined;
type TNotificationQueryParamType = ENotificationQueryParamType;

// State interface
interface WorkspaceNotificationState {
  // observables
  loader: TNotificationLoader;
  unreadNotificationsCount: TUnreadNotificationsCount;
  notifications: Record<string, ReturnType<typeof createNotificationStore>>; // notification_id -> notification store
  currentNotificationTab: TNotificationTab;
  currentSelectedNotificationId: string | undefined;
  paginationInfo: Omit<TNotificationPaginatedInfo, "results"> | undefined;
  filters: TNotificationFilter;
  // constants
  paginatedCount: number;
}

// Actions interface
interface WorkspaceNotificationActions {
  // helper actions
  mutateNotifications: (notifications: TNotification[]) => void;
  updateFilters: <T extends keyof TNotificationFilter>(
    key: T,
    value: TNotificationFilter[T]
  ) => void;
  updateBulkFilters: (filters: Partial<TNotificationFilter>) => void;
  // actions
  setCurrentNotificationTab: (tab: TNotificationTab) => void;
  setCurrentSelectedNotificationId: (notificationId: string | undefined) => void;
  setUnreadNotificationsCount: (type: "increment" | "decrement", newCount?: number) => void;
  getUnreadNotificationsCount: (workspaceSlug: string) => Promise<TUnreadNotificationsCount | undefined>;
  getNotifications: (
    workspaceSlug: string,
    loader?: TNotificationLoader,
    queryCursorType?: TNotificationQueryParamType
  ) => Promise<TNotificationPaginatedInfo | undefined>;
  markAllNotificationsAsRead: (workspaceSlug: string) => Promise<void>;
  // helper functions
  generateNotificationQueryParams: (paramType: TNotificationQueryParamType) => TNotificationPaginatedInfoQueryParams;
}

// Combined store type
export type WorkspaceNotificationStoreType = WorkspaceNotificationState & WorkspaceNotificationActions;

// Initial state
const initialState: WorkspaceNotificationState = {
  loader: undefined,
  unreadNotificationsCount: {
    total_unread_notifications_count: 0,
    mention_unread_notifications_count: 0,
  },
  notifications: {},
  currentNotificationTab: ENotificationTab.ALL,
  currentSelectedNotificationId: undefined,
  paginationInfo: undefined,
  filters: {
    type: {
      assigned: false,
      created: false,
      subscribed: false,
    },
    snoozed: false,
    archived: false,
    read: false,
  },
  paginatedCount: 300,
};

// Zustand store with immer middleware for nested updates
export const useWorkspaceNotificationStore = create<WorkspaceNotificationStoreType>()(
  immer((set, get) => ({
    ...initialState,

    // helper actions
    mutateNotifications: (notifications) => {
      set((state) => {
        (notifications || []).forEach((notification) => {
          if (!notification.id) return;
          if (state.notifications[notification.id]) {
            state.notifications[notification.id].getState().mutateNotification(notification);
          } else {
            state.notifications[notification.id] = createNotificationStore(notification);
          }
        });
      });
    },

    updateFilters: (key, value) => {
      set((state) => {
        lodashSet(state.filters, key, value);
        state.notifications = {};
      });

      const workspaceSlug = getRouterWorkspaceSlug();
      if (!workspaceSlug) return;

      get().getNotifications(workspaceSlug, ENotificationLoader.INIT_LOADER, ENotificationQueryParamType.INIT);
    },

    updateBulkFilters: (filters) => {
      set((state) => {
        Object.entries(filters).forEach(([key, value]) => {
          lodashSet(state.filters, key, value);
        });
        state.notifications = {};
      });

      const workspaceSlug = getRouterWorkspaceSlug();
      if (!workspaceSlug) return;

      get().getNotifications(workspaceSlug, ENotificationLoader.INIT_LOADER, ENotificationQueryParamType.INIT);
    },

    // actions
    setCurrentNotificationTab: (tab) => {
      set((state) => {
        state.currentNotificationTab = tab;
        state.notifications = {};
      });

      const workspaceSlug = getRouterWorkspaceSlug();
      if (!workspaceSlug) return;

      get().getNotifications(workspaceSlug, ENotificationLoader.INIT_LOADER, ENotificationQueryParamType.INIT);
    },

    setCurrentSelectedNotificationId: (notificationId) => {
      set((state) => {
        state.currentSelectedNotificationId = notificationId;
      });
    },

    setUnreadNotificationsCount: (type, newCount = 1) => {
      const validCount = Math.max(0, Math.abs(newCount));

      set((state) => {
        switch (state.currentNotificationTab) {
          case ENotificationTab.ALL:
            state.unreadNotificationsCount.total_unread_notifications_count = Math.max(
              0,
              type === "increment"
                ? state.unreadNotificationsCount.total_unread_notifications_count + validCount
                : state.unreadNotificationsCount.total_unread_notifications_count - validCount
            );
            break;
          case ENotificationTab.MENTIONS:
            state.unreadNotificationsCount.mention_unread_notifications_count = Math.max(
              0,
              type === "increment"
                ? state.unreadNotificationsCount.mention_unread_notifications_count + validCount
                : state.unreadNotificationsCount.mention_unread_notifications_count - validCount
            );
            break;
          default:
            break;
        }
      });
    },

    getUnreadNotificationsCount: async (workspaceSlug) => {
      try {
        const unreadNotificationCount = await workspaceNotificationService.fetchUnreadNotificationsCount(workspaceSlug);
        if (unreadNotificationCount) {
          set((state) => {
            state.unreadNotificationsCount = unreadNotificationCount;
          });
        }
        return unreadNotificationCount || undefined;
      } catch (error) {
        console.error("WorkspaceNotificationStore -> getUnreadNotificationsCount -> error", error);
        throw error;
      }
    },

    getNotifications: async (workspaceSlug, loader = ENotificationLoader.INIT_LOADER, queryParamType = ENotificationQueryParamType.INIT) => {
      set((state) => {
        state.loader = loader;
      });

      try {
        const queryParams = get().generateNotificationQueryParams(queryParamType);
        await get().getUnreadNotificationsCount(workspaceSlug);
        const notificationResponse = await workspaceNotificationService.fetchNotifications(workspaceSlug, queryParams);

        if (notificationResponse) {
          const { results, ...paginationInfo } = notificationResponse;
          if (results) {
            get().mutateNotifications(results);
          }
          set((state) => {
            state.paginationInfo = paginationInfo;
          });
        }
        return notificationResponse;
      } catch (error) {
        console.error("WorkspaceNotificationStore -> getNotifications -> error", error);
        throw error;
      } finally {
        set((state) => {
          state.loader = undefined;
        });
      }
    },

    markAllNotificationsAsRead: async (workspaceSlug) => {
      try {
        set((state) => {
          state.loader = ENotificationLoader.MARK_ALL_AS_READY;
        });

        const queryParams = get().generateNotificationQueryParams(ENotificationQueryParamType.INIT);
        const params = {
          type: queryParams.type,
          snoozed: queryParams.snoozed,
          archived: queryParams.archived,
          read: queryParams.read,
        };

        await workspaceNotificationService.markAllNotificationsAsRead(workspaceSlug, params);

        set((state) => {
          const countKey =
            state.currentNotificationTab === ENotificationTab.ALL
              ? "total_unread_notifications_count"
              : "mention_unread_notifications_count";
          state.unreadNotificationsCount[countKey] = 0;

          Object.values(state.notifications).forEach((notification) =>
            notification.getState().mutateNotification({
              read_at: new Date().toUTCString(),
            })
          );
        });
      } catch (error) {
        console.error("WorkspaceNotificationStore -> markAllNotificationsAsRead -> error", error);
        throw error;
      } finally {
        set((state) => {
          state.loader = undefined;
        });
      }
    },

    // helper functions
    generateNotificationQueryParams: (paramType) => {
      const state = get();
      const queryParamsType =
        Object.entries(state.filters.type)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(",") || undefined;

      const queryCursorNext =
        paramType === ENotificationQueryParamType.INIT
          ? `${state.paginatedCount}:0:0`
          : paramType === ENotificationQueryParamType.CURRENT
            ? `${state.paginatedCount}:${0}:0`
            : paramType === ENotificationQueryParamType.NEXT && state.paginationInfo
              ? state.paginationInfo?.next_cursor
              : `${state.paginatedCount}:${0}:0`;

      const queryParams: TNotificationPaginatedInfoQueryParams = {
        type: queryParamsType,
        snoozed: state.filters.snoozed || false,
        archived: state.filters.archived || false,
        read: undefined,
        per_page: state.paginatedCount,
        cursor: queryCursorNext,
      };

      // NOTE: This validation is required to show all the read and unread notifications in a single place it may change in future.
      queryParams.read = state.filters.read === true ? false : undefined;

      if (state.currentNotificationTab === ENotificationTab.MENTIONS) queryParams.mentioned = true;

      return queryParams;
    },
  }))
);

// Helper functions for computed values
export const notificationIdsByWorkspaceId = (workspaceId: string): string[] | undefined => {
  const state = useWorkspaceNotificationStore.getState();
  if (!workspaceId || isEmpty(state.notifications)) return undefined;

  const workspaceNotifications = orderBy(
    Object.values(state.notifications || []).map((store) => store.getState()),
    (n) => convertToEpoch(n.created_at),
    ["desc"]
  );

  const workspaceNotificationIds = workspaceNotifications
    .filter((n) => n.workspace === workspaceId)
    .filter((n) =>
      state.currentNotificationTab === ENotificationTab.MENTIONS
        ? n.is_mentioned_notification
        : !n.is_mentioned_notification
    )
    .filter((n) => {
      if (!state.filters.archived && !state.filters.snoozed) {
        if (n.archived_at) {
          return false;
        } else if (n.snoozed_till) {
          return false;
        } else {
          return true;
        }
      } else {
        if (state.filters.snoozed) {
          return n.snoozed_till ? true : false;
        } else if (state.filters.archived) {
          return n.archived_at ? true : false;
        } else {
          return true;
        }
      }
    })
    .map((n) => n.id);

  return workspaceNotificationIds;
};

export const notificationLiteByNotificationId = (notificationId: string | undefined, workspaceSlug: string | undefined): TNotificationLite => {
  if (!notificationId) return {} as TNotificationLite;
  const state = useWorkspaceNotificationStore.getState();
  const notificationStore = state.notifications[notificationId];
  if (!notificationStore || !workspaceSlug) return {} as TNotificationLite;
  const notification = notificationStore.getState();

  return {
    workspace_slug: workspaceSlug,
    project_id: notification.project,
    notification_id: notification.id,
    issue_id: notification.data?.issue?.id,
    is_inbox_issue: notification.is_inbox_issue || false,
  };
};
