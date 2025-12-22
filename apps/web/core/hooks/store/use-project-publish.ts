/**
 * Project publish hooks using TanStack Query.
 * Replaces MobX ProjectPublishStore.
 *
 * Migration notes:
 * - fetchPublishSettings → useProjectPublishSettings(workspaceSlug, projectId)
 * - publishProject → usePublishProject().mutate({ workspaceSlug, projectId, data })
 * - updatePublishSettings → useUpdatePublishSettings().mutate({ workspaceSlug, projectId, projectPublishId, data })
 * - unPublishProject → useUnpublishProject().mutate({ workspaceSlug, projectId, projectPublishId })
 * - getPublishSettingsByProjectID → access via query data or use getPublishSettingsByProjectId utility
 * - generalLoader → isPending from mutation hooks
 * - fetchSettingsLoader → isLoading from useProjectPublishSettings
 */

export {
  useProjectPublishSettings,
  usePublishProject,
  useUpdatePublishSettings,
  useUnpublishProject,
  getPublishSettingsByProjectId,
} from "@/store/queries/project-publish";
