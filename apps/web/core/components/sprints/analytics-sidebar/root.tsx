import React from "react";
// plane imports
import { Loader } from "@plane/ui";
// local imports
import useSprintsDetails from "../active-sprint/use-sprints-details";
import { SprintAnalyticsProgress } from "./issue-progress";
import { SprintSidebarDetails } from "./sidebar-details";
import { SprintSidebarHeader } from "./sidebar-header";

type Props = {
  handleClose: () => void;
  isArchived?: boolean;
  sprintId: string;
  projectId: string;
  workspaceSlug: string;
};

export function SprintDetailsSidebar(props: Props) {
  const { handleClose, isArchived, projectId, workspaceSlug, sprintId } = props;

  // hooks
  const { sprint: sprintDetails } = useSprintsDetails({
    workspaceSlug,
    projectId,
    sprintId,
  });

  if (!sprintDetails)
    return (
      <Loader className="px-5">
        <div className="space-y-2">
          <Loader.Item height="15px" width="50%" />
          <Loader.Item height="15px" width="30%" />
        </div>
        <div className="mt-8 space-y-3">
          <Loader.Item height="30px" />
          <Loader.Item height="30px" />
          <Loader.Item height="30px" />
        </div>
      </Loader>
    );

  return (
    <div className="relative pb-2">
      <div className="flex flex-col gap-5 w-full">
        <SprintSidebarHeader
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          sprintDetails={sprintDetails}
          isArchived={isArchived}
          handleClose={handleClose}
        />
        <SprintSidebarDetails projectId={projectId} sprintDetails={sprintDetails} />
      </div>

      {workspaceSlug && projectId && sprintDetails?.id && (
        <SprintAnalyticsProgress workspaceSlug={workspaceSlug} projectId={projectId} sprintId={sprintDetails?.id} />
      )}
    </div>
  );
}
