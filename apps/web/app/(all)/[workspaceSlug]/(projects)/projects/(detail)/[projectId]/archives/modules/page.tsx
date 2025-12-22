import { observer } from "mobx-react";
// components
import { PageHead } from "@/components/core/page-title";
import { ArchivedModuleLayoutRoot, ArchivedModulesHeader } from "@/components/modules";
// hooks
import { useProjectDetails } from "@/store/queries/project";
import type { Route } from "./+types/page";

function ProjectArchivedModulesPage({ params }: Route.ComponentProps) {
  // router
  const { workspaceSlug, projectId } = params;
  // queries
  const { data: project } = useProjectDetails(workspaceSlug, projectId);
  // derived values
  const pageTitle = project?.name && `${project?.name} - Archived modules`;

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <ArchivedModulesHeader />
        <ArchivedModuleLayoutRoot />
      </div>
    </>
  );
}

export default observer(ProjectArchivedModulesPage);
