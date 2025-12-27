import { useState } from "react";

import { useParams } from "next/navigation";
// plane imports
import { EUserPermissionsLevel, PROJECT_TRACKER_ELEMENTS } from "@plane/constants";
import { Button } from "@plane/propel/button";
import { PageIcon } from "@plane/propel/icons";
import { EUserProjectRoles } from "@plane/types";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { CreateWikiPageModal } from "@/components/wiki";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
// queries
import { useProjectDetails } from "@/store/queries";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

export function PagesListHeader() {
  // states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // router
  const { workspaceSlug, projectId } = useParams();
  // queries
  const { data: currentProjectDetails, isLoading } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  // permissions
  const { allowPermissions } = useUserPermissions();
  const canCreatePage = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );

  return (
    <>
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
              onClick={() => setIsCreateModalOpen(true)}
              data-ph-element={PROJECT_TRACKER_ELEMENTS.CREATE_HEADER_BUTTON}
            >
              Add wiki
            </Button>
          </Header.RightItem>
        )}
      </Header>

      {/* Create page modal */}
      <CreateWikiPageModal
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        projectId={projectId?.toString()}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
