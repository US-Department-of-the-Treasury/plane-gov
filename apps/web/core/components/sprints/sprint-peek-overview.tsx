import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { usePathname, useSearchParams } from "next/navigation";
// hooks
import { generateQueryParams } from "@plane/utils";
import { useSprint } from "@/hooks/store/use-sprint";
import { useAppRouter } from "@/hooks/use-app-router";
// components
import { SprintDetailsSidebar } from "./analytics-sidebar";

type Props = {
  projectId?: string;
  workspaceSlug: string;
  isArchived?: boolean;
};

export const SprintPeekOverview = observer(function SprintPeekOverview(props: Props) {
  const { projectId: propsProjectId, workspaceSlug, isArchived } = props;
  // router
  const router = useAppRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const peekSprint = searchParams.get("peekSprint");
  // refs
  const ref = React.useRef(null);
  // store hooks
  const { getSprintById, fetchSprintDetails, fetchArchivedSprintDetails } = useSprint();
  // derived values
  const sprintDetails = peekSprint ? getSprintById(peekSprint.toString()) : undefined;
  const projectId = propsProjectId || sprintDetails?.project_id;

  const handleClose = () => {
    const query = generateQueryParams(searchParams, ["peekSprint"]);
    router.push(`${pathname}?${query}`);
  };

  useEffect(() => {
    if (!peekSprint || !projectId) return;
    if (isArchived) fetchArchivedSprintDetails(workspaceSlug, projectId, peekSprint.toString());
    else fetchSprintDetails(workspaceSlug, projectId, peekSprint.toString());
  }, [fetchArchivedSprintDetails, fetchSprintDetails, isArchived, peekSprint, projectId, workspaceSlug]);

  return (
    <>
      {peekSprint && projectId && (
        <div
          ref={ref}
          className="flex h-full w-full max-w-[21.5rem] flex-shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-subtle bg-surface-1 px-4 duration-300 fixed md:relative right-0 z-[9]"
          style={{
            boxShadow:
              "0px 1px 4px 0px rgba(0, 0, 0, 0.06), 0px 2px 4px 0px rgba(16, 24, 40, 0.06), 0px 1px 8px -1px rgba(16, 24, 40, 0.06)",
          }}
        >
          <SprintDetailsSidebar
            handleClose={handleClose}
            isArchived={isArchived}
            projectId={projectId}
            workspaceSlug={workspaceSlug}
            sprintId={peekSprint}
          />
        </div>
      )}
    </>
  );
});
