import Link from "next/link";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// ui
import { EPIC_STATUS } from "@plane/constants";
import { EpicStatusIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
// components
import { SIDEBAR_WIDTH } from "@/components/gantt-chart/constants";
import { getBlockViewDetails } from "@/components/issues/issue-layouts/utils";
// constants
// hooks
import { useEpic } from "@/hooks/store/use-epic";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";

type Props = {
  epicId: string;
};

export const EpicGanttBlock = observer(function EpicGanttBlock(props: Props) {
  const { epicId } = props;
  // router
  const router = useAppRouter();
  const { workspaceSlug } = useParams();
  // store hooks
  const { getEpicById } = useEpic();
  // derived values
  const epicDetails = getEpicById(epicId);
  // hooks
  const { isMobile } = usePlatformOS();

  const { message, blockStyle } = getBlockViewDetails(
    epicDetails,
    EPIC_STATUS.find((s) => s.value === epicDetails?.status)?.color ?? ""
  );

  return (
    <Tooltip
      isMobile={isMobile}
      tooltipContent={
        <div className="space-y-1">
          <h5>{epicDetails?.name}</h5>
          <div>{message}</div>
        </div>
      }
      position="top-start"
    >
      <div
        className="relative flex h-full w-full cursor-pointer items-center rounded-sm"
        style={blockStyle}
        onClick={() =>
          router.push(
            `/${workspaceSlug?.toString()}/projects/${epicDetails?.project_id}/epics/${epicDetails?.id}`
          )
        }
      >
        <div className="absolute left-0 top-0 h-full w-full bg-surface-1/50" />
        <div
          className="sticky w-auto overflow-hidden truncate px-2.5 py-1 text-13 text-primary"
          style={{ left: `${SIDEBAR_WIDTH}px` }}
        >
          {epicDetails?.name}
        </div>
      </div>
    </Tooltip>
  );
});

export const EpicGanttSidebarBlock = observer(function EpicGanttSidebarBlock(props: Props) {
  const { epicId } = props;
  const { workspaceSlug } = useParams();
  // store hooks
  const { getEpicById } = useEpic();
  // derived values
  const epicDetails = getEpicById(epicId);

  return (
    <Link
      className="relative flex h-full w-full items-center gap-2"
      href={`/${workspaceSlug?.toString()}/projects/${epicDetails?.project_id}/epics/${epicDetails?.id}`}
      draggable={false}
    >
      <EpicStatusIcon status={epicDetails?.status ?? "backlog"} height="16px" width="16px" />
      <h6 className="flex-grow truncate text-13 font-medium">{epicDetails?.name}</h6>
    </Link>
  );
});
