import { RotateCcw } from "lucide-react";
import { ArchiveIcon } from "@plane/propel/icons";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
// components
import { IssueActivityBlockComponent } from "./";

type TIssueArchivedAtActivity = { activityId: string; ends: "top" | "bottom" | undefined };

export function IssueArchivedAtActivity(props: TIssueArchivedAtActivity) {
  const { activityId, ends } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);

  const activity = getActivityById(activityId);

  if (!activity) return <></>;

  return (
    <IssueActivityBlockComponent
      icon={
        activity.new_value === "restore" ? (
          <RotateCcw className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        ) : (
          <ArchiveIcon className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        )
      }
      activityId={activityId}
      ends={ends}
      customUserName={activity.new_value === "archive" ? "Plane" : undefined}
    >
      {activity.new_value === "restore" ? "restored the work item" : "archived the work item"}.
    </IssueActivityBlockComponent>
  );
}
