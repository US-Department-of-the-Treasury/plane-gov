import { useState, useRef, forwardRef } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
// plane imports
import { useOutsideClickDetector } from "@plane/hooks";
import { Popover } from "@plane/propel/popover";
import type { TIssue } from "@plane/types";
import { ControlLink } from "@plane/ui";
import { cn, generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useIssues } from "@/hooks/store/use-issues";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// queries
import { useProjects, getProjectById } from "@/store/queries/project";
import { useProjectStates, getStateById } from "@/store/queries/state";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
// local components
import { WorkItemPreviewCard } from "../../preview-card";
import type { TRenderQuickActions } from "../list/list-view-types";
import type { CalendarStoreType } from "./base-calendar-root";

type Props = {
  issue: TIssue;
  quickActions: TRenderQuickActions;
  isDragging?: boolean;
  isEpic?: boolean;
};

export const CalendarIssueBlock = observer(
  forwardRef(function CalendarIssueBlock(props: Props, ref: React.ForwardedRef<HTMLAnchorElement>) {
    const { issue, quickActions, isDragging = false, isEpic = false } = props;
    // states
    const [isMenuActive, setIsMenuActive] = useState(false);
    // refs
    const blockRef = useRef(null);
    const menuActionRef = useRef<HTMLDivElement | null>(null);
    // hooks
    const { workspaceSlug } = useParams();
    const { getIsIssuePeeked } = useIssueDetail();
    const { handleRedirection } = useIssuePeekOverviewRedirection(isEpic);
    const { isMobile } = usePlatformOS();
    const storeType = useIssueStoreType() as CalendarStoreType;
    const { issuesFilter } = useIssues(storeType);

    // queries
    const { data: projects } = useProjects(workspaceSlug?.toString());
    const { data: projectStates } = useProjectStates(workspaceSlug?.toString(), issue?.project_id);

    // derived values
    const stateDetails = projectStates && issue?.state_id
      ? getStateById(projectStates, issue.state_id)
      : undefined;
    const stateColor = stateDetails?.color || "";
    const projectDetails = getProjectById(projects, issue?.project_id);
    const projectIdentifier = projectDetails?.identifier;

    // handlers
    const handleIssuePeekOverview = (issue: TIssue) => handleRedirection(workspaceSlug.toString(), issue, isMobile);

    useOutsideClickDetector(menuActionRef, () => setIsMenuActive(false));

    const customActionButton = (
      <div
        ref={menuActionRef}
        className={`w-full cursor-pointer rounded-sm p-1 text-placeholder hover:bg-layer-1 ${
          isMenuActive ? "bg-layer-1-active text-primary" : "text-secondary"
        }`}
        onClick={() => setIsMenuActive(!isMenuActive)}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </div>
    );

    const isMenuActionRefAboveScreenBottom =
      menuActionRef?.current && menuActionRef?.current?.getBoundingClientRect().bottom < window.innerHeight - 220;

    const placement = isMenuActionRefAboveScreenBottom ? "bottom-end" : "top-end";

    const workItemLink = generateWorkItemLink({
      workspaceSlug: workspaceSlug?.toString(),
      projectId: issue?.project_id,
      issueId: issue?.id,
      projectIdentifier,
      sequenceId: issue?.sequence_id,
      isEpic,
      isArchived: !!issue?.archived_at,
    });

    return (
      <Popover delay={100} openOnHover>
        <Popover.Button
          className="w-full"
          render={
            <ControlLink
              id={`issue-${issue.id}`}
              href={workItemLink}
              onClick={() => handleIssuePeekOverview(issue)}
              className="block w-full text-13 text-primary rounded-sm border-b md:border-[1px] border-subtle hover:border-subtle-1"
              disabled={!!issue?.tempId || isMobile}
              ref={ref}
            >
              <>
                {issue?.tempId !== undefined && (
                  <div className="absolute left-0 top-0 z-[99999] h-full w-full animate-pulse bg-surface-1/20" />
                )}

                <div
                  ref={blockRef}
                  className={cn(
                    "group/calendar-block flex h-10 md:h-8 w-full items-center justify-between gap-1.5 rounded-sm  md:px-1 px-4 py-1.5 ",
                    {
                      "bg-surface-2 shadow-raised-200 border-accent-strong": isDragging,
                      "bg-surface-1 hover:bg-surface-2": !isDragging,
                      "border border-accent-strong hover:border-accent-strong": getIsIssuePeeked(issue.id),
                    }
                  )}
                >
                  <div className="flex h-full items-center gap-1.5 truncate">
                    <span
                      className="h-full w-0.5 flex-shrink-0 rounded-sm"
                      style={{
                        backgroundColor: stateColor,
                      }}
                    />
                    {issue.project_id && (
                      <IssueIdentifier
                        issueId={issue.id}
                        projectId={issue.project_id}
                        size="xs"
                        variant="tertiary"
                        displayProperties={issuesFilter?.issueFilters?.displayProperties}
                      />
                    )}
                    <div className="truncate text-13 font-medium md:font-regular md:text-11">{issue.name}</div>
                  </div>
                  <div
                    className={cn("flex-shrink-0 size-5", {
                      "hidden group-hover/calendar-block:block": !isMobile,
                      block: isMenuActive,
                    })}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {quickActions({
                      issue,
                      parentRef: blockRef,
                      customActionButton,
                      placement,
                    })}
                  </div>
                </div>
              </>
            </ControlLink>
          }
        />
        <Popover.Panel side="bottom" align="start">
          <>
            {issue.project_id && (
              <WorkItemPreviewCard
                projectId={issue.project_id}
                stateDetails={{
                  id: issue.state_id ?? undefined,
                }}
                workItem={issue}
              />
            )}
          </>
        </Popover.Panel>
      </Popover>
    );
  })
);

CalendarIssueBlock.displayName = "CalendarIssueBlock";
