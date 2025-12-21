import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { usePathname, useSearchParams } from "next/navigation";
// hooks
import { generateQueryParams } from "@plane/utils";
import { useEpic } from "@/hooks/store/use-epic";
import { useAppRouter } from "@/hooks/use-app-router";
// components
import { EpicAnalyticsSidebar } from "./";

type Props = {
  projectId: string;
  workspaceSlug: string;
  isArchived?: boolean;
};

export const EpicPeekOverview = observer(function EpicPeekOverview({
  projectId,
  workspaceSlug,
  isArchived = false,
}: Props) {
  // router
  const router = useAppRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const peekEpic = searchParams.get("peekEpic");
  // refs
  const ref = React.useRef(null);
  // store hooks
  const { fetchEpicDetails, fetchArchivedEpicDetails } = useEpic();

  const handleClose = () => {
    const query = generateQueryParams(searchParams, ["peekEpic"]);
    router.push(`${pathname}?${query}`);
  };

  useEffect(() => {
    if (!peekEpic) return;
    if (isArchived) fetchArchivedEpicDetails(workspaceSlug, projectId, peekEpic.toString());
    else fetchEpicDetails(workspaceSlug, projectId, peekEpic.toString());
  }, [fetchArchivedEpicDetails, fetchEpicDetails, isArchived, peekEpic, projectId, workspaceSlug]);

  return (
    <>
      {peekEpic && (
        <div
          ref={ref}
          className="flex h-full w-full max-w-[24rem] flex-shrink-0 flex-col gap-3.5 overflow-y-auto border-l border-subtle bg-surface-1 px-6 duration-300 absolute md:relative right-0 z-[9]"
          style={{
            boxShadow:
              "0px 1px 4px 0px rgba(0, 0, 0, 0.06), 0px 2px 4px 0px rgba(16, 24, 40, 0.06), 0px 1px 8px -1px rgba(16, 24, 40, 0.06)",
          }}
        >
          <EpicAnalyticsSidebar
            epicId={peekEpic?.toString() ?? ""}
            handleClose={handleClose}
            isArchived={isArchived}
          />
        </div>
      )}
    </>
  );
});
