import type { FC, MutableRefObject } from "react";
import React, { useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachInstruction, extractInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { useParams } from "next/navigation";
// plane helpers
import { useOutsideClickDetector } from "@plane/hooks";
// types
import type { IIssueDisplayProperties, TIssue, TIssueMap } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// components
import { DropIndicator } from "@plane/ui";
import RenderIfVisible from "@/components/core/render-if-visible-HOC";
import { ListLoaderItemRow } from "@/components/ui/loader/layouts/list-layout-loader";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import type { TSelectionHelper } from "@/hooks/use-multiple-select";
import { usePlatformOS } from "@/hooks/use-platform-os";
// queries
import { useIssue } from "@/store/queries/issue";
// types
import { HIGHLIGHT_CLASS, getIssueBlockId, isIssueNew } from "../utils";
import { IssueBlock } from "./block";
import type { TRenderQuickActions } from "./list-view-types";

type Props = {
  issueId: string;
  updateIssue: ((projectId: string | null, issueId: string, data: Partial<TIssue>) => Promise<void>) | undefined;
  quickActions: TRenderQuickActions;
  canEditProperties: (projectId: string | undefined) => boolean;
  displayProperties: IIssueDisplayProperties | undefined;
  nestingLevel: number;
  spacingLeft?: number;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  selectionHelpers: TSelectionHelper;
  groupId: string;
  isDragAllowed: boolean;
  canDropOverIssue: boolean;
  isParentIssueBeingDragged?: boolean;
  isLastChild?: boolean;
  shouldRenderByDefault?: boolean;
  isEpic?: boolean;
};

export function IssueBlockRoot(props: Props) {
  const {
    issueId,
    groupId,
    updateIssue,
    quickActions,
    canEditProperties,
    displayProperties,
    nestingLevel,
    spacingLeft = 14,
    containerRef,
    isDragAllowed,
    canDropOverIssue,
    isParentIssueBeingDragged = false,
    isLastChild = false,
    selectionHelpers,
    shouldRenderByDefault,
    isEpic = false,
  } = props;
  // states
  const [isExpanded, setExpanded] = useState<boolean>(false);
  const [instruction, setInstruction] = useState<"DRAG_OVER" | "DRAG_BELOW" | undefined>(undefined);
  const [isCurrentBlockDragging, setIsCurrentBlockDragging] = useState(false);
  // ref
  const issueBlockRef = useRef<HTMLDivElement | null>(null);
  // router
  const { workspaceSlug, projectId } = useParams();
  // hooks
  const { isMobile } = usePlatformOS();
  // store hooks
  const {
    issue: { getIssueById },
    subIssues: subIssuesStore,
  } = useIssueDetail(isEpic ? EIssueServiceType.EPICS : EIssueServiceType.ISSUES);

  // Try to get from MobX cache first, fallback to TanStack Query
  const cachedIssue = getIssueById(issueId);
  const { data: queriedIssue } = useIssue(
    workspaceSlug?.toString() || "",
    projectId?.toString() || cachedIssue?.project_id || "",
    issueId
  );

  const issue = cachedIssue || queriedIssue;

  const isSubIssue = nestingLevel !== 0;

  useEffect(() => {
    const blockElement = issueBlockRef.current;

    if (!blockElement) return;

    return combine(
      dropTargetForElements({
        element: blockElement,
        canDrop: ({ source }) => source?.data?.id !== issueId && !isSubIssue && canDropOverIssue,
        getData: ({ input, element }) => {
          const data = { id: issueId, type: "ISSUE" };

          // attach instruction for last in list
          return attachInstruction(data, {
            input,
            element,
            currentLevel: 0,
            indentPerLevel: 0,
            mode: isLastChild ? "last-in-group" : "standard",
          });
        },
        onDrag: ({ self }) => {
          const extractedInstruction = extractInstruction(self?.data)?.type;
          // check if the highlight is to be shown above or below
          setInstruction(
            extractedInstruction
              ? extractedInstruction === "reorder-below" && isLastChild
                ? "DRAG_BELOW"
                : "DRAG_OVER"
              : undefined
          );
        },
        onDragLeave: () => {
          setInstruction(undefined);
        },
        onDrop: () => {
          setInstruction(undefined);
        },
      })
    );
  }, [issueId, isLastChild, issueBlockRef, isSubIssue, canDropOverIssue, setInstruction]);

  useOutsideClickDetector(issueBlockRef, () => {
    issueBlockRef?.current?.classList?.remove(HIGHLIGHT_CLASS);
  });

  if (!issue || !issue.created_at) return null;

  const subIssues = subIssuesStore.subIssuesByIssueId(issueId);
  return (
    <div className="relative" ref={issueBlockRef} id={getIssueBlockId(issueId, groupId)}>
      <DropIndicator classNames={"absolute top-0 z-[2]"} isVisible={instruction === "DRAG_OVER"} />
      <RenderIfVisible
        key={`${issueId}`}
        root={containerRef}
        classNames={`relative ${isLastChild && !isExpanded ? "" : "border-b border-b-subtle"}`}
        verticalOffset={100}
        defaultValue={shouldRenderByDefault || isIssueNew(issue)}
        placeholderChildren={<ListLoaderItemRow shouldAnimate={false} renderForPlaceHolder defaultPropertyCount={4} />}
        shouldRecordHeights={isMobile}
      >
        <IssueBlock
          issue={issue}
          groupId={groupId}
          updateIssue={updateIssue}
          quickActions={quickActions}
          canEditProperties={canEditProperties}
          displayProperties={displayProperties}
          isExpanded={isExpanded}
          setExpanded={setExpanded}
          nestingLevel={nestingLevel}
          spacingLeft={spacingLeft}
          selectionHelpers={selectionHelpers}
          canDrag={!isSubIssue && isDragAllowed}
          isCurrentBlockDragging={isParentIssueBeingDragged || isCurrentBlockDragging}
          setIsCurrentBlockDragging={setIsCurrentBlockDragging}
          isEpic={isEpic}
        />
      </RenderIfVisible>

      {isExpanded &&
        !isEpic &&
        subIssues?.map((subIssueId) => (
          <IssueBlockRoot
            key={`${subIssueId}`}
            issueId={subIssueId}
            updateIssue={updateIssue}
            quickActions={quickActions}
            canEditProperties={canEditProperties}
            displayProperties={displayProperties}
            nestingLevel={nestingLevel + 1}
            spacingLeft={spacingLeft + 12}
            containerRef={containerRef}
            selectionHelpers={selectionHelpers}
            groupId={groupId}
            isDragAllowed={isDragAllowed}
            canDropOverIssue={canDropOverIssue}
            isParentIssueBeingDragged={isParentIssueBeingDragged || isCurrentBlockDragging}
            shouldRenderByDefault={isExpanded}
          />
        ))}
      {isLastChild && <DropIndicator classNames={"absolute z-[2]"} isVisible={instruction === "DRAG_BELOW"} />}
    </div>
  );
}
