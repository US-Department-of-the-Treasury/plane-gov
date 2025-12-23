import { create } from "zustand";
import { set as lodashSet } from "lodash-es";
import type { IUserLite, TNotification, TNotificationData } from "@plane/types";
import workspaceNotificationService from "@/services/workspace-notification.service";
import type { CoreRootStore } from "../root.store";

// State interface
interface NotificationStoreState {
  // Notification properties
  id: string;
  title: string | undefined;
  data: TNotificationData | undefined;
  entity_identifier: string | undefined;
  entity_name: string | undefined;
  message_html: string | undefined;
  message: undefined;
  message_stripped: undefined;
  sender: string | undefined;
  receiver: string | undefined;
  triggered_by: string | undefined;
  triggered_by_details: IUserLite | undefined;
  read_at: string | undefined;
  archived_at: string | undefined;
  snoozed_till: string | undefined;
  is_inbox_issue: boolean | undefined;
  is_mentioned_notification: boolean | undefined;
  workspace: string | undefined;
  project: string | undefined;
  created_at: string | undefined;
  updated_at: string | undefined;
  created_by: string | undefined;
  updated_by: string | undefined;
}

// Actions interface
interface NotificationStoreActions {
  // Initialization
  initializeNotification: (notification: TNotification) => void;

  // Helper functions
  mutateNotification: (notification: Partial<TNotification>) => void;

  // Actions
  updateNotification: (
    workspaceSlug: string,
    payload: Partial<TNotification>,
    rootStore: CoreRootStore
  ) => Promise<TNotification | undefined>;
  markNotificationAsRead: (workspaceSlug: string, rootStore: CoreRootStore) => Promise<TNotification | undefined>;
  markNotificationAsUnRead: (workspaceSlug: string, rootStore: CoreRootStore) => Promise<TNotification | undefined>;
  archiveNotification: (workspaceSlug: string) => Promise<TNotification | undefined>;
  unArchiveNotification: (workspaceSlug: string) => Promise<TNotification | undefined>;
  snoozeNotification: (workspaceSlug: string, snoozeTill: Date) => Promise<TNotification | undefined>;
  unSnoozeNotification: (workspaceSlug: string) => Promise<TNotification | undefined>;
}

// Combined store type
export type NotificationStore = NotificationStoreState & NotificationStoreActions;

// Initial state
const initialState: NotificationStoreState = {
  id: "",
  title: undefined,
  data: undefined,
  entity_identifier: undefined,
  entity_name: undefined,
  message_html: undefined,
  message: undefined,
  message_stripped: undefined,
  sender: undefined,
  receiver: undefined,
  triggered_by: undefined,
  triggered_by_details: undefined,
  read_at: undefined,
  archived_at: undefined,
  snoozed_till: undefined,
  is_inbox_issue: undefined,
  is_mentioned_notification: undefined,
  workspace: undefined,
  project: undefined,
  created_at: undefined,
  updated_at: undefined,
  created_by: undefined,
  updated_by: undefined,
};

