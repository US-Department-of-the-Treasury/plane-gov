import { Tooltip } from "@plane/propel/tooltip";
import { generateWorkItemLink } from "@plane/utils";
// hooks
import { usePlatformOS } from "@/hooks/use-platform-os";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";

type TIssueLink = {
  activityId: string;
};

export function IssueLink(props: TIssueLink) {
  const { activityId } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);
  const { isMobile } = usePlatformOS();
  const activity = getActivityById(activityId);

  if (!activity) return <></>;

  const workItemLink = generateWorkItemLink({
    workspaceSlug: activity.workspace_detail?.slug,
    projectId: activity.project,
    issueId: activity.issue,
    projectIdentifier: activity.project_detail.identifier,
    sequenceId: activity.issue_detail.sequence_id,
  });
  return (
    <Tooltip
      tooltipContent={activity.issue_detail ? activity.issue_detail.name : "This work item has been deleted"}
      isMobile={isMobile}
    >
      <a
        aria-disabled={activity.issue === null}
        href={`${activity.issue_detail ? workItemLink : "#"}`}
        target={activity.issue === null ? "_self" : "_blank"}
        rel={activity.issue === null ? "" : "noopener noreferrer"}
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        {activity.issue_detail
          ? `${activity.project_detail.identifier}-${activity.issue_detail.sequence_id}`
          : "Work items"}{" "}
        <span className="font-regular">{activity.issue_detail?.name}</span>
      </a>
    </Tooltip>
  );
}
