// components
import { PageHead } from "@/components/core/page-title";
import { ArchivedIssuesHeader } from "@/components/issues/archived-issues-header";
import { ArchivedIssueLayoutRoot } from "@/components/issues/issue-layouts/roots/archived-issue-layout-root";
// hooks
import { useProjectDetails } from "@/store/queries/project";
import type { Route } from "./+types/page";

function ProjectArchivedIssuesPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug, projectId } = params;
  // queries
  const { data: project } = useProjectDetails(workspaceSlug, projectId);
  // derived values
  const pageTitle = project?.name && `${project?.name} - Archived work items`;

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <ArchivedIssuesHeader />
        <ArchivedIssueLayoutRoot />
      </div>
    </>
  );
}

export default ProjectArchivedIssuesPage;