// Factory function to create notification stores
export const createNotificationStore = (notification: TNotification) => {
  return create<NotificationStore>()((set, get) => ({
    ...initialState,
    id: notification.id,
    title: notification.title,
    data: notification.data,
    entity_identifier: notification.entity_identifier,
    entity_name: notification.entity_name,
    message_html: notification.message_html,
    message: notification.message,
    message_stripped: notification.message_stripped,
    sender: notification.sender,
    receiver: notification.receiver,
    triggered_by: notification.triggered_by,
    triggered_by_details: notification.triggered_by_details,
    read_at: notification.read_at,
    archived_at: notification.archived_at,
    snoozed_till: notification.snoozed_till,
    is_inbox_issue: notification.is_inbox_issue,
    is_mentioned_notification: notification.is_mentioned_notification,
    workspace: notification.workspace,
    project: notification.project,
    created_at: notification.created_at,
    updated_at: notification.updated_at,
    created_by: notification.created_by,
    updated_by: notification.updated_by,

    // Initialization
    initializeNotification: (notification) => {
      set({
        id: notification.id,
        title: notification.title,
        data: notification.data,
        entity_identifier: notification.entity_identifier,
        entity_name: notification.entity_name,
        message_html: notification.message_html,
        message: notification.message,
        message_stripped: notification.message_stripped,
        sender: notification.sender,
        receiver: notification.receiver,
        triggered_by: notification.triggered_by,
        triggered_by_details: notification.triggered_by_details,
        read_at: notification.read_at,
        archived_at: notification.archived_at,
        snoozed_till: notification.snoozed_till,
        is_inbox_issue: notification.is_inbox_issue,
        is_mentioned_notification: notification.is_mentioned_notification,
        workspace: notification.workspace,
        project: notification.project,
        created_at: notification.created_at,
        updated_at: notification.updated_at,
        created_by: notification.created_by,
        updated_by: notification.updated_by,
      });
    },

    // Helper functions
    mutateNotification: (notification) => {
      const updates: Partial<NotificationStoreState> = {};
      Object.entries(notification).forEach(([key, value]) => {
        if (key in get()) {
          updates[key as keyof NotificationStoreState] = value as any;
        }
      });
      set(updates);
    },

    // Actions
    updateNotification: async (workspaceSlug, payload, rootStore) => {
      try {
        const notification = await workspaceNotificationService.updateNotificationById(
          workspaceSlug,
          get().id,
          payload
        );
        if (notification) {
          get().mutateNotification(notification);
        }
        return notification;
      } catch (error) {
        throw error;
      }
    },

    markNotificationAsRead: async (workspaceSlug, rootStore) => {
      const currentNotificationReadAt = get().read_at;
      try {
        const payload: Partial<TNotification> = {
          read_at: new Date().toISOString(),
        };
        rootStore.workspaceNotification.setUnreadNotificationsCount("decrement");
        get().mutateNotification(payload);
        const notification = await workspaceNotificationService.markNotificationAsRead(workspaceSlug, get().id);
        if (notification) {
          get().mutateNotification(notification);
        }
        return notification;
      } catch (error) {
        get().mutateNotification({ read_at: currentNotificationReadAt });
        rootStore.workspaceNotification.setUnreadNotificationsCount("increment");
        throw error;
      }
    },

    markNotificationAsUnRead: async (workspaceSlug, rootStore) => {
      const currentNotificationReadAt = get().read_at;
      try {
        const payload: Partial<TNotification> = {
          read_at: undefined,
        };
        rootStore.workspaceNotification.setUnreadNotificationsCount("increment");
        get().mutateNotification(payload);
        const notification = await workspaceNotificationService.markNotificationAsUnread(workspaceSlug, get().id);
        if (notification) {
          get().mutateNotification(notification);
        }
        return notification;
      } catch (error) {
        rootStore.workspaceNotification.setUnreadNotificationsCount("decrement");
        get().mutateNotification({ read_at: currentNotificationReadAt });
        throw error;
      }
    },

    archiveNotification: async (workspaceSlug) => {
      const currentNotificationArchivedAt = get().archived_at;
      try {
        const payload: Partial<TNotification> = {
          archived_at: new Date().toISOString(),
        };
        get().mutateNotification(payload);
        const notification = await workspaceNotificationService.markNotificationAsArchived(workspaceSlug, get().id);
        if (notification) {
          get().mutateNotification(notification);
        }
        return notification;
      } catch (error) {
        get().mutateNotification({ archived_at: currentNotificationArchivedAt });
        throw error;
      }
    },

    unArchiveNotification: async (workspaceSlug) => {
      const currentNotificationArchivedAt = get().archived_at;
      try {
        const payload: Partial<TNotification> = {
          archived_at: undefined,
        };
        get().mutateNotification(payload);
        const notification = await workspaceNotificationService.markNotificationAsUnArchived(workspaceSlug, get().id);
        if (notification) {
          get().mutateNotification(notification);
        }
        return notification;
      } catch (error) {
        get().mutateNotification({ archived_at: currentNotificationArchivedAt });
        throw error;
      }
    },

    snoozeNotification: async (workspaceSlug, snoozeTill) => {
      const currentNotificationSnoozeTill = get().snoozed_till;
      try {
        const payload: Partial<TNotification> = {
          snoozed_till: snoozeTill.toISOString(),
        };
        get().mutateNotification(payload);
        const notification = await workspaceNotificationService.updateNotificationById(
          workspaceSlug,
          get().id,
          payload
        );
        return notification;
      } catch (error) {
        get().mutateNotification({ snoozed_till: currentNotificationSnoozeTill });
        throw error;
      }
    },

    unSnoozeNotification: async (workspaceSlug) => {
      const currentNotificationSnoozeTill = get().snoozed_till;
      try {
        const payload: Partial<TNotification> = {
          snoozed_till: undefined,
        };
        get().mutateNotification(payload);
        const notification = await workspaceNotificationService.updateNotificationById(
          workspaceSlug,
          get().id,
          payload
        );
        return notification;
      } catch (error) {
        get().mutateNotification({ snoozed_till: currentNotificationSnoozeTill });
        throw error;
      }
    },
  }));
};

// Legacy interface matching the original INotification
export interface INotification extends TNotification {
  // computed
  asJson: TNotification;
  // helper functions
  mutateNotification: (notification: Partial<TNotification>) => void;
  // actions
  updateNotification: (workspaceSlug: string, payload: Partial<TNotification>) => Promise<TNotification | undefined>;
  markNotificationAsRead: (workspaceSlug: string) => Promise<TNotification | undefined>;
  markNotificationAsUnRead: (workspaceSlug: string) => Promise<TNotification | undefined>;
  archiveNotification: (workspaceSlug: string) => Promise<TNotification | undefined>;
  unArchiveNotification: (workspaceSlug: string) => Promise<TNotification | undefined>;
  snoozeNotification: (workspaceSlug: string, snoozeTill: Date) => Promise<TNotification | undefined>;
  unSnoozeNotification: (workspaceSlug: string) => Promise<TNotification | undefined>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Creates a notification store instance and delegates to it.
 * @deprecated Use createNotificationStore factory function
 */
export class NotificationStoreLegacy implements INotification {
  private notificationStore: ReturnType<typeof createNotificationStore>;

