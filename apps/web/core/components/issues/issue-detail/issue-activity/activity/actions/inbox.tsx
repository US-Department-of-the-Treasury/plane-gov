import { IntakeIcon } from "@plane/propel/icons";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
// components
import { IssueActivityBlockComponent } from "./";

type TIssueInboxActivity = { activityId: string; ends: "top" | "bottom" | undefined };

export function IssueInboxActivity(props: TIssueInboxActivity) {
  const { activityId, ends } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);

  const activity = getActivityById(activityId);

  const getInboxActivityMessage = () => {
    switch (activity?.verb) {
      case "-1":
        return "declined this work item from intake.";
      case "0":
        return "snoozed this work item.";
      case "1":
        return "accepted this work item from intake.";
      case "2":
        return "declined this work item from intake by marking a duplicate work item.";
      default:
        return "updated intake work item status.";
    }
  };

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={<IntakeIcon className="h-4 w-4 flex-shrink-0 text-secondary" />}
      activityId={activityId}
      ends={ends}
    >
      <>{getInboxActivityMessage()}</>
    </IssueActivityBlockComponent>
  );
}
