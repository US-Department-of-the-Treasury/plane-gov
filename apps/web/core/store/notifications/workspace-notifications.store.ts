/**
 * @deprecated This file has been migrated to Zustand.
 * Use @/store/client/workspace-notifications.store instead.
 * This file re-exports for backward compatibility.
 */

export type {
  WorkspaceNotificationStoreType,
} from "@/store/client/workspace-notifications.store";

export {
  useWorkspaceNotificationStore,
  notificationIdsByWorkspaceId,
  notificationLiteByNotificationId,
} from "@/store/client/workspace-notifications.store";
