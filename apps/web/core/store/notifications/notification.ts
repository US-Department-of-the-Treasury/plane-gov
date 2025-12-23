/**
 * @deprecated This file has been migrated to Zustand.
 * Use @/store/client/notification.store instead.
 * This file re-exports for backward compatibility.
 */

export type {
  INotification,
  NotificationStoreState,
  NotificationStoreActions,
  NotificationStore,
} from "@/store/client/notification.store";

export { createNotificationStore, NotificationStoreLegacy as Notification } from "@/store/client/notification.store";
