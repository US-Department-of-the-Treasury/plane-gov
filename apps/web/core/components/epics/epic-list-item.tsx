import React, { useRef } from "react";
import { observer } from "mobx-react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
// icons
import { Check, Info } from "lucide-react";
// ui
import { CircularProgressIndicator } from "@plane/ui";
// components
import { generateQueryParams } from "@plane/utils";
import { ListItem } from "@/components/core/list";
import { EpicListItemAction, EpicQuickActions } from "@/components/epics";
// helpers
// hooks
import { useEpic } from "@/hooks/store/use-epic";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";

type Props = {
  epicId: string;
};

export const EpicListItem = observer(function EpicListItem(props: Props) {
  const { epicId } = props;
  // refs
  const parentRef = useRef(null);
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // store hooks
  const { getEpicById } = useEpic();
  const { isMobile } = usePlatformOS();

  // derived values
  const epicDetails = getEpicById(epicId);

  if (!epicDetails) return null;

  const completionPercentage =
    ((epicDetails.completed_issues + epicDetails.cancelled_issues) / epicDetails.total_issues) * 100;

  const progress = isNaN(completionPercentage) ? 0 : Math.floor(completionPercentage);

  const completedModuleCheck = epicDetails.status === "completed";

  // handlers
  const openModuleOverview = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const query = generateQueryParams(searchParams, ["peekModule"]);
    if (searchParams.has("peekModule") && searchParams.get("peekModule") === epicId) {
      router.push(`${pathname}?${query}`);
    } else {
      router.push(`${pathname}?${query && `${query}&`}peekModule=${epicId}`);
    }
  };

  const handleArchivedModuleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    openModuleOverview(e);
  };

  const handleItemClick = epicDetails.archived_at ? handleArchivedModuleClick : undefined;

  return (
    <ListItem
      title={epicDetails?.name ?? ""}
      itemLink={`/${workspaceSlug?.toString()}/projects/${epicDetails.project_id}/epics/${epicDetails.id}`}
      onItemClick={handleItemClick}
      prependTitleElement={
        <CircularProgressIndicator size={30} percentage={progress} strokeWidth={3}>
          {completedModuleCheck ? (
            progress === 100 ? (
              <Check className="h-3 w-3 stroke-[2] text-accent-primary" />
            ) : (
              <span className="text-13 text-accent-primary">{`!`}</span>
            )
          ) : progress === 100 ? (
            <Check className="h-3 w-3 stroke-[2] text-accent-primary" />
          ) : (
            <span className="text-9 text-tertiary">{`${progress}%`}</span>
          )}
        </CircularProgressIndicator>
      }
      appendTitleElement={
        <button
          onClick={openModuleOverview}
          className={`z-[5] flex-shrink-0 ${isMobile ? "flex" : "hidden group-hover:flex"}`}
        >
          <Info className="h-4 w-4 text-placeholder" />
        </button>
      }
      actionableItems={<EpicListItemAction epicId={epicId} epicDetails={epicDetails} parentRef={parentRef} />}
      quickActionElement={
        <div className="block md:hidden">
          <EpicQuickActions
            parentRef={parentRef}
            epicId={epicId}
            projectId={projectId.toString()}
            workspaceSlug={workspaceSlug.toString()}
          />
        </div>
      }
      isMobile={isMobile}
      parentRef={parentRef}
    />
  );
});
