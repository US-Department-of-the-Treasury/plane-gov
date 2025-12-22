import React, { useRef } from "react";
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
import { useEpicDetails } from "@/store/queries/epic";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";

type Props = {
  epicId: string;
};

export function EpicListItem(props: Props) {
  const { epicId } = props;
  // refs
  const parentRef = useRef<HTMLDivElement>(null);
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // hooks
  const { isMobile } = usePlatformOS();
  const { data: epicDetails } = useEpicDetails(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "", epicId);

  if (!epicDetails) return null;

  const completionPercentage =
    ((epicDetails.completed_issues + epicDetails.cancelled_issues) / epicDetails.total_issues) * 100;

  const progress = isNaN(completionPercentage) ? 0 : Math.floor(completionPercentage);

  const completedEpicCheck = epicDetails.status === "completed";

  // handlers
  const openEpicOverview = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const query = generateQueryParams(searchParams, ["peekEpic"]);
    if (searchParams.has("peekEpic") && searchParams.get("peekEpic") === epicId) {
      router.push(`${pathname}?${query}`);
    } else {
      router.push(`${pathname}?${query && `${query}&`}peekEpic=${epicId}`);
    }
  };

  const handleArchivedEpicClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    openEpicOverview(e);
  };

  const handleItemClick = epicDetails.archived_at ? handleArchivedEpicClick : undefined;

  return (
    <ListItem
      title={epicDetails?.name ?? ""}
      itemLink={`/${workspaceSlug?.toString()}/projects/${epicDetails.project_id}/epics/${epicDetails.id}`}
      onItemClick={handleItemClick}
      prependTitleElement={
        <CircularProgressIndicator size={30} percentage={progress} strokeWidth={3}>
          {completedEpicCheck ? (
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
          onClick={openEpicOverview}
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
}
