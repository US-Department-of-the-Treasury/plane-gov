import { useState } from "react";

import { useParams } from "next/navigation";
// plane imports
import { EUserPermissionsLevel, PROJECT_TRACKER_ELEMENTS } from "@plane/constants";
import { Button } from "@plane/propel/button";
import { PageIcon } from "@plane/propel/icons";
import { EUserProjectRoles, EWikiPageAccess } from "@plane/types";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useProjectDetails, useCreateWikiPage } from "@/store/queries";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

export function PagesListHeader() {
  // states
  const [isCreating, setIsCreating] = useState(false);
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();
  // queries
  const { data: currentProjectDetails, isLoading } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  // mutations
  const createPageMutation = useCreateWikiPage();
  // permissions
  const { allowPermissions } = useUserPermissions();
  const canCreatePage = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );

  // Notion-style: Create blank page and navigate directly
  const handleCreatePage = async () => {
    if (!workspaceSlug || !projectId || isCreating) return;

    setIsCreating(true);
    try {
      const page = await createPageMutation.mutateAsync({
        workspaceSlug: workspaceSlug.toString(),
        data: {
          name: "",
          project: projectId.toString(),
          access: EWikiPageAccess.SHARED,
          logo_props: {
            in_use: "icon",
            icon: { name: "FileText", color: "#6366f1" },
          },
        },
      });
      // Navigate directly to the new page
      router.push(`/${workspaceSlug}/projects/${projectId}/pages/${page.id}`);
    } catch (error) {
      console.error("Failed to create page:", error);
      setIsCreating(false);
    }
  };

  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs isLoading={isLoading}>
          <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink
                label="Wiki"
                href={`/${workspaceSlug}/projects/${currentProjectDetails?.id}/pages/`}
                icon={<PageIcon className="h-4 w-4 text-tertiary" />}
                isLast
              />
            }
            isLast
          />
        </Breadcrumbs>
      </Header.LeftItem>
      {canCreatePage && (
        <Header.RightItem>
          <Button
            variant="primary"
            size="lg"
            onClick={() => void handleCreatePage()}
            loading={isCreating}
            data-ph-element={PROJECT_TRACKER_ELEMENTS.CREATE_HEADER_BUTTON}
          >
            Add wiki
          </Button>
        </Header.RightItem>
      )}
    </Header>
  );
}
