import { useParams, usePathname } from "next/navigation";

/**
 * Custom hook to detect different workspace paths
 * @returns Object containing boolean flags for different workspace paths
 */
export const useWorkspacePaths = () => {
  const { workspaceSlug } = useParams();
  const pathname = usePathname();

  const isSettingsPath = pathname.includes(`/${workspaceSlug}/settings`);
  const isDocumentsPath = pathname.includes(`/${workspaceSlug}/documents`);
  const isResourcesPath = pathname.includes(`/${workspaceSlug}/resources`);
  const isAiPath = pathname.includes(`/${workspaceSlug}/pi-chat`);
  const isProjectsPath =
    pathname.includes(`/${workspaceSlug}/`) && !isDocumentsPath && !isResourcesPath && !isAiPath && !isSettingsPath;
  const isNotificationsPath = pathname.includes(`/${workspaceSlug}/notifications`);

  return {
    isSettingsPath,
    isDocumentsPath,
    isResourcesPath,
    isAiPath,
    isProjectsPath,
    isNotificationsPath,
  };
};
