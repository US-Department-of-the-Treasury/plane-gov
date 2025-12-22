import React, { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
// hooks
import { generateQueryParams } from "@plane/utils";
import { useSprintDetails } from "@/store/queries/sprint";
import { useAppRouter } from "@/hooks/use-app-router";
// components
import { SprintDetailsSidebar } from "./analytics-sidebar";

type Props = {
  projectId?: string;
  workspaceSlug: string;
  isArchived?: boolean;
};

export function SprintPeekOverview(props: Props) {
  const { projectId: propsProjectId, workspaceSlug, isArchived } = props;
  // router
  const router = useAppRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const peekSprint = searchParams.get("peekSprint");
  // refs
  const ref = React.useRef(null);

  // Fetch sprint details using TanStack Query
  // Note: The hook will be disabled if projectId or peekSprint is not available
  const { data: sprintDetails } = useSprintDetails(workspaceSlug, propsProjectId ?? "", peekSprint?.toString() ?? "");

  // Use projectId from props (sprints are workspace-wide, projectId comes from route context)
  const projectId = propsProjectId;

  const handleClose = () => {
    const query = generateQueryParams(searchParams, ["peekSprint"]);
    router.push(`${pathname}?${query}`);
  };

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
}
