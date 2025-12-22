import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// ui
import { ArchiveIcon, WorkItemsIcon } from "@plane/propel/icons";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { IssueDetailQuickActions } from "@/components/issues/issue-detail/issue-detail-quick-actions";
// store
import { queryKeys } from "@/store/queries/query-keys";
// hooks
import { useProjectDetails } from "@/store/queries/project";
// plane web
import { ProjectBreadcrumb } from "@/plane-web/components/breadcrumbs/project";
// services
import { IssueService } from "@/services/issue";

const issueService = new IssueService();

export function ProjectArchivedIssueDetailsHeader() {
  // router
  const { workspaceSlug, projectId, archivedIssueId } = useParams();
  // queries
  const { data: currentProjectDetails, isLoading } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );

  const { data: issueDetails } = useQuery({
    queryKey: queryKeys.issues.detail(archivedIssueId as string),
    queryFn: () => issueService.retrieve(workspaceSlug as string, projectId as string, archivedIssueId as string),
    enabled: !!workspaceSlug && !!projectId && !!archivedIssueId,
  });

  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs isLoading={isLoading}>
          <ProjectBreadcrumb workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink
                href={`/${workspaceSlug}/projects/${projectId}/archives/issues`}
                label="Archives"
                icon={<ArchiveIcon className="h-4 w-4 text-tertiary" />}
              />
            }
          />
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink
                href={`/${workspaceSlug}/projects/${projectId}/archives/issues`}
                label="Work items"
                icon={<WorkItemsIcon className="h-4 w-4 text-tertiary" />}
              />
            }
          />
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink
                label={
                  currentProjectDetails && issueDetails
                    ? `${currentProjectDetails.identifier}-${issueDetails.sequence_id}`
                    : ""
                }
              />
            }
          />
        </Breadcrumbs>
      </Header.LeftItem>
      <Header.RightItem>
        <IssueDetailQuickActions
          workspaceSlug={workspaceSlug.toString()}
          projectId={projectId.toString()}
          issueId={archivedIssueId.toString()}
        />
      </Header.RightItem>
    </Header>
  );
}
