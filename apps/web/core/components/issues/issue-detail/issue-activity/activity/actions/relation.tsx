// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
// Plane-web
import { getRelationActivityContent, useTimeLineRelationOptions } from "@/plane-web/components/relations";
import type { TIssueRelationTypes } from "@/plane-web/types";
// components
import { IssueActivityBlockComponent } from "./";

type TIssueRelationActivity = { activityId: string; ends: "top" | "bottom" | undefined };

export function IssueRelationActivity(props: TIssueRelationActivity) {
  const { activityId, ends } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);

  const activity = getActivityById(activityId);
  const ISSUE_RELATION_OPTIONS = useTimeLineRelationOptions();
  const activityContent = getRelationActivityContent(activity);

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={activity.field ? ISSUE_RELATION_OPTIONS[activity.field as TIssueRelationTypes]?.icon(14) : <></>}
      activityId={activityId}
      ends={ends}
    >
      {activityContent}
      {activity.old_value === "" ? (
        <span className="font-medium text-primary">{activity.new_value}.</span>
      ) : (
        <span className="font-medium text-primary">{activity.old_value}.</span>
      )}
    </IssueActivityBlockComponent>
  );
}
