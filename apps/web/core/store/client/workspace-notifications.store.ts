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
import type { INotification } from "@/store/client/notification.store";
import { NotificationStoreLegacy } from "@/store/client/notification.store";
import type { CoreRootStore } from "@/store/root.store";

type TNotificationLoader = ENotificationLoader | undefined;
type TNotificationQueryParamType = ENotificationQueryParamType;

// State interface
interface WorkspaceNotificationState {
  // observables
  loader: TNotificationLoader;
  unreadNotificationsCount: TUnreadNotificationsCount;
  notifications: Record<string, INotification>; // notification_id -> notification
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
  mutateNotifications: (notifications: TNotification[], store: CoreRootStore) => void;
  updateFilters: <T extends keyof TNotificationFilter>(
    key: T,
    value: TNotificationFilter[T],
    store: CoreRootStore
  ) => void;
  updateBulkFilters: (filters: Partial<TNotificationFilter>, store: CoreRootStore) => void;
  // actions
  setCurrentNotificationTab: (tab: TNotificationTab, store: CoreRootStore) => void;
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
    mutateNotifications: (notifications, store) => {
      set((state) => {
        (notifications || []).forEach((notification) => {
          if (!notification.id) return;
          if (state.notifications[notification.id]) {
            state.notifications[notification.id].mutateNotification(notification);
          } else {
            state.notifications[notification.id] = new NotificationStoreLegacy(store, notification);
          }
        });
      });
    },

    updateFilters: (key, value, store) => {
      set((state) => {
        lodashSet(state.filters, key, value);
        state.notifications = {};
      });

      const workspaceSlug = store.router.workspaceSlug;
      if (!workspaceSlug) return;

      get().getNotifications(workspaceSlug, ENotificationLoader.INIT_LOADER, ENotificationQueryParamType.INIT);
    },

    updateBulkFilters: (filters, store) => {
      set((state) => {
        Object.entries(filters).forEach(([key, value]) => {
          lodashSet(state.filters, key, value);
        });
        state.notifications = {};
      });

      const workspaceSlug = store.router.workspaceSlug;
      if (!workspaceSlug) return;

      get().getNotifications(workspaceSlug, ENotificationLoader.INIT_LOADER, ENotificationQueryParamType.INIT);
    },

    // actions
    setCurrentNotificationTab: (tab, store) => {
      set((state) => {
        state.currentNotificationTab = tab;
        state.notifications = {};
      });

      const workspaceSlug = store.router.workspaceSlug;
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
          set((state) => {
            if (results) {
              // Need to pass store reference - will be handled by Legacy wrapper
              const storeRef = (state as any)._rootStore;
              if (storeRef) {
                get().mutateNotifications(results, storeRef);
              }
            }
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
            notification.mutateNotification({
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
    Object.values(state.notifications || []),
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
  const notification = state.notifications[notificationId];
  if (!notification || !workspaceSlug) return {} as TNotificationLite;

  return {
    workspace_slug: workspaceSlug,
    project_id: notification.project,
    notification_id: notification.id,
    issue_id: notification.data?.issue?.id,
    is_inbox_issue: notification.is_inbox_issue || false,
  };
};

// Legacy interface for backward compatibility
export interface IWorkspaceNotificationStore {
  // observables
  loader: TNotificationLoader;
  unreadNotificationsCount: TUnreadNotificationsCount;
  notifications: Record<string, INotification>;
  currentNotificationTab: TNotificationTab;
  currentSelectedNotificationId: string | undefined;
  paginationInfo: Omit<TNotificationPaginatedInfo, "results"> | undefined;
  filters: TNotificationFilter;
  // computed functions
  notificationIdsByWorkspaceId: (workspaceId: string) => string[] | undefined;
  notificationLiteByNotificationId: (notificationId: string | undefined) => TNotificationLite;
  // helper actions
  mutateNotifications: (notifications: TNotification[]) => void;
  updateFilters: <T extends keyof TNotificationFilter>(key: T, value: TNotificationFilter[T]) => void;
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
  markAllNotificationsAsRead: (workspaceId: string) => Promise<void>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useWorkspaceNotificationStore hook directly in React components
 */
export class WorkspaceNotificationStoreLegacy implements IWorkspaceNotificationStore {
  private rootStore: CoreRootStore;

  constructor(rootStore: CoreRootStore) {
    this.rootStore = rootStore;
    // Store the rootStore reference in the Zustand store for use in mutations
    (useWorkspaceNotificationStore.getState() as any)._rootStore = rootStore;
  }

  get loader() {
    return useWorkspaceNotificationStore.getState().loader;
  }

  get unreadNotificationsCount() {
    return useWorkspaceNotificationStore.getState().unreadNotificationsCount;
  }

  get notifications() {
    return useWorkspaceNotificationStore.getState().notifications;
  }

  get currentNotificationTab() {
    return useWorkspaceNotificationStore.getState().currentNotificationTab;
  }

  get currentSelectedNotificationId() {
    return useWorkspaceNotificationStore.getState().currentSelectedNotificationId;
  }

  get paginationInfo() {
    return useWorkspaceNotificationStore.getState().paginationInfo;
  }

  get filters() {
    return useWorkspaceNotificationStore.getState().filters;
  }

  // computed functions
  notificationIdsByWorkspaceId = (workspaceId: string) => {
    return notificationIdsByWorkspaceId(workspaceId);
  };

  notificationLiteByNotificationId = (notificationId: string | undefined) => {
    return notificationLiteByNotificationId(notificationId, this.rootStore.router.workspaceSlug || undefined);
  };

  // helper actions
  mutateNotifications = (notifications: TNotification[]) => {
    useWorkspaceNotificationStore.getState().mutateNotifications(notifications, this.rootStore);
  };

  updateFilters = <T extends keyof TNotificationFilter>(key: T, value: TNotificationFilter[T]) => {
    useWorkspaceNotificationStore.getState().updateFilters(key, value, this.rootStore);
  };

  updateBulkFilters = (filters: Partial<TNotificationFilter>) => {
    useWorkspaceNotificationStore.getState().updateBulkFilters(filters, this.rootStore);
  };

  // actions
  setCurrentNotificationTab = (tab: TNotificationTab) => {
    useWorkspaceNotificationStore.getState().setCurrentNotificationTab(tab, this.rootStore);
  };

  setCurrentSelectedNotificationId = (notificationId: string | undefined) => {
    useWorkspaceNotificationStore.getState().setCurrentSelectedNotificationId(notificationId);
  };

  setUnreadNotificationsCount = (type: "increment" | "decrement", newCount?: number) => {
    useWorkspaceNotificationStore.getState().setUnreadNotificationsCount(type, newCount);
  };

  getUnreadNotificationsCount = async (workspaceSlug: string) => {
    return useWorkspaceNotificationStore.getState().getUnreadNotificationsCount(workspaceSlug);
  };

  getNotifications = async (
    workspaceSlug: string,
    loader?: TNotificationLoader,
    queryCursorType?: TNotificationQueryParamType
  ) => {
    return useWorkspaceNotificationStore.getState().getNotifications(workspaceSlug, loader, queryCursorType);
  };

  markAllNotificationsAsRead = async (workspaceId: string) => {
    return useWorkspaceNotificationStore.getState().markAllNotificationsAsRead(workspaceId);
  };
}
