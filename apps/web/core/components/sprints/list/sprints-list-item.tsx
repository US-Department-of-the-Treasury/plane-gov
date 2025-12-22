import type { MouseEvent } from "react";
import { useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
// plane imports
import type { TSprintGroups } from "@plane/types";
import { CircularProgressIndicator } from "@plane/ui";
// components
import { generateQueryParams, calculateSprintProgress } from "@plane/utils";
import { ListItem } from "@/components/core/list";
// hooks
import { useProjectSprints, getSprintById } from "@/store/queries/sprint";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local imports
import { SprintQuickActions } from "../quick-actions";
import { SprintListItemAction } from "./sprint-list-item-action";

type TSprintsListItem = {
  sprintId: string;
  handleEditSprint?: () => void;
  handleDeleteSprint?: () => void;
  handleAddToFavorites?: () => void;
  handleRemoveFromFavorites?: () => void;
  workspaceSlug: string;
  projectId: string;
  className?: string;
};

export function SprintsListItem(props: TSprintsListItem) {
  const { sprintId, workspaceSlug, projectId, className = "" } = props;
  // refs
  const parentRef = useRef<HTMLDivElement>(null);
  // router
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // hooks
  const { isMobile } = usePlatformOS();
  // query hooks
  const { data: sprints } = useProjectSprints(workspaceSlug, projectId);

  // derived values
  const sprintDetails = getSprintById(sprints, sprintId);

  if (!sprintDetails) return null;

  // computed
  // TODO: change this logic once backend fix the response
  const sprintStatus = sprintDetails.status ? (sprintDetails.status.toLocaleLowerCase() as TSprintGroups) : "draft";
  const isActive = sprintStatus === "current";

  // handlers
  const openSprintOverview = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const query = generateQueryParams(searchParams, ["peekSprint"]);
    if (searchParams.has("peekSprint") && searchParams.get("peekSprint") === sprintId) {
      router.push(`${pathname}?${query}`);
    } else {
      router.push(`${pathname}?${query && `${query}&`}peekSprint=${sprintId}`);
    }
  };

  // handlers
  const handleArchivedSprintClick = (e: MouseEvent<HTMLAnchorElement>) => {
    openSprintOverview(e);
  };

  const handleItemClick = sprintDetails.archived_at ? handleArchivedSprintClick : undefined;

  const progress = calculateSprintProgress(sprintDetails);

  return (
    <ListItem
      title={sprintDetails?.name ?? ""}
      itemLink={`/${workspaceSlug}/projects/${projectId}/sprints/${sprintDetails.id}`}
      onItemClick={handleItemClick}
      className={className}
      prependTitleElement={
        <CircularProgressIndicator size={30} percentage={progress} strokeWidth={3}>
          {progress === 100 ? (
            <Check className="h-3 w-3 stroke-2" />
          ) : (
            <span className="text-9 text-primary">{`${progress}%`}</span>
          )}
        </CircularProgressIndicator>
      }
      actionableItems={
        <SprintListItemAction
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          sprintId={sprintId}
          sprintDetails={sprintDetails}
          parentRef={parentRef}
          isActive={isActive}
        />
      }
      quickActionElement={
        <div className="block md:hidden">
          <SprintQuickActions
            parentRef={parentRef}
            sprintId={sprintId}
            projectId={projectId}
            workspaceSlug={workspaceSlug}
          />
        </div>
      }
      isMobile={isMobile}
      parentRef={parentRef}
      isSidebarOpen={searchParams.has("peekSprint")}
    />
  );
}
