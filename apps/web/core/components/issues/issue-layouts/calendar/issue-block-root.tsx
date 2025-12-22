import React, { useEffect, useRef, useState } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useParams } from "next/navigation";
// plane helpers
import { useOutsideClickDetector } from "@plane/hooks";
// components
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
// queries
import { useIssue } from "@/store/queries/issue";
import type { TRenderQuickActions } from "../list/list-view-types";
import { HIGHLIGHT_CLASS } from "../utils";
import { CalendarIssueBlock } from "./issue-block";
// types

type Props = {
  issueId: string;
  quickActions: TRenderQuickActions;
  isDragDisabled: boolean;
  isEpic?: boolean;
  canEditProperties: (projectId: string | undefined) => boolean;
};

export function CalendarIssueBlockRoot(props: Props) {
  const { issueId, quickActions, isDragDisabled, isEpic = false, canEditProperties } = props;

  const issueRef = useRef<HTMLAnchorElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // router
  const { workspaceSlug, projectId } = useParams();

  // For UI state only (peek overview)
  const {
    issue: { getIssueById },
  } = useIssueDetail();

  // Try to get from MobX cache first, fallback to TanStack Query
  const cachedIssue = getIssueById(issueId);
  const { data: queriedIssue } = useIssue(
    workspaceSlug?.toString() || "",
    projectId?.toString() || cachedIssue?.project_id || "",
    issueId
  );

  const issue = cachedIssue || queriedIssue;

  const canDrag = !isDragDisabled && canEditProperties(issue?.project_id ?? undefined);

  useEffect(() => {
    const element = issueRef.current;

    if (!element) return;

    return combine(
      draggable({
        element,
        canDrag: () => canDrag,
        getInitialData: () => ({ id: issue?.id, date: issue?.target_date }),
        onDragStart: () => {
          setIsDragging(true);
        },
        onDrop: () => {
          setIsDragging(false);
        },
      })
    );
  }, [issueRef?.current, issue, canDrag]);

  useOutsideClickDetector(issueRef, () => {
    issueRef?.current?.classList?.remove(HIGHLIGHT_CLASS);
  });

  if (!issue) return null;

  return (
    <CalendarIssueBlock
      isDragging={isDragging}
      issue={issue}
      quickActions={quickActions}
      ref={issueRef}
      isEpic={isEpic}
    />
  );
}
