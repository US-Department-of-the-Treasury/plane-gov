import { observer } from "mobx-react";
// components
import { PageHead } from "@/components/core/page-title";
import { ArchivedSprintLayoutRoot } from "@/components/sprints/archived-sprints";
import { ArchivedSprintsHeader } from "@/components/sprints/archived-sprints/header";
// hooks
import { useProjectDetails } from "@/store/queries/project";
import type { Route } from "./+types/page";

function ProjectArchivedSprintsPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug, projectId } = params;
  // queries
  const { data: project } = useProjectDetails(workspaceSlug, projectId);
  // derived values
  const pageTitle = project?.name && `${project?.name} - Archived sprints`;

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <ArchivedSprintsHeader />
        <ArchivedSprintLayoutRoot />
      </div>
    </>
  );
}

export default observer(ProjectArchivedSprintsPage);
