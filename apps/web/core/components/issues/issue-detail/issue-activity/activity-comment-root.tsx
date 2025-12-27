import { useMemo } from "react";
import orderBy from "lodash-es/orderBy";
// plane imports
import type { E_SORT_ORDER, TActivityFilters } from "@plane/constants";
import { EActivityFilterType, filterActivityOnSelectedFilters } from "@plane/constants";
import type { TCommentsOperations, TIssueActivityComment } from "@plane/types";
// components
import { CommentCard } from "@/components/comments/card/root";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
import { useIssueCommentStore } from "@/store/issue/issue-details/comment.store";
// plane web components
import { IssueAdditionalPropertiesActivity } from "@/plane-web/components/issues/issue-details/issue-properties-activity";
import { IssueActivityWorklog } from "@/plane-web/components/issues/worklog/activity/root";
// local imports
import { IssueActivityItem } from "./activity/activity-list";
import { IssueActivityLoader } from "./loader";

type TIssueActivityCommentRoot = {
  workspaceSlug: string;
  projectId: string;
  isIntakeIssue: boolean;
  issueId: string;
  selectedFilters: TActivityFilters[];
  activityOperations: TCommentsOperations;
  showAccessSpecifier?: boolean;
  disabled?: boolean;
  sortOrder: E_SORT_ORDER;
};

export function IssueActivityCommentRoot(props: TIssueActivityCommentRoot) {
  const {
    workspaceSlug,
    isIntakeIssue,
    issueId,
    selectedFilters,
    activityOperations,
    showAccessSpecifier,
    projectId,
    disabled,
    sortOrder,
  } = props;
  // store hooks - use Zustand directly
  const getActivitiesByIssueId = useIssueActivityStore((s) => s.getActivitiesByIssueId);
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);
  const getCommentsByIssueId = useIssueCommentStore((s) => s.getCommentsByIssueId);
  const getCommentById = useIssueCommentStore((s) => s.getCommentById);

  // derived values - merge activities and comments
  const activityAndComments = useMemo(() => {
    if (!issueId) return undefined;

    const activityComments: TIssueActivityComment[] = [];
    const activities = getActivitiesByIssueId(issueId);
    const comments = getCommentsByIssueId(issueId);

    if (!activities || !comments) return undefined;

    activities.forEach((activityId) => {
      const activity = getActivityById(activityId);
      if (!activity) return;
      const type =
        activity.field === "state"
          ? EActivityFilterType.STATE
          : activity.field === "assignees"
            ? EActivityFilterType.ASSIGNEE
            : activity.field === null
              ? EActivityFilterType.DEFAULT
              : EActivityFilterType.ACTIVITY;
      activityComments.push({
        id: activity.id,
        activity_type: type,
        created_at: activity.created_at,
      });
    });

    comments.forEach((commentId) => {
      const comment = getCommentById(commentId);
      if (!comment) return;
      activityComments.push({
        id: comment.id,
        activity_type: EActivityFilterType.COMMENT,
        created_at: comment.created_at,
      });
    });

    return orderBy(activityComments, (e) => new Date(e.created_at || 0), sortOrder);
  }, [issueId, sortOrder, getActivitiesByIssueId, getActivityById, getCommentsByIssueId, getCommentById]);

  if (!activityAndComments) return <IssueActivityLoader />;

  if (activityAndComments.length <= 0) return null;

  const filteredActivityAndComments = filterActivityOnSelectedFilters(activityAndComments, selectedFilters);

  const BASE_ACTIVITY_FILTER_TYPES = [
    EActivityFilterType.ACTIVITY,
    EActivityFilterType.STATE,
    EActivityFilterType.ASSIGNEE,
    EActivityFilterType.DEFAULT,
  ];

  return (
    <div>
      {filteredActivityAndComments.map((activityComment, index) => {
        const comment = getCommentById(activityComment.id);
        return activityComment.activity_type === "COMMENT" ? (
          <CommentCard
            key={activityComment.id}
            workspaceSlug={workspaceSlug}
            entityId={issueId}
            comment={comment}
            activityOperations={activityOperations}
            ends={index === 0 ? "top" : index === filteredActivityAndComments.length - 1 ? "bottom" : undefined}
            showAccessSpecifier={!!showAccessSpecifier}
            showCopyLinkOption={!isIntakeIssue}
            disabled={disabled}
            projectId={projectId}
            enableReplies
          />
        ) : BASE_ACTIVITY_FILTER_TYPES.includes(activityComment.activity_type as EActivityFilterType) ? (
          <IssueActivityItem
            key={activityComment.id}
            activityId={activityComment.id}
            ends={index === 0 ? "top" : index === filteredActivityAndComments.length - 1 ? "bottom" : undefined}
          />
        ) : activityComment.activity_type === "ISSUE_ADDITIONAL_PROPERTIES_ACTIVITY" ? (
          <IssueAdditionalPropertiesActivity
            key={activityComment.id}
            activityId={activityComment.id}
            ends={index === 0 ? "top" : index === filteredActivityAndComments.length - 1 ? "bottom" : undefined}
          />
        ) : activityComment.activity_type === "WORKLOG" ? (
          <IssueActivityWorklog
            key={activityComment.id}
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            issueId={issueId}
            activityComment={activityComment}
            ends={index === 0 ? "top" : index === filteredActivityAndComments.length - 1 ? "bottom" : undefined}
          />
        ) : (
          <></>
        );
      })}
    </div>
  );
}
