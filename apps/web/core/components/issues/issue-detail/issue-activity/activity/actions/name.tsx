import { Type } from "lucide-react";
// stores
import { useIssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
// components
import { IssueActivityBlockComponent } from "./";

type TIssueNameActivity = { activityId: string; ends: "top" | "bottom" | undefined };

export function IssueNameActivity(props: TIssueNameActivity) {
  const { activityId, ends } = props;
  // store hooks - use Zustand directly
  const getActivityById = useIssueActivityStore((s) => s.getActivityById);

  const activity = getActivityById(activityId);

  if (!activity) return <></>;
  return (
    <IssueActivityBlockComponent
      icon={<Type size={14} className="text-secondary" aria-hidden="true" />}
      activityId={activityId}
      ends={ends}
    >
      <>set the name to {activity.new_value}.</>
    </IssueActivityBlockComponent>
  );
}
