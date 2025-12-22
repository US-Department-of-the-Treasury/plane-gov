import useSWR from "swr";
// assets
import emptyView from "@/app/assets/empty-state/view.svg?url";
// components
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/core/page-title";
import { ProjectViewLayoutRoot } from "@/components/issues/issue-layouts/roots/project-view-layout-root";
// hooks
import { useProjectView } from "@/hooks/store/use-project-view";
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import { useProjectDetails } from "@/store/queries/project";
import type { Route } from "./+types/page";

function ProjectViewIssuesPage({ params }: Route.ComponentProps) {
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId, viewId } = params;
  // store hooks
  const { fetchViewDetails, getViewById } = useProjectView();
  // queries
  const { data: project } = useProjectDetails(workspaceSlug, projectId);
  // derived values
  const projectView = getViewById(viewId);
  const pageTitle = project?.name && projectView?.name ? `${project?.name} - ${projectView?.name}` : undefined;

  const { error } = useSWR(`VIEW_DETAILS_${viewId}`, () => fetchViewDetails(workspaceSlug, projectId, viewId));

  if (error) {
    return (
      <EmptyState
        image={emptyView}
        title="View does not exist"
        description="The view you are looking for does not exist or you don't have permission to view it."
        primaryButton={{
          text: "View other views",
          onClick: () => router.push(`/${workspaceSlug}/projects/${projectId}/views`),
        }}
      />
    );
  }

  return (
    <>
      <PageHead title={pageTitle} />
      <ProjectViewLayoutRoot />
    </>
  );
}

export default ProjectViewIssuesPage;
