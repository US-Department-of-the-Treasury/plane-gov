// Client-side Zustand stores
export { useThemeStore, ThemeStoreLegacy as ThemeStore } from "./theme.store";
export type { ThemeStore as ThemeStoreType, IThemeStore } from "./theme.store";

export { useRouterStore, RouterStoreLegacy as RouterStore } from "./router.store";
export type { RouterStoreType, IRouterStore } from "./router.store";

export { useMultipleSelectStore, MultipleSelectStoreLegacy as MultipleSelectStore } from "./multiple-select.store";
export type { MultipleSelectStore as MultipleSelectStoreType, IMultipleSelectStore } from "./multiple-select.store";

export { useCommandPaletteStore, CommandPaletteStoreLegacy as CommandPaletteStore } from "./command-palette.store";
export type { CommandPaletteStore as CommandPaletteStoreType, ICommandPaletteStore } from "./command-palette.store";

export { useWorkspaceDraftFilterStore } from "./workspace-draft-filter.store";
export type { WorkspaceDraftFilterStore } from "./workspace-draft-filter.store";

export { useEpicFilterStore, EpicFilterStoreLegacy as EpicFilterStore } from "./epic-filter.store";
export type { EpicFilterStore as EpicFilterStoreType, IEpicFilterStore } from "./epic-filter.store";

export { useSprintFilterStore, SprintFilterStoreLegacy as SprintFilterStore } from "./sprint-filter.store";
export type { SprintFilterStore as SprintFilterStoreType, ISprintFilterStore } from "./sprint-filter.store";

export { useProjectFilterStore } from "./project-filter.store";
export type { ProjectFilterStore } from "./project-filter.store";

export { useCalendarViewStore } from "./calendar-view.store";
export type { CalendarViewStore } from "./calendar-view.store";

export { useKanbanViewStore } from "./kanban-view.store";
export type { KanbanViewStore } from "./kanban-view.store";

export { usePowerKStore, PowerKStoreLegacy as PowerKStore } from "./power-k.store";
export type { PowerKStore as PowerKStoreType, ModalData, IPowerKStore } from "./power-k.store";

export { useEditorAssetStore, EditorAssetStoreLegacy as EditorAssetStore } from "./editor-asset.store";
export type { EditorAssetStore as EditorAssetStoreType, IEditorAssetStore } from "./editor-asset.store";

export { useInstanceStore, InstanceStoreLegacy as InstanceStore } from "./instance.store";
export type { InstanceStore as InstanceStoreType, IInstanceStore } from "./instance.store";

export { useAnalyticsStore, AnalyticsStoreLegacy as AnalyticsStore } from "./analytics.store";
export type { AnalyticsStore as AnalyticsStoreType, IAnalyticsStore } from "./analytics.store";

export { useLabelStore, LabelStoreLegacy as LabelStore } from "./label.store";
export type { LabelStore as LabelStoreType, ILabelStore } from "./label.store";

export { useStateStore, StateStoreLegacy as StateStore } from "./state.store";
export type { StateStore as StateStoreType, IStateStore } from "./state.store";

export { useFavoriteStore, FavoriteStoreLegacy as FavoriteStore } from "./favorite.store";
export type { FavoriteStore as FavoriteStoreType, IFavoriteStore } from "./favorite.store";

export { useDashboardStore, DashboardStoreLegacy as DashboardStore } from "./dashboard.store";
export type { DashboardStore as DashboardStoreType, IDashboardStore } from "./dashboard.store";

export { useEpicStore, EpicStoreLegacy as EpicsStore } from "./epic.store";
export type { EpicStore as EpicStoreType, IEpicStore } from "./epic.store";

export { useSprintStore, SprintStoreLegacy as SprintStore } from "./sprint.store";
export type { SprintStore as SprintStoreType, ISprintStore } from "./sprint.store";

export { useGlobalViewStore, GlobalViewStoreLegacy as GlobalViewStore } from "./global-view.store";
export type { GlobalViewStore as GlobalViewStoreType, IGlobalViewStore } from "./global-view.store";

export { useProjectViewStore, ProjectViewStoreLegacy as ProjectViewStore } from "./project-view.store";
export type { ProjectViewStore as ProjectViewStoreType, IProjectViewStore } from "./project-view.store";

// Workspace stores
export { useWorkspaceLinkStore, WorkspaceLinkStoreLegacy as WorkspaceLinkStore } from "./workspace-link.store";
export type { WorkspaceLinkStore as WorkspaceLinkStoreType, IWorkspaceLinkStore } from "./workspace-link.store";

export { useWebhookStore, WebhookStoreLegacy as WebhookStore } from "./workspace-webhook.store";
export type { WebhookStore as WebhookStoreType, IWebhookStore } from "./workspace-webhook.store";

export { useWorkspaceApiTokenStore, ApiTokenStoreLegacy as ApiTokenStore } from "./workspace-api-token.store";
export type { WorkspaceApiTokenStore as ApiTokenStoreType, IApiTokenStore } from "./workspace-api-token.store";

export { useWorkspaceHomeStore, HomeStoreLegacy as HomeStore } from "./workspace-home.store";
export type { WorkspaceHomeStore as WorkspaceHomeStoreType, IHomeStore } from "./workspace-home.store";

// User stores
export { useUserProfileStore, ProfileStore } from "./user-profile.store";
export type { UserProfileStore as UserProfileStoreType, IUserProfileStore } from "./user-profile.store";

export { useUserSettingsStore, UserSettingsStore } from "./user-settings.store";
export type { UserSettingsStoreType, IUserSettingsStore } from "./user-settings.store";

export { useUserAccountStore, AccountStore } from "./user-account.store";
export type { UserAccountStore as UserAccountStoreType, IAccountStore } from "./user-account.store";

export { useBaseUserPermissionStore, BaseUserPermissionStore } from "./user-base-permissions.store";
export type { BaseUserPermissionStoreType, IBaseUserPermissionStore } from "./user-base-permissions.store";

// Project stores
export { useProjectPublishStore, ProjectPublishStoreLegacy as ProjectPublishStore } from "./project-publish.store";
export type { ProjectPublishStore as ProjectPublishStoreType, IProjectPublishStore } from "./project-publish.store";

// Estimate stores
export { useEstimatePointStore, EstimatePointStoreLegacy } from "./estimate-point.store";
export type { EstimatePointStore as EstimatePointStoreType, IEstimatePoint } from "./estimate-point.store";

// Notification stores
export { createNotificationStore, NotificationStoreLegacy, NotificationStoreLegacy as Notification } from "./notification.store";
export type { NotificationStore as NotificationStoreType, INotification } from "./notification.store";

export {
  useWorkspaceNotificationStore,
  WorkspaceNotificationStoreLegacy as WorkspaceNotificationStore,
  notificationIdsByWorkspaceId,
  notificationLiteByNotificationId,
} from "./workspace-notifications.store";
export type {
  WorkspaceNotificationStoreType,
  IWorkspaceNotificationStore,
} from "./workspace-notifications.store";
