import { observer } from "mobx-react";
// components
import { PageHead } from "@/components/core/page-title";
import { ArchivedEpicLayoutRoot, ArchivedEpicsHeader } from "@/components/epics";
// hooks
import { useProject } from "@/hooks/store/use-project";
import type { Route } from "./+types/page";

function ProjectArchivedEpicsPage({ params }: Route.ComponentProps) {
  // router
  const { projectId } = params;
  // store hooks
  const { getProjectById } = useProject();
  // derived values
  const project = getProjectById(projectId);
  const pageTitle = project?.name && `${project?.name} - Archived epics`;

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <ArchivedEpicsHeader />
        <ArchivedEpicLayoutRoot />
      </div>
    </>
  );
}

export default observer(ProjectArchivedEpicsPage);