  constructor(
    private store: CoreRootStore,
    notification: TNotification
  ) {
    this.notificationStore = createNotificationStore(notification);
  }

  // Getters for all notification properties
  get id() {
    return this.notificationStore.getState().id;
  }

  get title() {
    return this.notificationStore.getState().title;
  }

  get data() {
    return this.notificationStore.getState().data;
  }

  get entity_identifier() {
    return this.notificationStore.getState().entity_identifier;
  }

  get entity_name() {
    return this.notificationStore.getState().entity_name;
  }

  get message_html() {
    return this.notificationStore.getState().message_html;
  }

  get message() {
    return this.notificationStore.getState().message;
  }

  get message_stripped() {
    return this.notificationStore.getState().message_stripped;
  }

  get sender() {
    return this.notificationStore.getState().sender;
  }

  get receiver() {
    return this.notificationStore.getState().receiver;
  }

  get triggered_by() {
    return this.notificationStore.getState().triggered_by;
  }

  get triggered_by_details() {
    return this.notificationStore.getState().triggered_by_details;
  }

  get read_at() {
    return this.notificationStore.getState().read_at;
  }

  get archived_at() {
    return this.notificationStore.getState().archived_at;
  }

  get snoozed_till() {
    return this.notificationStore.getState().snoozed_till;
  }

  get is_inbox_issue() {
    return this.notificationStore.getState().is_inbox_issue;
  }

  get is_mentioned_notification() {
    return this.notificationStore.getState().is_mentioned_notification;
  }

  get workspace() {
    return this.notificationStore.getState().workspace;
  }

  get project() {
    return this.notificationStore.getState().project;
  }

  get created_at() {
    return this.notificationStore.getState().created_at;
  }

  get updated_at() {
    return this.notificationStore.getState().updated_at;
  }

  get created_by() {
    return this.notificationStore.getState().created_by;
  }

  get updated_by() {
    return this.notificationStore.getState().updated_by;
  }

  // Computed property
  get asJson(): TNotification {
    const state = this.notificationStore.getState();
    return {
      id: state.id,
      title: state.title,
      data: state.data,
      entity_identifier: state.entity_identifier,
      entity_name: state.entity_name,
      message_html: state.message_html,
      message: state.message,
      message_stripped: state.message_stripped,
      sender: state.sender,
      receiver: state.receiver,
      triggered_by: state.triggered_by,
      triggered_by_details: state.triggered_by_details,
      read_at: state.read_at,
      archived_at: state.archived_at,
      snoozed_till: state.snoozed_till,
      is_inbox_issue: state.is_inbox_issue,
      is_mentioned_notification: state.is_mentioned_notification,
      workspace: state.workspace,
      project: state.project,
      created_at: state.created_at,
      updated_at: state.updated_at,
      created_by: state.created_by,
      updated_by: state.updated_by,
    };
  }

  // Helper methods
  mutateNotification = (notification: Partial<TNotification>) => {
    this.notificationStore.getState().mutateNotification(notification);
  };

  // Action methods
  updateNotification = async (workspaceSlug: string, payload: Partial<TNotification>) => {
    return this.notificationStore.getState().updateNotification(workspaceSlug, payload, this.store);
  };

  markNotificationAsRead = async (workspaceSlug: string) => {
    return this.notificationStore.getState().markNotificationAsRead(workspaceSlug, this.store);
  };

  markNotificationAsUnRead = async (workspaceSlug: string) => {
    return this.notificationStore.getState().markNotificationAsUnRead(workspaceSlug, this.store);
  };

  archiveNotification = async (workspaceSlug: string) => {
    return this.notificationStore.getState().archiveNotification(workspaceSlug);
  };

  unArchiveNotification = async (workspaceSlug: string) => {
    return this.notificationStore.getState().unArchiveNotification(workspaceSlug);
  };

  snoozeNotification = async (workspaceSlug: string, snoozeTill: Date) => {
    return this.notificationStore.getState().snoozeNotification(workspaceSlug, snoozeTill);
  };

  unSnoozeNotification = async (workspaceSlug: string) => {
    return this.notificationStore.getState().unSnoozeNotification(workspaceSlug);
  };
}

// Export legacy class as Notification for backward compatibility
export { NotificationStoreLegacy as Notification };

// Export types for backward compatibility
export type { NotificationStoreState, NotificationStoreActions };
